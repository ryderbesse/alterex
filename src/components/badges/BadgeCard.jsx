import React from 'react';
import { Card } from "@/components/ui/card";
import { Trophy, Award, Star, Crown, Zap, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const tierConfig = {
  bronze: { color: 'from-amber-700 to-amber-800', icon: Award, glow: 'shadow-amber-200', ring: 'ring-amber-400' },
  silver: { color: 'from-gray-400 to-gray-500', icon: Trophy, glow: 'shadow-gray-300', ring: 'ring-gray-400' },
  gold: { color: 'from-yellow-400 to-yellow-600', icon: Star, glow: 'shadow-yellow-200', ring: 'ring-yellow-400' },
  platinum: { color: 'from-cyan-400 to-blue-500', icon: Zap, glow: 'shadow-cyan-200', ring: 'ring-cyan-400' },
  legendary: { color: 'from-purple-500 via-pink-500 to-orange-500', icon: Crown, glow: 'shadow-purple-300', ring: 'ring-purple-500' }
};

const badgeNames = {
  assignments_completed: 'Task Master',
  longest_streak: 'Streak Champion',
  most_xp_day: 'Daily Powerhouse',
  games_played: 'Game Legend',
  highest_grade: 'Academic Excellence'
};

const badgeDescriptions = {
  assignments_completed: 'Complete assignments to unlock',
  longest_streak: 'Stay active on consecutive days',
  most_xp_day: 'Earn XP by playing games',
  games_played: 'Play learning games to unlock',
  highest_grade: 'Achieve high grades on materials'
};

const badgeThresholds = {
  assignments_completed: { bronze: 5, silver: 15, gold: 30, platinum: 60, legendary: 100 },
  longest_streak: { bronze: 3, silver: 7, gold: 14, platinum: 30, legendary: 60 },
  most_xp_day: { bronze: 100, silver: 250, gold: 500, platinum: 1000, legendary: 2000 },
  games_played: { bronze: 5, silver: 20, gold: 50, platinum: 100, legendary: 250 },
  highest_grade: { bronze: 70, silver: 80, gold: 90, platinum: 95, legendary: 100 }
};

export default function BadgeCard({ badge, currentValue, onClick }) {
  const isUnlocked = badge?.unlocked_date;
  const tier = badge?.tier || 'bronze';
  const badgeType = badge?.badge_type;
  const config = tierConfig[tier];
  const Icon = config.icon;
  
  // Calculate progress to next tier
  const thresholds = badgeThresholds[badgeType];
  const tiers = ['bronze', 'silver', 'gold', 'platinum', 'legendary'];
  const currentTierIndex = badge ? tiers.indexOf(tier) : -1;
  const nextTier = currentTierIndex < 4 ? tiers[currentTierIndex + 1] : null;
  const nextThreshold = nextTier ? thresholds[nextTier] : thresholds.legendary;
  const currentThreshold = currentTierIndex >= 0 ? thresholds[tier] : 0;
  
  const progress = nextTier 
    ? Math.min(100, ((currentValue - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
    : 100;

  return (
    <motion.div
      whileHover={isUnlocked ? { scale: 1.05, y: -5 } : {}}
      whileTap={isUnlocked ? { scale: 0.98 } : {}}
      onClick={() => isUnlocked && onClick?.(badge)}
      className="cursor-pointer"
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300",
        isUnlocked ? `${config.glow} shadow-lg ring-2 ${config.ring}` : 'opacity-50 grayscale'
      )}>
        <div className="p-6">
          {/* Badge Icon */}
          <div className="relative mb-4">
            <div className={cn(
              "w-20 h-20 mx-auto rounded-full flex items-center justify-center",
              isUnlocked ? `bg-gradient-to-br ${config.color}` : 'bg-gray-200'
            )}>
              {isUnlocked ? (
                <Icon className="w-10 h-10 text-white" />
              ) : (
                <Lock className="w-10 h-10 text-gray-400" />
              )}
            </div>
            
            {/* Legendary glow effect */}
            {isUnlocked && tier === 'legendary' && (
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 opacity-50 blur-xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.7, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>

          {/* Badge Name */}
          <h4 className="font-semibold text-center mb-1">
            {badgeNames[badgeType]}
          </h4>
          
          {/* Tier */}
          <p className={cn(
            "text-sm text-center mb-2 capitalize font-medium",
            isUnlocked ? 'text-violet-600' : 'text-gray-400'
          )}>
            {tier} Tier
          </p>

          {/* Description */}
          <p className="text-xs text-gray-500 text-center mb-3">
            {badgeDescriptions[badgeType]}
          </p>

          {/* Progress Bar */}
          {isUnlocked && nextTier && (
            <div className="space-y-1">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${config.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                {currentValue} / {nextThreshold} to {nextTier}
              </p>
            </div>
          )}

          {!isUnlocked && (
            <p className="text-xs text-gray-400 text-center">
              Reach {thresholds.bronze} to unlock
            </p>
          )}

          {/* Current Value */}
          {isUnlocked && (
            <div className="mt-3 text-center">
              <span className="text-2xl font-bold text-gray-900">{badge.value}</span>
              <span className="text-xs text-gray-500 ml-1">
                {badgeType === 'highest_grade' && '%'}
                {badgeType === 'longest_streak' && ' days'}
                {badgeType === 'most_xp_day' && ' XP'}
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}