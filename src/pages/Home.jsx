import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Plus, Gamepad2, BookOpen, Trophy, Flame, Target, 
  ArrowRight, Sparkles, Clock, TrendingUp, FolderOpen, Brain, Bookmark
} from 'lucide-react';
import GoogleClassroomConnectBanner from '@/components/classroom/GoogleClassroomConnectBanner.jsx';
import XPDisplay from '@/components/common/XPDisplay';
import ClassCard from '@/components/classes/ClassCard';
import CreateClassModal from '@/components/classes/CreateClassModal';
import MasteryBadge from '@/components/common/MasteryBadge';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import UserTypeSelector from '@/components/onboarding/UserTypeSelector';
import NotificationManager from '@/components/notifications/NotificationManager';
import { motion } from 'framer-motion';

export default function Home() {
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showEditClass, setShowEditClass] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showUserTypeSelector, setShowUserTypeSelector] = useState(false);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      return profiles[0];
    },
    enabled: !!user?.email
  });

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Check if user has selected their type
        const profiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
        if (profiles.length === 0) {
          setShowUserTypeSelector(true);
        } else if (profiles[0].user_type === 'teacher') {
          // Redirect to teacher dashboard
          window.location.href = createPageUrl('TeacherHome');
        }
      } catch (err) {}
    };
    checkUser();
  }, []);

  useEffect(() => {
    // Check if user type is selected
    if (user && userProfile === undefined) return; // still loading
    
    if (user && !userProfile) {
      setShowUserTypeSelector(true);
    } else if (userProfile?.user_type === 'teacher') {
      // Redirect teachers to teacher dashboard
      window.location.href = createPageUrl('TeacherDashboard');
    } else if (userProfile && !localStorage.getItem('studyquest_onboarding_completed')) {
      setShowOnboarding(true);
    }
  }, [user, userProfile]);

  const handleUserTypeSelect = async (type) => {
    await base44.entities.UserProfile.create({
      user_type: type,
      onboarding_completed: false
    });
    queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    setShowUserTypeSelector(false);
    
    if (type === 'teacher') {
      window.location.href = createPageUrl('TeacherHome');
    } else {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('studyquest_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  const { data: classes = [], refetch: refetchClasses } = useQuery({
    queryKey: ['classes', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Class.filter({ created_by: user.email }, '-created_date');
    },
    enabled: !!user?.email
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Document.filter({ created_by: user.email }, '-created_date', 50);
    },
    enabled: !!user?.email
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.LearningGame.filter({ created_by: user.email }, '-created_date', 20);
    },
    enabled: !!user?.email
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.GameSession.filter({ created_by: user.email }, '-created_date', 50);
    },
    enabled: !!user?.email
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['userProgress', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.UserProgress.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  const { data: masteryData = [] } = useQuery({
    queryKey: ['mastery', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.ConceptMastery.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  const userProgress = progress[0] || { total_xp: 0, level: 1, current_streak: 0 };

  const getClassStats = (classId) => {
    const classDocs = documents.filter(d => d.class_id === classId);
    const classGames = games.filter(g => g.class_id === classId);
    const classMastery = masteryData.filter(m => m.class_id === classId);
    const classData = classes.find(c => c.id === classId);
    
    const avgMastery = classMastery.length > 0 
      ? classMastery.reduce((sum, m) => sum + (m.mastery_percentage || 0), 0) / classMastery.length 
      : 0;

    // Get grades from localStorage for this class
    const stored = localStorage.getItem(`grades_${classId}`);
    const grades = stored ? JSON.parse(stored) : [];
    
    let avgGrade = undefined;
    if (grades.length > 0) {
      const weights = classData?.grade_weights;
      if (weights && Object.keys(weights).length > 0) {
        // Calculate weighted average
        const categoryGrades = {};
        grades.forEach(g => {
          const cat = g.category || 'other';
          if (!categoryGrades[cat]) categoryGrades[cat] = [];
          categoryGrades[cat].push((g.grade / g.max_grade) * 100);
        });
        
        let weightedSum = 0;
        let totalWeight = 0;
        Object.entries(categoryGrades).forEach(([category, catGrades]) => {
          const weight = weights[category] || 0;
          if (weight > 0 && catGrades.length > 0) {
            const categoryAvg = catGrades.reduce((sum, g) => sum + g, 0) / catGrades.length;
            weightedSum += categoryAvg * (weight / 100);
            totalWeight += weight;
          }
        });
        
        if (totalWeight > 0) {
          avgGrade = (weightedSum / totalWeight) * 100;
        } else {
          avgGrade = grades.reduce((sum, g) => sum + (g.grade / g.max_grade) * 100, 0) / grades.length;
        }
      } else {
        avgGrade = grades.reduce((sum, g) => sum + (g.grade / g.max_grade) * 100, 0) / grades.length;
      }
    }

    return {
      documentsCount: classDocs.length,
      gamesCount: classGames.length,
      masteryPercentage: avgMastery,
      averageGrade: avgGrade
    };
  };

  const recentGames = games.slice(0, 3);
  const weakConcepts = masteryData
    .filter(m => m.suggested_focus || m.mastery_percentage < 50)
    .slice(0, 3);

  const todaySessions = sessions.filter(s => {
    const today = new Date().toDateString();
    return new Date(s.created_date).toDateString() === today;
  });

  const todayXP = todaySessions.reduce((sum, s) => sum + (s.xp_earned || 0), 0);

  const { data: assignments = [] } = useQuery({
    queryKey: ['homeAssignments', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Assignment.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  return (
    <NotificationManager assignments={assignments}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-violet-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 overflow-x-hidden">
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-5 md:py-8 overflow-x-hidden">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl md:text-3xl font-bold mb-1"
            >
              Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
            </motion.h1>
            <div className="flex items-center gap-3 flex-shrink-0">
              {!user && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    onClick={() => base44.auth.redirectToLogin()}
                    className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-xl shadow-md"
                  >
                    Sign In / Sign Up
                  </Button>
                </motion.div>
              )}
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695dc31072d91caa519edece/15870dd77_Screenshot_2026-01-09_at_94616_PM-removebg-preview.png" 
                alt="Alterex Logo" 
                className="h-8 md:h-16 object-contain"
              />
            </div>
          </div>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            Ready to learn something new today?
          </p>
        </div>

        {/* XP and Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-5"
        >
          <XPDisplay 
            xp={userProgress.total_xp} 
            level={userProgress.level} 
            streak={userProgress.current_streak} 
          />
        </motion.div>



        {/* Google Classroom Connect Banner */}
        <GoogleClassroomConnectBanner />

        {/* Alt Learning Coach Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to={createPageUrl('LearningCoach')}>
              <Card className="p-4 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 hover:shadow-md transition-all cursor-pointer group h-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 min-w-[44px] bg-violet-600 rounded-xl flex items-center justify-center">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Alt</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Personalized study tips</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-violet-600 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </div>
              </Card>
            </Link>
            <Link to={createPageUrl('DailyTopic')}>
              <Card className="p-4 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 hover:shadow-md transition-all cursor-pointer group h-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 min-w-[44px] bg-amber-600 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Daily Discovery</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Learn something new today</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </div>
              </Card>
            </Link>
          </div>
        </motion.div>

        {/* Needs Attention Section */}
        {(weakConcepts.length > 0 || (() => {
          // Check if there are any bookmarked flashcards
          const hasBookmarks = games.some(g => {
            if (g.game_type !== 'flashcards') return false;
            const stored = localStorage.getItem(`flashcard_bookmarks_${g.id}`);
            return stored && JSON.parse(stored).length > 0;
          });
          return hasBookmarks;
        })()) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <Card className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Needs Attention</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Topics and cards that need more practice</p>
                </div>
              </div>
              
              {weakConcepts.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Weak Concepts</p>
                  <div className="flex flex-wrap gap-2">
                    {weakConcepts.map((concept, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2">
                        <span className="font-medium text-sm">{concept.concept}</span>
                        <MasteryBadge level={concept.mastery_level} showLabel={false} size="small" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const hasBookmarks = games.some(g => {
                  if (g.game_type !== 'flashcards') return false;
                  const stored = localStorage.getItem(`flashcard_bookmarks_${g.id}`);
                  return stored && JSON.parse(stored).length > 0;
                });
                return hasBookmarks;
              })() && (
                <Link to={createPageUrl('BookmarkedFlashcards')}>
                  <Button variant="outline" className="w-full justify-between group hover:bg-white dark:hover:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-amber-600" />
                      <span>Bookmarked Flashcards</span>
                    </div>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              )}
            </Card>
          </motion.div>
        )}

        {/* Classes Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-violet-600" />
              My Classes
            </h2>
            <Button onClick={() => setShowCreateClass(true)} size="sm" className="min-h-[44px] px-3">
              <Plus className="w-4 h-4 mr-1" />
              New Class
            </Button>
          </div>

          {classes.length === 0 ? (
            <Card className="p-8 text-center">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No classes yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first class to start organizing your study materials
              </p>
              <Button onClick={() => setShowCreateClass(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Class
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {classes.map((classData) => (
                <Link key={classData.id} to={createPageUrl(`ClassDetail?id=${classData.id}`)}>
                  <ClassCard 
                    classData={classData} 
                    stats={getClassStats(classData.id)}
                  />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Continue Learning */}
        {recentGames.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-violet-600" />
                Continue Learning
              </h2>
              <Link to={createPageUrl('Games')}>
                <Button variant="ghost" size="sm" className="min-h-[44px]">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {recentGames.map((game) => (
                <Link key={game.id} to={createPageUrl(`PlayGame?id=${game.id}`)}>
                  <Card className="p-4 hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center group-hover:bg-violet-200 transition-colors">
                        <Gamepad2 className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{game.title}</h4>
                        <p className="text-sm text-gray-500 capitalize">{game.game_type?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full group-hover:bg-violet-50 group-hover:border-violet-300">
                      Play Now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreateClass && (
        <CreateClassModal
          onClose={() => setShowCreateClass(false)}
          onCreate={() => refetchClasses()}
        />
      )}

      <OnboardingModal 
        open={showOnboarding} 
        onComplete={handleOnboardingComplete} 
      />

      <UserTypeSelector
        open={showUserTypeSelector}
        onSelect={handleUserTypeSelect}
      />
      </div>
    </NotificationManager>
  );
}