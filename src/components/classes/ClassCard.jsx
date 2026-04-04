import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, FileText, Gamepad2, Trophy, ChevronRight, BookOpen, GraduationCap, Beaker, Globe, Music, Code } from 'lucide-react';
import ProgressRing from '@/components/common/ProgressRing';

const patternIcons = {
  grid: BookOpen,
  dots: GraduationCap,
  diagonal: Beaker,
  waves: Globe,
  circles: Music,
  squares: Code
};

const colorMap = {
  violet: 'from-violet-500 to-purple-600',
  blue: 'from-blue-500 to-cyan-500',
  emerald: 'from-emerald-500 to-teal-500',
  amber: 'from-amber-500 to-orange-500',
  rose: 'from-rose-500 to-pink-500',
  indigo: 'from-indigo-500 to-blue-600',
  cyan: 'from-cyan-500 to-cyan-600',
  pink: 'from-pink-500 to-pink-600',
  orange: 'from-orange-500 to-orange-600',
  teal: 'from-teal-500 to-teal-600',
  purple: 'from-purple-500 to-purple-600',
  red: 'from-red-500 to-red-600',
  'violet-purple': 'from-violet-500 to-purple-600',
  'blue-cyan': 'from-blue-500 to-cyan-500',
  'emerald-teal': 'from-emerald-500 to-teal-500',
  'amber-orange': 'from-amber-500 to-orange-500',
  'rose-pink': 'from-rose-500 to-pink-500',
  'indigo-blue': 'from-indigo-500 to-blue-600',
  'pink-purple': 'from-pink-500 to-purple-500',
  'cyan-blue': 'from-cyan-500 to-blue-500',
  'orange-red': 'from-orange-500 to-red-500',
  'teal-emerald': 'from-teal-500 to-emerald-500',
  'purple-indigo': 'from-purple-500 to-indigo-600',
  'red-rose': 'from-red-500 to-rose-500'
};

export default function ClassCard({ classData, stats, onClick }) {
  const gradient = colorMap[classData.color] || colorMap.violet;
  const hasBackgroundImage = classData.background_image;
  const hasBackgroundPattern = classData.background_pattern;
  
  // Get pattern icon if background pattern is set
  const PatternIcon = hasBackgroundPattern ? (patternIcons[classData.background_pattern] || FolderOpen) : FolderOpen;
  
  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onClick?.(classData)}
    >
      <div 
        className={`h-24 ${hasBackgroundImage ? '' : `bg-gradient-to-br ${gradient}`} p-4 flex items-end justify-between relative overflow-hidden`}
        style={hasBackgroundImage ? {
          backgroundImage: `url(${classData.background_image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        {hasBackgroundImage && <div className="absolute inset-0 bg-black/30" />}
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center relative z-10">
          <PatternIcon className="w-5 h-5 text-white" />
        </div>
        {classData.grades_enabled && stats?.averageGrade !== undefined && (
          <div className="flex flex-col items-end relative z-10">
            <div className="text-2xl font-bold text-white">{Math.round(stats.averageGrade)}%</div>
            <span className="text-xs text-white/80">Grade</span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg">{classData.name}</h3>
            <p className="text-sm text-gray-500">
              {stats?.documentsCount || 0} materials
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </div>

        <div className="flex items-center gap-4">
          {stats?.masteryPercentage !== undefined && (
            <div className="flex items-center gap-2">
              <ProgressRing progress={stats.masteryPercentage} size={40} strokeWidth={4} />
              <span className="text-xs text-gray-500">Mastery</span>
            </div>
          )}
          
          <div className="flex gap-2 flex-wrap">
            {stats?.gamesCount > 0 && (
              <Badge variant="outline" className="text-xs">
                <Gamepad2 className="w-3 h-3 mr-1" />
                {stats.gamesCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}