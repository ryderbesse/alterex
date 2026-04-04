// api/functions/checkBadges.js
// Checks badge thresholds against the user's live data and awards any newly earned badges.
//
// Metric sources (derived from how Progress.jsx reads them):
//   assignments_completed → assignments WHERE status='completed', COUNT
//   games_played          → user_progress.games_completed  (NOT count of game_sessions rows)
//   longest_streak        → user_progress.longest_streak
//   most_xp_day           → MAX(daily_xp.total_xp) across all rows for the user
//   highest_grade         → MAX((grade / max_grade) * 100) for documents with max_grade > 0
//
// Called with an empty body {} from PlayGame, Calendar, and Progress pages.
// Auth is via the Bearer JWT injected by base44Client.getAuthHeaders().

import { createClient } from '@supabase/supabase-js';

// 5 badge types × 5 tiers = 25 total possible badges (matches Progress.jsx "X / 25 badges unlocked")
const BADGE_THRESHOLDS = {
  assignments_completed: [
    { tier: 'bronze',    value: 1   },
    { tier: 'silver',    value: 5   },
    { tier: 'gold',      value: 20  },
    { tier: 'platinum',  value: 50  },
    { tier: 'legendary', value: 100 },
  ],
  longest_streak: [
    { tier: 'bronze',    value: 3  },
    { tier: 'silver',    value: 7  },
    { tier: 'gold',      value: 14 },
    { tier: 'platinum',  value: 30 },
    { tier: 'legendary', value: 60 },
  ],
  most_xp_day: [
    { tier: 'bronze',    value: 100  },
    { tier: 'silver',    value: 500  },
    { tier: 'gold',      value: 1000 },
    { tier: 'platinum',  value: 2000 },
    { tier: 'legendary', value: 5000 },
  ],
  games_played: [
    { tier: 'bronze',    value: 1   },
    { tier: 'silver',    value: 5   },
    { tier: 'gold',      value: 20  },
    { tier: 'platinum',  value: 50  },
    { tier: 'legendary', value: 100 },
  ],
  // Stored as a percentage (0-100). Uses (grade / max_grade) * 100 to normalise raw grades.
  highest_grade: [
    { tier: 'bronze',    value: 60 },
    { tier: 'silver',    value: 70 },
    { tier: 'gold',      value: 80 },
    { tier: 'platinum',  value: 90 },
    { tier: 'legendary', value: 95 },
  ],
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Resolve user from JWT — all callers send an empty body so we must use the header
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/, '');

  if (!token) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const userEmail = user.email;

  // -------------------------------------------------------------------------
  // Fetch all data sources in parallel
  // -------------------------------------------------------------------------
  const [
    { data: progressRow },
    { data: dailyXPRows },
    { count: completedCount },
    { data: gradedDocs },
    { data: existingBadges },
  ] = await Promise.all([
    // games_completed and longest_streak live here
    supabase
      .from('user_progress')
      .select('games_completed, longest_streak, total_xp, current_streak, level')
      .eq('created_by', userEmail)
      .maybeSingle(),

    // most_xp_day = MAX(total_xp) across all daily_xp rows
    supabase
      .from('daily_xp')
      .select('total_xp')
      .eq('created_by', userEmail),

    // assignments_completed = count of completed assignments
    supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userEmail)
      .eq('status', 'completed'),

    // highest_grade = MAX((grade / max_grade) * 100) for documents with a real max_grade
    supabase
      .from('documents')
      .select('grade, max_grade')
      .eq('created_by', userEmail)
      .not('grade', 'is', null)
      .gt('max_grade', 0),

    // badges the user already has (to avoid duplicates)
    supabase
      .from('badges')
      .select('badge_type, tier')
      .eq('created_by', userEmail),
  ]);

  // -------------------------------------------------------------------------
  // Compute current metric values — exactly as Progress.jsx does it
  // -------------------------------------------------------------------------
  const gradePercentages = (gradedDocs ?? []).map(d => (Number(d.grade) / Number(d.max_grade)) * 100);

  const metrics = {
    assignments_completed: completedCount ?? 0,
    games_played:          progressRow?.games_completed ?? 0,
    longest_streak:        progressRow?.longest_streak ?? 0,
    most_xp_day:           Math.max(0, ...(dailyXPRows ?? []).map(d => d.total_xp ?? 0)),
    highest_grade:         gradePercentages.length > 0 ? Math.round(Math.max(...gradePercentages)) : 0,
  };

  // -------------------------------------------------------------------------
  // Determine which badges are new
  // -------------------------------------------------------------------------
  const earned = new Set((existingBadges ?? []).map(b => `${b.badge_type}:${b.tier}`));

  const newBadges = [];
  for (const [badgeType, tiers] of Object.entries(BADGE_THRESHOLDS)) {
    const metricValue = metrics[badgeType];
    for (const { tier, value } of tiers) {
      if (!earned.has(`${badgeType}:${tier}`) && metricValue >= value) {
        newBadges.push({
          badge_type:   badgeType,
          tier,
          value:        metricValue, // snapshot of the metric at time of award
          viewed:       false,
          created_by:   userEmail,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Insert newly earned badges
  // -------------------------------------------------------------------------
  if (newBadges.length > 0) {
    const { error: insertError } = await supabase.from('badges').insert(newBadges);
    if (insertError) {
      console.error('Badge insert error:', insertError);
      return res.status(500).json({ error: insertError.message });
    }
  }

  return res.json({
    data: {
      awarded:  newBadges.length,
      badges:   newBadges,
      metrics,  // handy for debugging — can be stripped in production
    },
  });
}
