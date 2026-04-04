import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Settings as SettingsIcon, LogOut, Bell, Lock, Accessibility, AlertCircle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AccessibilitySettings from '@/components/settings/AccessibilitySettings';
import NotificationSetup from '@/components/notifications/NotificationSetup';
import BackButton from '@/components/common/BackButton';
import GoogleClassroomStatus from '@/components/classroom/GoogleClassroomStatus';
import { motion } from 'framer-motion';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);
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
    base44.auth.me().then(async (currentUser) => {
      setUser(currentUser);
      // Check if user is teacher
      const profiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
      if (profiles[0]?.user_type === 'teacher') {
        setIsTeacher(true);
      }
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleDisabilityChange = async (disability) => {
    let disabilities = userProfile?.disabilities || [];
    if (disabilities.includes(disability)) {
      disabilities = disabilities.filter(d => d !== disability);
    } else {
      disabilities = [...disabilities, disability];
    }
    
    // Apply accessibility changes based on disability
    const accessibilityUpdates = {};
    
    if (disabilities.includes('Visual Impairment')) {
      accessibilityUpdates.high_contrast = true;
      accessibilityUpdates.font_size = 'large';
    }
    
    if (disabilities.includes('Dyslexia')) {
      accessibilityUpdates.font_size = accessibilityUpdates.font_size || 'large';
    }
    
    if (userProfile) {
      await base44.entities.UserProfile.update(userProfile.id, {
        disabilities,
        accessibility_mode: disabilities.length > 0
      });
    } else {
      await base44.entities.UserProfile.create({
        disabilities,
        accessibility_mode: disabilities.length > 0,
        user_type: 'student'
      });
    }
    
    // Apply accessibility preferences
    if (Object.keys(accessibilityUpdates).length > 0) {
      const progress = await base44.entities.UserProgress.list();
      if (progress.length > 0) {
        const currentPrefs = progress[0].preferences || {};
        await base44.entities.UserProgress.update(progress[0].id, {
          preferences: { ...currentPrefs, ...accessibilityUpdates }
        });
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['userProfile'] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-violet-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="w-full max-w-2xl mx-auto px-4 py-6 md:py-8">
        <div className="mb-4">
          <BackButton to={isTeacher ? 'TeacherHome' : 'Home'} label={isTeacher ? 'My Classrooms' : 'Home'} showHomeIcon={true} />
        </div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Customize your learning experience
          </p>
        </motion.div>

        {/* Profile Section */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{user.full_name || 'Student'}</h3>
                  <p className="text-gray-500">{user.email}</p>
                  {userProfile?.learning_style && (
                    <p className="text-sm text-violet-600 mt-1 capitalize">
                      {userProfile.learning_style.replace('_', '/')} Learner
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Connected Accounts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mb-8"
        >
          <h3 className="text-lg font-semibold mb-4">Connected Accounts</h3>
          <Card className="p-4">
            <GoogleClassroomStatus />
          </Card>
        </motion.div>

        {/* About Alterex */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <Link to={createPageUrl('About')}>
            <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695dc31072d91caa519edece/c8b285c7c_Screenshot2026-01-09at102735PM.png"
                  alt="Alterex Logo"
                  className="h-12 object-contain flex-shrink-0"
                />
                <div>
                  <h3 className="text-lg font-bold mb-1">About Alterex</h3>
                  <p className="text-sm opacity-90 leading-relaxed">
                    Meet the founders, follow our journey, and learn more about our mission to personalize learning for everyone.
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Accessibility Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <AccessibilitySettings userProfile={userProfile} />
        </motion.div>

        {/* Learning Disability Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <h3 className="text-lg font-semibold mb-4">
            Cognitive Support Settings
          </h3>
          <Card className="p-4 space-y-4">
            <p className="text-sm text-gray-500">
              Enable support options to customize the app for your learning needs. These settings simplify content and improve readability.
            </p>
            
            {['Dyslexia', 'ADHD', 'Visual Impairment', 'Processing Difficulties'].map((disability) => {
              const isEnabled = (userProfile?.disabilities || []).includes(disability);
              return (
                <div 
                  key={disability} 
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    isEnabled 
                      ? 'bg-violet-50 border border-violet-200 dark:bg-violet-900/20 dark:border-violet-800' 
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <div>
                    <p className="font-medium">{disability}</p>
                    <p className="text-xs text-gray-500">
                      {disability === 'Dyslexia' && 'Simplified text, larger fonts, and clearer formatting'}
                      {disability === 'ADHD' && 'Reduced distractions, focused layouts, and breaks reminders'}
                      {disability === 'Visual Impairment' && 'High contrast mode and larger text sizes'}
                      {disability === 'Processing Difficulties' && 'Simplified summaries and step-by-step breakdowns'}
                    </p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleDisabilityChange(disability)}
                  />
                </div>
              );
            })}
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h3 className="text-lg font-semibold mb-4">Notifications</h3>
          <NotificationSetup user={user} />
        </motion.div>

        {/* Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h3 className="text-lg font-semibold mb-4">Privacy & Data</h3>
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Your Data is Private</p>
                <p className="text-sm text-gray-500">
                  All your study materials and progress are securely stored and only visible to you
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-4"
        >
          <Link to={createPageUrl('About')}>
            <Button variant="outline" className="w-full justify-start gap-3">
              <Info className="w-4 h-4 text-violet-600" />
              About Alterex
            </Button>
          </Link>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button 
            variant="outline" 
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </motion.div>
      </div>
    </div>
  );
}