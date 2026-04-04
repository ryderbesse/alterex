import React from 'react';
import { Card } from "@/components/ui/card";
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Trophy, Target, Flame, Sparkles, TrendingUp, 
  Calendar, Clock, BookOpen, Gamepad2, ArrowRight, Award
} from 'lucide-react';
import XPDisplay from '@/components/common/XPDisplay';
import ProgressRing from '@/components/common/ProgressRing';
import MasteryBadge from '@/components/common/MasteryBadge';
import BackButton from '@/components/common/BackButton';
import BadgeCard from '@/components/badges/BadgeCard';
import BadgeProgress from '@/components/badges/BadgeProgress';
import BadgeUnlockNotification from '@/components/badges/BadgeUnlockNotification';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function Progress() {
  const [user, setUser] = useState(null);
  const [newBadge, setNewBadge] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: progress = [] } = useQuery({
    queryKey: ['userProgress', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.UserProgress.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['allSessions', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.GameSession.filter({ created_by: user.email }, '-created_date', 100);
    },
    enabled: !!user?.email
  });

  const { data: mastery = [] } = useQuery({
    queryKey: ['allMastery', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.ConceptMastery.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Class.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Badge.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['allAssignments', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Assignment.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  const { data: dailyXP = [] } = useQuery({
    queryKey: ['dailyXP', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.DailyXP.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['allDocuments', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Document.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  const userProgress = progress[0] || { total_xp: 0, level: 1, current_streak: 0, longest_streak: 0, games_completed: 0 };

  // Calculate current badge values
  const completedAssignments = allAssignments.filter(a => a.status === 'completed').length;
  const mostXPDay = Math.max(...dailyXP.map(d => d.total_xp), 0);
  const gamesPlayed = userProgress.games_completed || 0;
  const longestStreak = userProgress.longest_streak || 0;
  
  // Calculate highest grade from documents
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

  // Mark badge as viewed
  const markBadgeViewed = useMutation({
    mutationFn: async (badgeId) => {
      await base44.entities.Badge.update(badgeId, { viewed: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['badges']);
    }
  });

  // Check for new unviewed badges
  useEffect(() => {
    const unviewedBadge = badges.find(b => !b.viewed);
    if (unviewedBadge) {
      setNewBadge(unviewedBadge);
    }
  }, [badges]);

  // Run badge check on page load
  useEffect(() => {
    if (user?.email) {
      base44.functions.invoke('checkBadges', {}).then(() => {
        queryClient.invalidateQueries(['badges']);
      }).catch(() => {});
    }
  }, [user?.email]);

  // Activity heatmap data (last 30 days)
  const last30Days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date()
  });

  const activityByDay = last30Days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const daySessions = sessions.filter(s => 
      format(new Date(s.created_date), 'yyyy-MM-dd') === dayStr
    );
    return {
      date: day,
      count: daySessions.length,
      xp: daySessions.reduce((sum, s) => sum + (s.xp_earned || 0), 0)
    };
  });

  // Mastery by class
  const masteryByClass = classes.map(c => {
    const classMastery = mastery.filter(m => m.class_id === c.id);
    const avgMastery = classMastery.length > 0
      ? classMastery.reduce((sum, m) => sum + (m.mastery_percentage || 0), 0) / classMastery.length
      : 0;
    const masteredCount = classMastery.filter(m => m.mastery_level === 'mastered').length;
    return {
      ...c,
      avgMastery,
      masteredCount,
      totalConcepts: classMastery.length
    };
  });

  // Weak concepts across all classes
  const weakConcepts = mastery
    .filter(m => m.suggested_focus || m.mastery_percentage < 50)
    .sort((a, b) => (a.mastery_percentage || 0) - (b.mastery_percentage || 0))
    .slice(0, 5);

  // Stats
  const totalXPThisWeek = sessions
    .filter(s => new Date(s.created_date) > subDays(new Date(), 7))
    .reduce((sum, s) => sum + (s.xp_earned || 0), 0);

  const avgAccuracy = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + ((s.score || 0) / (s.max_score || 1)), 0) / sessions.length * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-violet-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="mb-4">
          <BackButton />
        </div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-2">Your Progress</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Track your learning journey and see how far you've come
          </p>
        </motion.div>

        {/* XP Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <XPDisplay 
            xp={userProgress.total_xp} 
            level={userProgress.level} 
            streak={userProgress.current_streak} 
          />
        </motion.div>

        {/* Badge Progress - Next Goals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <BadgeProgress badges={badges} currentValues={currentValues} />
        </motion.div>

        {/* Badges Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Award className="w-6 h-6 text-violet-600" />
              Achievements
            </h2>
            <p className="text-sm text-gray-500">
              {badges.length} / 25 badges unlocked
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {['assignments_completed', 'longest_streak', 'most_xp_day', 'games_played', 'highest_grade'].map((badgeType) => {
              // Get highest tier badge for this type
              const userBadges = badges.filter(b => b.badge_type === badgeType);
              const tiers = ['bronze', 'silver', 'gold', 'platinum', 'legendary'];
              const highestBadge = userBadges.length > 0
                ? userBadges.sort((a, b) => tiers.indexOf(b.tier) - tiers.indexOf(a.tier))[0]
                : null;
              
              return (
                <BadgeCard
                  key={badgeType}
                  badge={highestBadge ? { ...highestBadge, badge_type: badgeType } : { badge_type: badgeType }}
                  currentValue={currentValues[badgeType]}
                  onClick={(badge) => {
                    // Could open a detail modal here
                  }}
                />
              );
            })}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {[
            { icon: Sparkles, label: 'This Week', value: `+${totalXPThisWeek} XP`, color: 'text-violet-600 bg-violet-100' },
            { icon: Target, label: 'Avg Accuracy', value: `${Math.round(avgAccuracy)}%`, color: 'text-emerald-600 bg-emerald-100' },
            { icon: Gamepad2, label: 'Games Played', value: userProgress.games_completed || 0, color: 'text-blue-600 bg-blue-100' },
            { icon: Flame, label: 'Best Streak', value: `${userProgress.longest_streak || 0} days`, color: 'text-orange-600 bg-orange-100' }
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.05 }}
            >
              <Card className="p-4">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Activity Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-600" />
              Activity (Last 30 Days)
            </h3>
            <div className="flex gap-1 flex-wrap">
              {activityByDay.map((day, idx) => {
                const intensity = day.count === 0 ? 'bg-gray-100 dark:bg-gray-800' :
                                 day.count <= 2 ? 'bg-violet-200' :
                                 day.count <= 4 ? 'bg-violet-400' :
                                 'bg-violet-600';
                return (
                  <div
                    key={idx}
                    className={`w-8 h-8 rounded-md ${intensity} flex items-center justify-center text-xs font-medium transition-all hover:scale-110 cursor-default`}
                    title={`${format(day.date, 'MMM d')}: ${day.count} games, ${day.xp} XP`}
                  >
                    {day.count > 0 && <span className="text-white">{day.count}</span>}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
              <span>Less</span>
              <div className="w-4 h-4 rounded bg-gray-100" />
              <div className="w-4 h-4 rounded bg-violet-200" />
              <div className="w-4 h-4 rounded bg-violet-400" />
              <div className="w-4 h-4 rounded bg-violet-600" />
              <span>More</span>
            </div>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {/* Class Mastery */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-violet-600" />
                Class Mastery
              </h3>
              {masteryByClass.length > 0 ? (
                <div className="space-y-4">
                  {masteryByClass.map((c) => (
                    <Link key={c.id} to={createPageUrl(`ClassDetail?id=${c.id}`)}>
                      <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <ProgressRing progress={c.avgMastery} size={50} strokeWidth={5} />
                        <div className="flex-1">
                          <p className="font-medium">{c.name}</p>
                          <p className="text-sm text-gray-500">
                            {c.masteredCount} / {c.totalConcepts} concepts mastered
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No classes yet. Create one to start tracking mastery.
                </p>
              )}
            </Card>
          </motion.div>

          {/* Focus Areas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-600" />
                Needs Attention
              </h3>
              {weakConcepts.length > 0 ? (
                <div className="space-y-3">
                  {weakConcepts.map((concept) => {
                    const classInfo = classes.find(c => c.id === concept.class_id);
                    return (
                      <div key={concept.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <div>
                          <p className="font-medium">{concept.concept}</p>
                          <p className="text-sm text-gray-500">{classInfo?.name}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <ProgressRing 
                            progress={concept.mastery_percentage} 
                            size={40} 
                            strokeWidth={4}
                            color="#f59e0b"
                          />
                          <MasteryBadge level={concept.mastery_level} showLabel={false} size="small" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="font-medium text-emerald-600">Great job!</p>
                  <p className="text-sm text-gray-500">No weak areas to focus on</p>
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Badge Unlock Notification */}
        {newBadge && (
          <BadgeUnlockNotification
            badge={newBadge}
            onClose={() => {
              markBadgeViewed.mutate(newBadge.id);
              setNewBadge(null);
            }}
          />
        )}
      </div>
    </div>
  );
}