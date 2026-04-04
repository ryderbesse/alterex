import React from 'react';
import { Card } from '@/components/ui/card';
import { Target, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const badgeThresholds = {
  assignments_completed: { bronze: 5, silver: 15, gold: 30, platinum: 60, legendary: 100 },
  longest_streak: { bronze: 3, silver: 7, gold: 14, platinum: 30, legendary: 60 },
  most_xp_day: { bronze: 100, silver: 250, gold: 500, platinum: 1000, legendary: 2000 },
  games_played: { bronze: 5, silver: 20, gold: 50, platinum: 100, legendary: 250 },
  highest_grade: { bronze: 70, silver: 80, gold: 90, platinum: 95, legendary: 100 }
};

const badgeNames = {
  assignments_completed: 'Task Master',
  longest_streak: 'Streak Champion',
  most_xp_day: 'Daily Powerhouse',
  games_played: 'Game Legend',
  highest_grade: 'Academic Excellence'
};

export default function BadgeProgress({ badges, currentValues }) {
  // Find the closest next badge goal
  const nextGoals = Object.keys(badgeThresholds).map(badgeType => {
    const userBadges = badges.filter(b => b.badge_type === badgeType);
    const currentValue = currentValues[badgeType] || 0;
    const thresholds = badgeThresholds[badgeType];
    const tiers = ['bronze', 'silver', 'gold', 'platinum', 'legendary'];
    
    // Get highest tier unlocked
    const highestBadge = userBadges.length > 0 
      ? userBadges.sort((a, b) => tiers.indexOf(b.tier) - tiers.indexOf(a.tier))[0]
      : null;
    
    const currentTierIndex = highestBadge ? tiers.indexOf(highestBadge.tier) : -1;
    const nextTier = currentTierIndex < 4 ? tiers[currentTierIndex + 1] : null;
    
    if (!nextTier || currentValue >= thresholds.legendary) return null;
    
    const nextThreshold = thresholds[nextTier];
    const currentThreshold = currentTierIndex >= 0 ? thresholds[tiers[currentTierIndex]] : 0;
    
    const progress = nextTier 
      ? Math.min(100, ((currentValue - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
      : 100;
    
    return {
      badgeType,
      name: badgeNames[badgeType],
      tier: nextTier,
      current: currentValue,
      goal: nextThreshold,
      progress,
      distance: nextThreshold - currentValue
    };
  }).filter(Boolean).sort((a, b) => a.distance - b.distance);

  const topGoals = nextGoals.slice(0, 3);

  return (
    <Card className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-violet-600" />
        <h3 className="font-semibold">Next Badge Goals</h3>
      </div>
      
      {topGoals.length > 0 ? (
        <div className="space-y-3">
          {topGoals.map((goal) => (
            <motion.div
              key={goal.badgeType}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">{goal.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{goal.tier} tier</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-violet-600">
                    {goal.current} / {goal.goal}
                  </p>
                  <p className="text-xs text-gray-500">
                    {goal.distance} to go
                  </p>
                </div>
              </div>
              
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, goal.progress)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <TrendingUp className="w-12 h-12 text-violet-400 mx-auto mb-3" />
          <p className="font-medium text-violet-600">All badges maxed!</p>
          <p className="text-sm text-gray-500">You've achieved legendary status</p>
        </div>
      )}
    </Card>
  );
}