// api/functions/syncAllClassrooms.js
// Syncs all active Google Classroom connections for the authenticated user

import { createClient } from '@supabase/supabase-js';

async function refreshAccessToken(refreshToken) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  return res.json();
}

async function getValidAccessToken(connection, supabase) {
  const now = new Date();
  const expiry = connection.token_expiry ? new Date(connection.token_expiry) : null;
  if (expiry && expiry > now) return connection.access_token_encrypted;

  const refreshed = await refreshAccessToken(connection.refresh_token_encrypted);
  if (!refreshed.access_token) throw new Error('Token refresh failed');

  const newExpiry = new Date(now.getTime() + refreshed.expires_in * 1000).toISOString();
  await supabase
    .from('google_classroom_connections')
    .update({ access_token_encrypted: refreshed.access_token, token_expiry: newExpiry })
    .eq('id', connection.id);

  return refreshed.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/, '');

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userEmail = user.email;

  const { data: connections } = await supabase
    .from('google_classroom_connections')
    .select('*')
    .eq('created_by', userEmail)
    .eq('sync_active', true)
    .not('google_course_id', 'is', null);

  if (!connections || connections.length === 0) {
    return res.json({ data: { synced: 0, connections: 0 } });
  }

  let totalSynced = 0;

  for (const conn of connections) {
    try {
      const accessToken = await getValidAccessToken(conn, supabase);

      const cwRes = await fetch(
        `https://classroom.googleapis.com/v1/courses/${conn.google_course_id}/courseWork?orderBy=dueDate+asc`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const cwData = await cwRes.json();
      const courseWork = cwData.courseWork || [];

      const rows = courseWork.map(cw => {
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
          google_course_id: conn.google_course_id,
          class_folder_id: conn.class_folder_id,
          title: cw.title,
          description: cw.description || null,
          due_date: dueDate,
          due_time: dueTime,
          type: cw.workType === 'QUIZ' ? 'quiz' : 'homework',
          source: 'google_classroom',
          sync_active: true,
          created_by: userEmail,
        };
      });

      if (rows.length > 0) {
        await supabase
          .from('synced_assignments')
          .upsert(rows, { onConflict: 'google_assignment_id,created_by' });
        totalSynced += rows.length;
      }

      await supabase
        .from('google_classroom_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', conn.id);
    } catch (err) {
      console.error(`Sync failed for connection ${conn.id}:`, err.message);
    }
  }

  return res.json({ data: { synced: totalSynced, connections: connections.length } });
}
