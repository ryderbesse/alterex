import React from 'react';
import { Sparkles, Flame, Trophy } from 'lucide-react';

export default function XPDisplay({ xp, level, streak, compact = false }) {
  const xpForNextLevel = level * 500;
  const currentLevelXP = xp % 500;
  const progress = (currentLevelXP / 500) * 100;

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="font-semibold">{xp.toLocaleString()} XP</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="font-semibold">Lvl {level}</span>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-semibold">{streak} days</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-white/80 text-sm">Level {level}</p>
            <p className="text-2xl font-bold">{xp.toLocaleString()} XP</p>
          </div>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-xl">
            <Flame className="w-5 h-5 text-orange-300" />
            <span className="font-semibold">{streak} day streak</span>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-white/80">
          <span>Progress to Level {level + 1}</span>
          <span>{currentLevelXP} / 500 XP</span>
        </div>
        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}