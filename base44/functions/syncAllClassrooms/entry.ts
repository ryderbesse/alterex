import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
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
  if (!res.ok) return null;
  return await res.json();
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

  // This runs as a scheduled job — use service role
  const connections = await base44.asServiceRole.entities.GoogleClassroomConnection.filter({
    sync_active: true
  });

  let totalSynced = 0;
  let errors = 0;

  for (const connection of connections) {
    if (!connection.google_course_id || !connection.refresh_token_encrypted) continue;

    try {
      // Refresh token if needed
      const expiry = connection.token_expiry ? new Date(connection.token_expiry) : null;
      const isExpired = !expiry || expiry <= new Date(Date.now() + 60000);
      let accessToken;

      if (isExpired) {
        const refreshToken = decryptToken(connection.refresh_token_encrypted);
        if (!refreshToken) continue;
        const refreshed = await refreshAccessToken(refreshToken);
        if (!refreshed) {
          // Mark as disconnected
          await base44.asServiceRole.entities.GoogleClassroomConnection.update(connection.id, { sync_active: false });
          continue;
        }
        const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
        await base44.asServiceRole.entities.GoogleClassroomConnection.update(connection.id, {
          access_token_encrypted: encryptToken(refreshed.access_token),
          token_expiry: newExpiry
        });
        accessToken = refreshed.access_token;
      } else {
        accessToken = decryptToken(connection.access_token_encrypted);
      }

      // Fetch course work
      const res = await fetch(`https://classroom.googleapis.com/v1/courses/${connection.google_course_id}/courseWork`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) continue;
      const data = await res.json();
      const courseWork = data.courseWork || [];

      // Get existing synced assignments for this connection
      const existing = await base44.asServiceRole.entities.SyncedAssignment.filter({
        class_folder_id: connection.class_folder_id,
        google_course_id: connection.google_course_id,
        created_by: connection.created_by
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
            sync_active: true,
            created_by: connection.created_by
          });
        }
      }

      // Archive deleted
      for (const a of existing) {
        if (!remoteIds.has(a.google_assignment_id) && !a.archived) {
          await base44.asServiceRole.entities.SyncedAssignment.update(a.id, { archived: true });
        }
      }

      await base44.asServiceRole.entities.GoogleClassroomConnection.update(connection.id, {
        last_synced_at: new Date().toISOString()
      });

      totalSynced++;
    } catch (e) {
      errors++;
    }
  }

  return Response.json({ success: true, synced: totalSynced, errors });
});