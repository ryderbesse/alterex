import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Gamepad2, TrendingUp, Settings, Calendar, Brain } from 'lucide-react';
import { AccessibilityProvider, useAccessibility } from '@/components/ui/AccessibilityContext';

function LayoutContent({ children, currentPageName }) {
  const { preferences, fontSizeClass, dyslexiaMode, adhdMode } = useAccessibility();

  // Teacher navigation
  const teacherNavItems = [
    { name: 'TeacherHome', icon: Home, label: 'Home' },
    { name: 'TeacherAlt', icon: Brain, label: 'Alt' },
    { name: 'Settings', icon: Settings, label: 'Settings' }
  ];

  // Student navigation
  // Custom calendar icon without grid
  const CalendarIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
    </svg>
  );

  const studentNavItems = [
    { name: 'Home', icon: Home, label: 'Home' },
    { name: 'Calendar', icon: CalendarIcon, label: 'Calendar' },
    { name: 'LearningCoach', icon: Brain, label: 'Alt' },
    { name: 'Games', icon: Gamepad2, label: 'Games' },
    { name: 'Progress', icon: TrendingUp, label: 'Progress' },
    { name: 'Settings', icon: Settings, label: 'Settings' }
  ];

  // Check if current page is teacher page
  const isTeacherPage = currentPageName?.startsWith('Teacher');
  
  // For Settings page, check user type to determine nav items
  const navItems = (() => {
    if (currentPageName === 'Settings') {
      // Settings page will use the appropriate nav based on referrer or user type
      // For now, default to student unless coming from teacher page
      if (document.referrer.includes('Teacher')) {
        return teacherNavItems;
      }
    }
    return isTeacherPage ? teacherNavItems : studentNavItems;
  })();

  const isActive = (name) => currentPageName === name;

  return (
    <div className={`min-h-screen ${preferences.dark_mode ? 'dark' : ''} ${preferences.high_contrast ? 'contrast-more' : ''} ${fontSizeClass}`}>
      <style>{`
        :root {
          --font-size-base: ${preferences.font_size === 'small' ? '14px' : preferences.font_size === 'large' ? '18px' : preferences.font_size === 'xlarge' ? '20px' : '16px'};
        }
        .dark {
          --bg-primary: #100F16;
          --bg-secondary: #1a1922;
          --text-primary: #f9fafb;
          --text-secondary: #9ca3af;
        }
        .dark body, .dark .bg-gray-900 {
          background-color: #100F16 !important;
        }
        .dark .bg-gray-800 {
          background-color: #1a1922 !important;
        }
        .contrast-more {
          --contrast-multiplier: 1.2;
        }
        ${preferences.reduced_motion ? `
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        ` : ''}
        ${adhdMode ? `
          .transition-all, .transition-colors, .transition-opacity {
            transition: none !important;
          }
          * {
            animation: none !important;
          }
        ` : ''}
        `}</style>
      
      <div className={`${preferences.dark_mode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} overflow-x-hidden`}>
        {/* Main Content */}
        <main className="pb-20 md:pb-0 md:pl-20 min-w-0 overflow-x-hidden">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className={`fixed bottom-0 left-0 right-0 md:hidden ${preferences.dark_mode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t z-50`}>
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={createPageUrl(item.name)}
                className={`flex flex-col items-center justify-center w-full h-full ${
                  isActive(item.name)
                    ? isTeacherPage ? 'text-emerald-600' : 'text-violet-600'
                    : preferences.dark_mode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <item.icon className={`w-6 h-6 ${isActive(item.name) ? 'scale-110' : ''} transition-transform`} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Desktop Side Navigation */}
        <nav className={`hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center py-8 ${preferences.dark_mode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r z-50`}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-8 overflow-hidden">
                            <img 
                              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695dc31072d91caa519edece/c8b285c7c_Screenshot2026-01-09at102735PM.png" 
                              alt="Logo" 
                              className="w-full h-full object-cover"
                            />
                          </div>
          
          <div className="flex-1 flex flex-col items-center gap-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={createPageUrl(item.name)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  isActive(item.name)
                    ? isTeacherPage 
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'
                      : 'bg-violet-100 text-violet-600 dark:bg-violet-900/30'
                    : preferences.dark_mode 
                      ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' 
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
                title={item.label}
              >
                <item.icon className="w-6 h-6" />
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <AccessibilityProvider>
      <LayoutContent currentPageName={currentPageName}>
        {children}
      </LayoutContent>
    </AccessibilityProvider>
  );
}