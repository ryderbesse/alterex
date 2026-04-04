// api/functions/googleClassroom.js
// Google Classroom OAuth flow and assignment sync — Node.js Vercel function
//
// Actions (all sent as POST with JSON body { action, ...params }):
//
//   start_auth              Generate the Google OAuth consent URL
//   exchange_code           Exchange the OAuth code for tokens, store connection,
//                           then immediately fetch and return the user's courses
//   get_status              Is a specific class_folder_id connected?
//   check_connection        Is the global connection active? (Dashboard)
//   check_global_connection Is any connection active? (GoogleClassroomConnectBanner)
//   get_courses             List Google Classroom courses from any active connection
//   select_course           Attach a course to an existing connection
//   sync                    Sync assignments for a class_folder_id (uses stored course)
//   sync_class              Select course + sync in one step; returns { imported, updated }
//   disconnect              Mark a connection inactive

import { createClient } from '@supabase/supabase-js';

// ─── OAuth scopes ────────────────────────────────────────────────────────────

const GC_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
].join(' ');

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Build the app's base origin from Vercel forwarded headers, falling back to
// an APP_URL env var so the redirect_uri is always stable.
function getAppOrigin(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host || '';
  return `${proto}://${host}`;
}

function getRedirectUri(req) {
  return `${getAppOrigin(req)}/OauthGoogle`;
}

// Authenticate the caller and return { user, supabase }
async function authenticate(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return { user: error ? null : user, supabase };
}

// Exchange a refresh_token for a new access_token and persist it
async function refreshAccessToken(connection, supabase) {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: connection.refresh_token_encrypted,
    grant_type:    'refresh_token',
  });

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  });
  const data = await res.json();

  if (!data.access_token) {
    throw new Error(`Token refresh failed: ${data.error_description || data.error || 'unknown'}`);
  }

  const newExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

  await supabase
    .from('google_classroom_connections')
    .update({ access_token_encrypted: data.access_token, token_expiry: newExpiry })
    .eq('id', connection.id);

  return data.access_token;
}

// Return a valid access token for a connection, refreshing if expired
async function getValidAccessToken(connection, supabase) {
  const expiry = connection.token_expiry ? new Date(connection.token_expiry) : null;
  // Refresh 60 s early to avoid edge-case expiry mid-request
  if (expiry && expiry > new Date(Date.now() + 60_000)) {
    return connection.access_token_encrypted;
  }
  if (!connection.refresh_token_encrypted) {
    throw new Error('No refresh token stored — user must reconnect Google Classroom.');
  }
  return refreshAccessToken(connection, supabase);
}

