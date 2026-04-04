import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

// Simple XOR-based obfuscation for tokens stored in DB
// (Base44 DB is already secured, this is an extra layer)
const CIPHER_KEY = Deno.env.get("BASE44_APP_ID") || "alterex-key";

function encryptToken(token) {
  if (!token) return null;
  const keyBytes = new TextEncoder().encode(CIPHER_KEY);
  const tokenBytes = new TextEncoder().encode(token);
  const encrypted = tokenBytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]);
  return btoa(String.fromCharCode(...encrypted));
}

function decryptToken(encrypted) {
  if (!encrypted) return null;
  const keyBytes = new TextEncoder().encode(CIPHER_KEY);
  const bytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const decrypted = bytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]);
  return new TextDecoder().decode(decrypted);
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  if (!res.ok) throw new Error("Failed to refresh token");
  return await res.json();
}

async function getValidAccessToken(connection, base44) {
  const expiry = connection.token_expiry ? new Date(connection.token_expiry) : null;
  const isExpired = !expiry || expiry <= new Date(Date.now() + 60000);
  
  if (isExpired) {
    const refreshToken = decryptToken(connection.refresh_token_encrypted);
    if (!refreshToken) throw new Error("No refresh token available. Please reconnect.");
    
    const refreshed = await refreshAccessToken(refreshToken);
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    
    await base44.asServiceRole.entities.GoogleClassroomConnection.update(connection.id, {
      access_token_encrypted: encryptToken(refreshed.access_token),
      token_expiry: newExpiry
    });
    
    return refreshed.access_token;
  }
  
  return decryptToken(connection.access_token_encrypted);
}

