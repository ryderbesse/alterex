/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import About from './pages/About';
import BookmarkedFlashcards from './pages/BookmarkedFlashcards';
import Calendar from './pages/Calendar';
import ChatHistory from './pages/ChatHistory';
import ClassDetail from './pages/ClassDetail';
import DailyTopic from './pages/DailyTopic';
import Dashboard from './pages/Dashboard';
import DocumentDetail from './pages/DocumentDetail';
import Games from './pages/Games';
import Home from './pages/Home';
import LearningCoach from './pages/LearningCoach';
import OauthGoogle from './pages/OauthGoogle';
import PlayGame from './pages/PlayGame';
import Progress from './pages/Progress';
import Settings from './pages/Settings';
import TeacherAlt from './pages/TeacherAlt';
import TeacherClassDetail from './pages/TeacherClassDetail';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherHome from './pages/TeacherHome';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "BookmarkedFlashcards": BookmarkedFlashcards,
    "Calendar": Calendar,
    "ChatHistory": ChatHistory,
    "ClassDetail": ClassDetail,
    "DailyTopic": DailyTopic,
    "Dashboard": Dashboard,
    "DocumentDetail": DocumentDetail,
    "Games": Games,
    "Home": Home,
    "LearningCoach": LearningCoach,
    "OauthGoogle": OauthGoogle,
    "PlayGame": PlayGame,
    "Progress": Progress,
    "Settings": Settings,
    "TeacherAlt": TeacherAlt,
    "TeacherClassDetail": TeacherClassDetail,
    "TeacherDashboard": TeacherDashboard,
    "TeacherHome": TeacherHome,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};