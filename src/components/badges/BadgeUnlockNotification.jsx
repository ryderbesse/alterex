import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Award, Star, Crown, Zap, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

const tierConfig = {
  bronze: { color: 'from-amber-700 to-amber-800', icon: Award },
  silver: { color: 'from-gray-400 to-gray-500', icon: Trophy },
  gold: { color: 'from-yellow-400 to-yellow-600', icon: Star },
  platinum: { color: 'from-cyan-400 to-blue-500', icon: Zap },
  legendary: { color: 'from-purple-500 via-pink-500 to-orange-500', icon: Crown }
};

const badgeNames = {
  assignments_completed: 'Task Master',
  longest_streak: 'Streak Champion',
  most_xp_day: 'Daily Powerhouse',
  games_played: 'Game Legend',
  highest_grade: 'Academic Excellence'
};

export default function BadgeUnlockNotification({ badge, onClose }) {
  const config = tierConfig[badge.tier];
  const Icon = config.icon;

  useEffect(() => {
    // Fire confetti
    const colors = badge.tier === 'legendary' 
      ? ['#a855f7', '#ec4899', '#f97316']
      : badge.tier === 'platinum'
      ? ['#22d3ee', '#3b82f6']
      : badge.tier === 'gold'
      ? ['#fbbf24', '#f59e0b']
      : ['#78716c'];

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors
    });

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [badge, onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.5, y: 50 }}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 max-w-sm"
      >
        <Card className="relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-10`} />
          
          <div className="relative p-6">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
                className={`w-16 h-16 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0`}
              >
                <Icon className="w-8 h-8 text-white" />
              </motion.div>

              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">
                  Badge Unlocked!
                </p>
                <h3 className="font-bold text-lg mb-1">
                  {badgeNames[badge.badge_type]}
                </h3>
                <p className="text-sm text-violet-600 capitalize">
                  {badge.tier} Tier • {badge.value}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}