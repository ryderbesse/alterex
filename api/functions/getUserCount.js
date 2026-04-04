// api/functions/getUserCount.js — Returns the total number of registered users

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  );

  const { count, error } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('getUserCount error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.json({ data: { count: count ?? 0 } });
}