// Fetch the user's active Google Classroom courses
async function fetchCourses(accessToken) {
  const res  = await fetch(
    'https://classroom.googleapis.com/v1/courses?studentId=me&courseStates=ACTIVE',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = await res.json();
  if (data.error) throw new Error(`Google API error: ${data.error.message}`);
  return (data.courses || []).map(c => ({ id: c.id, name: c.name }));
}

// Convert a Google courseWork item to a synced_assignments row
function courseWorkToRow(cw, courseId, folder, userEmail) {
  let dueDate = null;
  let dueTime = null;

  if (cw.dueDate) {
    const { year, month, day } = cw.dueDate;
    dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  if (cw.dueTime) {
    const { hours = 0, minutes = 0 } = cw.dueTime;
    dueTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  return {
    google_assignment_id: cw.id,
    google_course_id:     courseId,
    class_folder_id:      folder,
    title:                cw.title,
    description:          cw.description || null,
    due_date:             dueDate,
    due_time:             dueTime,
    type:                 cw.workType === 'QUIZ' ? 'quiz' : 'homework',
    source:               'google_classroom',
    sync_active:          true,
    created_by:           userEmail,
  };
}

// Core sync logic — fetch coursework and upsert; returns { imported, updated }
async function syncCourseWork(connection, folder, userEmail, supabase) {
  const accessToken = await getValidAccessToken(connection, supabase);

  const cwRes  = await fetch(
    `https://classroom.googleapis.com/v1/courses/${connection.google_course_id}/courseWork?orderBy=dueDate+asc`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const cwData = await cwRes.json();
  if (cwData.error) throw new Error(`Google API error: ${cwData.error.message}`);

  const courseWork = cwData.courseWork || [];
  if (courseWork.length === 0) {
    await supabase
      .from('google_classroom_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connection.id);
    return { imported: 0, updated: 0, synced: 0 };
  }

  const incomingIds = courseWork.map(cw => cw.id);

  // Find which IDs already exist so we can report imported vs updated
  const { data: existing } = await supabase
    .from('synced_assignments')
    .select('google_assignment_id')
    .eq('created_by', userEmail)
    .in('google_assignment_id', incomingIds);

  const existingSet = new Set((existing || []).map(r => r.google_assignment_id));

  const rows = courseWork.map(cw =>
    courseWorkToRow(cw, connection.google_course_id, folder, userEmail)
  );

  const { error: upsertError } = await supabase
    .from('synced_assignments')
    .upsert(rows, { onConflict: 'google_assignment_id,created_by' });

  if (upsertError) throw new Error(upsertError.message);

  await supabase
    .from('google_classroom_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', connection.id);

  const imported = rows.filter(r => !existingSet.has(r.google_assignment_id)).length;
  const updated  = rows.length - imported;
  return { imported, updated, synced: rows.length };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body   = req.body || {};
  const action = body.action;

  try {

    // ── start_auth ────────────────────────────────────────────────────────────
    // No auth required — the browser is about to navigate away anyway.
    if (action === 'start_auth') {
      const state  = body.class_folder_id || 'global';
      const params = new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID,
        redirect_uri:  getRedirectUri(req),
        response_type: 'code',
        scope:         GC_SCOPES,
        access_type:   'offline',
        prompt:        'consent',     // force consent so we always get a refresh_token
        state,
      });
      return res.json({ data: { authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}` } });
    }

    // ── All other actions require a valid session ──────────────────────────────
    const { user, supabase } = await authenticate(req);
    if (!user?.email) return res.status(401).json({ error: 'Unauthorized' });
    const userEmail = user.email;

    // ── exchange_code ─────────────────────────────────────────────────────────
    // GoogleClassroomConnect expects { connection_id, courses[] } in the response
    // so the user can immediately pick a course without a separate get_courses call.
    if (action === 'exchange_code') {
      const { code, class_folder_id } = body;
      if (!code) return res.status(400).json({ error: 'code is required' });

      const params = new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri:  getRedirectUri(req),
        grant_type:    'authorization_code',
      });

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    params.toString(),
      });
      const tokens = await tokenRes.json();

      if (!tokens.access_token) {
        console.error('Token exchange failed:', tokens);
        return res.status(400).json({ error: 'Failed to exchange code', details: tokens.error_description || tokens.error });
      }

      const folder = class_folder_id || 'global';
      const expiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

      // Upsert — one active connection per (user, folder)
      const { data: conn, error: upsertError } = await supabase
        .from('google_classroom_connections')
        .upsert({
          class_folder_id:          folder,
          access_token_encrypted:   tokens.access_token,
          refresh_token_encrypted:  tokens.refresh_token || null,
          token_expiry:             expiry,
          sync_active:              true,
          created_by:               userEmail,
        }, { onConflict: 'created_by,class_folder_id' })
        .select()
        .single();

      if (upsertError) {
        console.error('exchange_code upsert error:', upsertError);
        return res.status(500).json({ error: upsertError.message });
      }

      // Immediately fetch courses so the caller can show the course picker
      let courses = [];
      try {
        courses = await fetchCourses(tokens.access_token);
      } catch (err) {
        console.warn('Could not fetch courses after exchange:', err.message);
      }

      return res.json({ data: { success: true, connection_id: conn.id, courses } });
    }

    // ── get_status ────────────────────────────────────────────────────────────
    // check_connection and check_global_connection are aliases for the same query
    // but against different folders.
    if (action === 'get_status' || action === 'check_connection' || action === 'check_global_connection') {
      const folder = body.class_folder_id || 'global';
      const { data: conn } = await supabase
        .from('google_classroom_connections')
        .select('id, google_course_id, google_course_name, last_synced_at')
        .eq('created_by', userEmail)
        .eq('class_folder_id', folder)
        .eq('sync_active', true)
        .maybeSingle();

      return res.json({
        data: {
          connected:      !!conn,
          course_id:      conn?.google_course_id   || null,
          course_name:    conn?.google_course_name || null,
          last_synced_at: conn?.last_synced_at     || null,
        },
      });
    }

    // ── get_courses ───────────────────────────────────────────────────────────
    // ClassSyncModal calls this without a class_folder_id.  We look for any
    // active connection (preferring 'global') so per-class connections also work.
    if (action === 'get_courses') {
      const { data: connections } = await supabase
        .from('google_classroom_connections')
        .select('*')
        .eq('created_by', userEmail)
        .eq('sync_active', true)
        .order('created_at', { ascending: false });

      if (!connections || connections.length === 0) {
        return res.json({ data: { connected: false, courses: [] } });
      }

      // Prefer the global connection; fall back to the most recent one
      const conn =
        connections.find(c => c.class_folder_id === 'global') || connections[0];

      try {
        const accessToken = await getValidAccessToken(conn, supabase);
        const courses     = await fetchCourses(accessToken);
        return res.json({ data: { connected: true, courses } });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    // ── select_course ─────────────────────────────────────────────────────────
    if (action === 'select_course') {
      const { connection_id, google_course_id, google_course_name, class_folder_id } = body;
      if (!connection_id || !google_course_id) {
        return res.status(400).json({ error: 'connection_id and google_course_id are required' });
      }

      const { error: updateError } = await supabase
        .from('google_classroom_connections')
        .update({
          google_course_id,
          google_course_name: google_course_name || null,
          // If a class_folder_id was passed, update the folder association too
          ...(class_folder_id ? { class_folder_id } : {}),
        })
        .eq('id', connection_id)
        .eq('created_by', userEmail);

      if (updateError) return res.status(500).json({ error: updateError.message });
      return res.json({ data: { success: true } });
    }

    // ── sync ──────────────────────────────────────────────────────────────────
    // Uses the course already stored on the connection.
    if (action === 'sync') {
      const folder = body.class_folder_id || 'global';

      const { data: conn } = await supabase
        .from('google_classroom_connections')
        .select('*')
        .eq('created_by', userEmail)
        .eq('class_folder_id', folder)
        .eq('sync_active', true)
        .maybeSingle();

      if (!conn?.google_course_id) {
        return res.status(400).json({
          error: 'No connected course for this folder. Please connect Google Classroom first.',
        });
      }

      const result = await syncCourseWork(conn, folder, userEmail, supabase);
      return res.json({ data: result });
    }

    // ── sync_class ────────────────────────────────────────────────────────────
    // Used by ClassSyncModal: caller provides the course to use, so we upsert
    // the connection's course selection then immediately sync.
    if (action === 'sync_class') {
      const { class_folder_id, google_course_id, google_course_name } = body;
      if (!google_course_id) {
        return res.status(400).json({ error: 'google_course_id is required' });
      }

      const folder = class_folder_id || 'global';

      // Find any active connection for this user (prefer the one matching the folder)
      const { data: connections } = await supabase
        .from('google_classroom_connections')
        .select('*')
        .eq('created_by', userEmail)
        .eq('sync_active', true)
        .order('created_at', { ascending: false });

      if (!connections || connections.length === 0) {
        return res.status(400).json({ error: 'No active Google Classroom connection found.' });
      }

      const conn =
        connections.find(c => c.class_folder_id === folder) ||
        connections.find(c => c.class_folder_id === 'global') ||
        connections[0];

      // Persist the course selection for this folder
      await supabase
        .from('google_classroom_connections')
        .update({
          google_course_id,
          google_course_name: google_course_name || null,
          class_folder_id:    folder,
        })
        .eq('id', conn.id);

      // Run the sync with the updated connection object
      const updatedConn = { ...conn, google_course_id, class_folder_id: folder };
      const result = await syncCourseWork(updatedConn, folder, userEmail, supabase);
      return res.json({ data: result });
    }

    // ── disconnect ────────────────────────────────────────────────────────────
    if (action === 'disconnect') {
      const folder = body.class_folder_id || 'global';

      const { error: updateError } = await supabase
        .from('google_classroom_connections')
        .update({ sync_active: false })
        .eq('created_by', userEmail)
        .eq('class_folder_id', folder);

      if (updateError) return res.status(500).json({ error: updateError.message });
      return res.json({ data: { success: true } });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (err) {
    console.error(`googleClassroom [${action}] error:`, err);
    return res.status(500).json({ error: err.message });
  }
}