async function fetchClassroomCourses(accessToken) {
  const res = await fetch("https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (res.status === 401) throw new Error("Google access revoked. Please reconnect.");
  if (!res.ok) throw new Error(`Classroom API error: ${res.status}`);
  const data = await res.json();
  return data.courses || [];
}

async function fetchCourseWork(accessToken, courseId) {
  const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.courseWork || [];
}

function parseDueDate(dueDate, dueTime) {
  if (!dueDate) return { date: null, time: null };
  const { year, month, day } = dueDate;
  const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  let timeStr = null;
  if (dueTime?.hours !== undefined) {
    const h = String(dueTime.hours || 0).padStart(2, '0');
    const m = String(dueTime.minutes || 0).padStart(2, '0');
    timeStr = `${h}:${m}`;
  }
  return { date: dateStr, time: timeStr };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  // ─── START AUTH ───
  if (action === "start_auth") {
    const REDIRECT_URI = "https://alterexai.com/OauthGoogle";
    const { class_folder_id } = body;
    const scopes = [
      "https://www.googleapis.com/auth/classroom.courses.readonly",
      "https://www.googleapis.com/auth/classroom.coursework.students.readonly"
    ].join(" ");
    // Encode class_folder_id in state so OauthGoogle can pass it back
    const stateVal = class_folder_id ? `${class_folder_id}` : "global";
    const params = new URLSearchParams({
      client_id: "150423392562-8np4fnug0m3ra1gg0sl0auhv0rjf89mm.apps.googleusercontent.com",
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
      state: stateVal
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return Response.json({ authUrl });
  }

  // ─── CHECK GLOBAL CONNECTION (any connected course) ───
  if (action === "check_global_connection") {
    const connections = await base44.asServiceRole.entities.GoogleClassroomConnection.filter({
      created_by: user.email,
      sync_active: true
    });
    // Consider connected if there's any active connection with tokens
    const connected = connections.some(c => c.access_token_encrypted);
    return Response.json({ connected });
  }

  // ─── EXCHANGE CODE FOR TOKENS ───
  if (action === "exchange_code") {
    const redirect_uri = "https://alterexai.com/OauthGoogle";
    const { code, class_folder_id } = body;
    // class_folder_id may be null for global connection
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri,
        grant_type: "authorization_code"
      })
    });
    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: "Token exchange failed", details: err }, { status: 400 });
    }
    const tokens = await res.json();
    const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // For global connect: store a single "global" connection (class_folder_id = "global")
    // For class-specific: store per class
    const folderKey = class_folder_id || "global";

    // Remove any existing connection for this folder key
    const existing = await base44.asServiceRole.entities.GoogleClassroomConnection.filter({ class_folder_id: folderKey, created_by: user.email });
    for (const c of existing) {
      await base44.asServiceRole.entities.GoogleClassroomConnection.delete(c.id);
    }

    // Store encrypted tokens
    const connection = await base44.asServiceRole.entities.GoogleClassroomConnection.create({
      class_folder_id: folderKey,
      access_token_encrypted: encryptToken(tokens.access_token),
      refresh_token_encrypted: encryptToken(tokens.refresh_token),
      token_expiry: expiry,
      sync_active: true
    });

    // Fetch courses
    const courses = await fetchClassroomCourses(tokens.access_token);
    return Response.json({ connection_id: connection.id, courses, is_global: folderKey === "global" });
  }

  // ─── SELECT COURSE ───
  if (action === "select_course") {
    const { connection_id, google_course_id, google_course_name, class_folder_id } = body;
    const connections = await base44.asServiceRole.entities.GoogleClassroomConnection.filter({ id: connection_id });
    const connection = connections[0];
    if (!connection) return Response.json({ error: "Connection not found" }, { status: 404 });

    await base44.asServiceRole.entities.GoogleClassroomConnection.update(connection_id, {
      google_course_id,
      google_course_name
    });

    // Do initial import
    const accessToken = await getValidAccessToken(connection, base44);
    const courseWork = await fetchCourseWork(accessToken, google_course_id);

    let imported = 0;
    for (const work of courseWork) {
      const { date, time } = parseDueDate(work.dueDate, work.dueTime);
      await base44.asServiceRole.entities.SyncedAssignment.create({
        class_folder_id,
        google_assignment_id: work.id,
        google_course_id,
        title: work.title,
        description: work.description || "",
        due_date: date,
        due_time: time,
        source: "google_classroom",
        status: "not_started",
        archived: false,
        sync_active: true
      });
      imported++;
    }

    await base44.asServiceRole.entities.GoogleClassroomConnection.update(connection_id, {
      last_synced_at: new Date().toISOString()
    });

    return Response.json({ success: true, imported });
  }

  // ─── SYNC ───
  if (action === "sync") {
    const { class_folder_id } = body;
    const connections = await base44.asServiceRole.entities.GoogleClassroomConnection.filter({
      class_folder_id,
      created_by: user.email,
      sync_active: true
    });
    const connection = connections[0];
    if (!connection || !connection.google_course_id) {
      return Response.json({ error: "No active connection found" }, { status: 404 });
    }

    const accessToken = await getValidAccessToken(connection, base44);
    const courseWork = await fetchCourseWork(accessToken, connection.google_course_id);

    const existing = await base44.asServiceRole.entities.SyncedAssignment.filter({
      class_folder_id,
      google_course_id: connection.google_course_id,
      created_by: user.email
    });
    const existingMap = {};
    for (const a of existing) existingMap[a.google_assignment_id] = a;

    const remoteIds = new Set(courseWork.map(w => w.id));
    let created = 0, updated = 0, archived = 0;

    for (const work of courseWork) {
      const { date, time } = parseDueDate(work.dueDate, work.dueTime);
      if (existingMap[work.id]) {
        const a = existingMap[work.id];
        if (a.title !== work.title || a.due_date !== date) {
          await base44.asServiceRole.entities.SyncedAssignment.update(a.id, {
            title: work.title,
            description: work.description || "",
            due_date: date,
            due_time: time
          });
          updated++;
        }
      } else {
        await base44.asServiceRole.entities.SyncedAssignment.create({
          class_folder_id,
          google_assignment_id: work.id,
          google_course_id: connection.google_course_id,
          title: work.title,
          description: work.description || "",
          due_date: date,
          due_time: time,
          source: "google_classroom",
          status: "not_started",
          archived: false,
          sync_active: true
        });
        created++;
      }
    }

    // Archive deleted assignments
    for (const a of existing) {
      if (!remoteIds.has(a.google_assignment_id) && !a.archived) {
        await base44.asServiceRole.entities.SyncedAssignment.update(a.id, { archived: true });
        archived++;
      }
    }

    await base44.asServiceRole.entities.GoogleClassroomConnection.update(connection.id, {
      last_synced_at: new Date().toISOString()
    });

    return Response.json({ success: true, created, updated, archived });
  }

  // ─── SYNC CLASS (import assignments into a specific class from any connected account) ───
  if (action === "sync_class") {
    const { class_folder_id, google_course_id, google_course_name } = body;

    // Find a connection that has the course selected (class-specific or global)
    let connections = await base44.asServiceRole.entities.GoogleClassroomConnection.filter({
      created_by: user.email,
      sync_active: true
    });

    // Priority: class-specific connection, then global connection
    let connection = connections.find(c => c.class_folder_id === class_folder_id && c.google_course_id);
    if (!connection) connection = connections.find(c => c.class_folder_id === "global" && c.google_course_id);
    if (!connection) connection = connections.find(c => c.google_course_id);
    if (!connection) return Response.json({ error: "No connected Google Classroom account. Please connect first." }, { status: 400 });

    const accessToken = await getValidAccessToken(connection, base44);

    // If a specific course is requested, use it; otherwise use the connected one
    const courseId = google_course_id || connection.google_course_id;
    const courseName = google_course_name || connection.google_course_name;
    const courseWork = await fetchCourseWork(accessToken, courseId);

    const existing = await base44.asServiceRole.entities.SyncedAssignment.filter({
      class_folder_id,
      created_by: user.email
    });
    const existingMap = {};
    for (const a of existing) existingMap[a.google_assignment_id] = a;

    let imported = 0, updated = 0;
    for (const work of courseWork) {
      const { date, time } = parseDueDate(work.dueDate, work.dueTime);
      if (existingMap[work.id]) {
        const a = existingMap[work.id];
        if (a.title !== work.title || a.due_date !== date) {
          await base44.asServiceRole.entities.SyncedAssignment.update(a.id, {
            title: work.title,
            description: work.description || "",
            due_date: date,
            due_time: time
          });
          updated++;
        }
      } else {
        await base44.asServiceRole.entities.SyncedAssignment.create({
          class_folder_id,
          google_assignment_id: work.id,
          google_course_id: courseId,
          title: work.title,
          description: work.description || "",
          due_date: date,
          due_time: time,
          source: "google_classroom",
          status: "not_started",
          archived: false,
          sync_active: true
        });
        imported++;
      }
    }

    return Response.json({ success: true, imported, updated, course_name: courseName });
  }

  // ─── GET COURSES (list all available courses from connected account) ───
  if (action === "get_courses") {
    const connections = await base44.asServiceRole.entities.GoogleClassroomConnection.filter({
      created_by: user.email,
      sync_active: true
    });
    if (!connections.length) return Response.json({ courses: [], connected: false });
    // Use first connection with a token
    const connection = connections[0];
    const accessToken = await getValidAccessToken(connection, base44);
    const courses = await fetchClassroomCourses(accessToken);
    return Response.json({ courses, connected: true });
  }

  // ─── CHECK CONNECTION (global, any class) ───
  if (action === "check_connection") {
    const connections = await base44.asServiceRole.entities.GoogleClassroomConnection.filter({
      created_by: user.email,
      sync_active: true
    });
    const connection = connections.find(c => c.google_course_id);
    return Response.json({ connected: !!connection });
  }

  // ─── FETCH AVAILABLE ASSIGNMENTS (for modal picker) ───
  if (action === "fetch_assignments") {
    const connections = await base44.asServiceRole.entities.GoogleClassroomConnection.filter({
      created_by: user.email,
      sync_active: true
    });

    const allWork = [];

    for (const connection of connections) {
      if (!connection.google_course_id) continue;
      const accessToken = await getValidAccessToken(connection, base44);
      const courseWork = await fetchCourseWork(accessToken, connection.google_course_id);

      // Get already-imported IDs for this course
      const existing = await base44.asServiceRole.entities.SyncedAssignment.filter({
        google_course_id: connection.google_course_id,
        created_by: user.email
      });
      const existingIds = new Set(existing.map(a => a.google_assignment_id));

      for (const work of courseWork) {
        const { date } = parseDueDate(work.dueDate, work.dueTime);
        allWork.push({
          id: work.id,
          title: work.title,
          course_name: connection.google_course_name || connection.google_course_id,
          due_date: date,
          already_imported: existingIds.has(work.id),
          _connection_id: connection.id,
          _class_folder_id: connection.class_folder_id,
          _google_course_id: connection.google_course_id,
          _description: work.description || "",
          _due_time: work.dueTime ? parseDueDate(work.dueDate, work.dueTime).time : null
        });
      }
    }

    return Response.json({ assignments: allWork });
  }

  // ─── IMPORT SELECTED ASSIGNMENTS ───
  if (action === "import_selected") {
    const { assignment_ids } = body;
    if (!assignment_ids?.length) return Response.json({ imported: 0 });

    // Re-fetch all work to get full data for selected IDs
    const connections = await base44.asServiceRole.entities.GoogleClassroomConnection.filter({
      created_by: user.email,
      sync_active: true
    });

    const idSet = new Set(assignment_ids);
    let imported = 0;

    for (const connection of connections) {
      if (!connection.google_course_id) continue;
      const accessToken = await getValidAccessToken(connection, base44);
      const courseWork = await fetchCourseWork(accessToken, connection.google_course_id);

      const existing = await base44.asServiceRole.entities.SyncedAssignment.filter({
        google_course_id: connection.google_course_id,
        created_by: user.email
      });
      const existingIds = new Set(existing.map(a => a.google_assignment_id));

      for (const work of courseWork) {
        if (!idSet.has(work.id)) continue;
        if (existingIds.has(work.id)) continue; // skip duplicates

        const { date, time } = parseDueDate(work.dueDate, work.dueTime);
        await base44.asServiceRole.entities.SyncedAssignment.create({
          class_folder_id: connection.class_folder_id,
          google_assignment_id: work.id,
          google_course_id: connection.google_course_id,
          title: work.title,
          description: work.description || "",
          due_date: date,
          due_time: time,
          source: "google_classroom",
          status: "not_started",
          archived: false,
          sync_active: true
        });
        imported++;
      }

      await base44.asServiceRole.entities.GoogleClassroomConnection.update(connection.id, {
        last_synced_at: new Date().toISOString()
      });
    }

    return Response.json({ success: true, imported });
  }

  // ─── IMPORT / SYNC ALL ASSIGNMENTS (global) ───
  if (action === "import_assignments") {
    const connections = await base44.asServiceRole.entities.GoogleClassroomConnection.filter({
      created_by: user.email,
      sync_active: true
    });

    let totalImported = 0;
    let totalUpdated = 0;

    for (const connection of connections) {
      if (!connection.google_course_id) continue;

      const accessToken = await getValidAccessToken(connection, base44);
      const courseWork = await fetchCourseWork(accessToken, connection.google_course_id);

      const existing = await base44.asServiceRole.entities.SyncedAssignment.filter({
        google_course_id: connection.google_course_id,
        created_by: user.email
      });
      const existingMap = {};
      for (const a of existing) existingMap[a.google_assignment_id] = a;

      const remoteIds = new Set(courseWork.map(w => w.id));

      for (const work of courseWork) {
        const { date, time } = parseDueDate(work.dueDate, work.dueTime);
        if (existingMap[work.id]) {
          const a = existingMap[work.id];
          if (a.title !== work.title || a.due_date !== date) {
            await base44.asServiceRole.entities.SyncedAssignment.update(a.id, {
              title: work.title,
              description: work.description || "",
              due_date: date,
              due_time: time
            });
            totalUpdated++;
          }
        } else {
          await base44.asServiceRole.entities.SyncedAssignment.create({
            class_folder_id: connection.class_folder_id,
            google_assignment_id: work.id,
            google_course_id: connection.google_course_id,
            title: work.title,
            description: work.description || "",
            due_date: date,
            due_time: time,
            source: "google_classroom",
            status: "not_started",
            archived: false,
            sync_active: true
          });
          totalImported++;
        }
      }

      // Archive removed assignments
      for (const a of existing) {
        if (!remoteIds.has(a.google_assignment_id) && !a.archived) {
          await base44.asServiceRole.entities.SyncedAssignment.update(a.id, { archived: true });
        }
      }

      await base44.asServiceRole.entities.GoogleClassroomConnection.update(connection.id, {
        last_synced_at: new Date().toISOString()
      });
    }

    return Response.json({ success: true, imported: totalImported, updated: totalUpdated });
  }

  // ─── GET STATUS ───
  if (action === "get_status") {
    const { class_folder_id } = body;
    const connections = await base44.asServiceRole.entities.GoogleClassroomConnection.filter({
      class_folder_id,
      created_by: user.email
    });
    const connection = connections[0];
    if (!connection) return Response.json({ connected: false });
    return Response.json({
      connected: connection.sync_active && !!connection.google_course_id,
      connection_id: connection.id,
      google_course_name: connection.google_course_name,
      last_synced_at: connection.last_synced_at,
      sync_active: connection.sync_active,
      awaiting_course_selection: connection.sync_active && !connection.google_course_id
    });
  }

  // ─── DISCONNECT ───
  if (action === "disconnect") {
    const { class_folder_id } = body;
    const connections = await base44.asServiceRole.entities.GoogleClassroomConnection.filter({
      class_folder_id,
      created_by: user.email
    });
    for (const c of connections) {
      await base44.asServiceRole.entities.GoogleClassroomConnection.update(c.id, {
        sync_active: false,
        access_token_encrypted: null,
        refresh_token_encrypted: null
      });
    }
    // Mark synced assignments as inactive
    const synced = await base44.asServiceRole.entities.SyncedAssignment.filter({
      class_folder_id,
      created_by: user.email
    });
    for (const a of synced) {
      await base44.asServiceRole.entities.SyncedAssignment.update(a.id, { sync_active: false });
    }
    return Response.json({ success: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
});