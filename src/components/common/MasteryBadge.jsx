import React from 'react';
import { Circle, Loader2, Target, CheckCircle2 } from 'lucide-react';

const masteryConfig = {
  not_started: {
    icon: Circle,
    label: 'Not Started',
    color: 'text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800'
  },
  learning: {
    icon: Loader2,
    label: 'Learning',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20'
  },
  practicing: {
    icon: Target,
    label: 'Practicing',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20'
  },
  mastered: {
    icon: CheckCircle2,
    label: 'Mastered',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20'
  }
};

export default function MasteryBadge({ level, showLabel = true, size = 'default' }) {
  const config = masteryConfig[level] || masteryConfig.not_started;
  const Icon = config.icon;
  
  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    default: 'px-3 py-1.5 text-sm',
    large: 'px-4 py-2 text-base'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.color} ${sizeClasses[size]}`}>
      <Icon className={size === 'small' ? 'w-3 h-3' : 'w-4 h-4'} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}