import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const badgeThresholds = {
  assignments_completed: { bronze: 5, silver: 15, gold: 30, platinum: 60, legendary: 100 },
  longest_streak: { bronze: 3, silver: 7, gold: 14, platinum: 30, legendary: 60 },
  most_xp_day: { bronze: 100, silver: 250, gold: 500, platinum: 1000, legendary: 2000 },
  games_played: { bronze: 5, silver: 20, gold: 50, platinum: 100, legendary: 250 },
  highest_grade: { bronze: 70, silver: 80, gold: 90, platinum: 95, legendary: 100 }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all user data
    const [progress, badges, assignments, dailyXP, documents] = await Promise.all([
      base44.entities.UserProgress.filter({ created_by: user.email }),
      base44.entities.Badge.filter({ created_by: user.email }),
      base44.entities.Assignment.filter({ created_by: user.email }),
      base44.entities.DailyXP.filter({ created_by: user.email }),
      base44.entities.Document.filter({ created_by: user.email })
    ]);

    const userProgress = progress[0] || {};

    // Calculate current values
    const completedAssignments = assignments.filter(a => a.status === 'completed').length;
    const mostXPDay = Math.max(...dailyXP.map(d => d.total_xp), 0);
    const gamesPlayed = userProgress.games_completed || 0;
    const longestStreak = userProgress.longest_streak || 0;
    
    const gradesArray = documents
      .filter(d => d.grade !== undefined && d.max_grade && d.max_grade > 0)
      .map(d => (d.grade / d.max_grade) * 100);
    const highestGrade = gradesArray.length > 0 ? Math.max(...gradesArray) : 0;

    const currentValues = {
      assignments_completed: completedAssignments,
      longest_streak: longestStreak,
      most_xp_day: mostXPDay,
      games_played: gamesPlayed,
      highest_grade: Math.round(highestGrade)
    };

    const newBadges = [];
    const tiers = ['bronze', 'silver', 'gold', 'platinum', 'legendary'];

    // Check each badge type
    for (const [badgeType, value] of Object.entries(currentValues)) {
      const thresholds = badgeThresholds[badgeType];
      const userBadges = badges.filter(b => b.badge_type === badgeType);

      // Find highest unlocked tier
      const highestTierIndex = userBadges.length > 0
        ? Math.max(...userBadges.map(b => tiers.indexOf(b.tier)))
        : -1;

      // Check if user qualifies for next tier
      for (let i = highestTierIndex + 1; i < tiers.length; i++) {
        const tier = tiers[i];
        const threshold = thresholds[tier];

        if (value >= threshold) {
          // Check if badge already exists
          const exists = userBadges.some(b => b.tier === tier);
          
          if (!exists) {
            const newBadge = await base44.entities.Badge.create({
              badge_type: badgeType,
              tier,
              value,
              unlocked_date: new Date().toISOString(),
              viewed: false
            });
            newBadges.push(newBadge);
          }
        }
      }
    }

    return Response.json({
      success: true,
      newBadges,
      currentValues
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});