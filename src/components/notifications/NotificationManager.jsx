import { useEffect } from 'react';
import { differenceInMinutes, isPast } from 'date-fns';

// Schedule notifications for upcoming assignments
export function useAssignmentNotifications(assignments) {
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (localStorage.getItem('notifications_enabled') !== 'true') return;

    const checkNotifications = () => {
      const now = new Date();
      
      assignments.forEach(assignment => {
        if (assignment.status === 'completed') return;
        
        const dueDate = new Date(assignment.due_date);
        if (isPast(dueDate)) return;
        
        const minutesUntilDue = differenceInMinutes(dueDate, now);
        const notificationKey = `notif_${assignment.id}`;
        
        // Notify 24 hours before (1440 minutes)
        if (minutesUntilDue <= 1440 && minutesUntilDue > 1430) {
          if (!sessionStorage.getItem(`${notificationKey}_24h`)) {
            new Notification('Assignment Due Tomorrow! 📅', {
              body: `"${assignment.title}" is due tomorrow. Start preparing now!`,
              icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695dc31072d91caa519edece/c8b285c7c_Screenshot2026-01-09at102735PM.png',
              requireInteraction: false
            });
            sessionStorage.setItem(`${notificationKey}_24h`, 'true');
          }
        }
        
        // Notify 1 hour before
        if (minutesUntilDue <= 60 && minutesUntilDue > 50) {
          if (!sessionStorage.getItem(`${notificationKey}_1h`)) {
            new Notification('Assignment Due Soon! ⏰', {
              body: `"${assignment.title}" is due in 1 hour!`,
              icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695dc31072d91caa519edece/c8b285c7c_Screenshot2026-01-09at102735PM.png',
              requireInteraction: true
            });
            sessionStorage.setItem(`${notificationKey}_1h`, 'true');
          }
        }
      });
    };

    // Check immediately
    checkNotifications();
    
    // Check every 10 minutes
    const interval = setInterval(checkNotifications, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [assignments]);
}

// Daily study reminder
export function useDailyStudyReminder() {
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (localStorage.getItem('notifications_enabled') !== 'true') return;

    const sendDailyReminder = () => {
      const now = new Date();
      const hours = now.getHours();
      
      // Send reminder at 6 PM if not sent today
      if (hours === 18 && now.getMinutes() < 10) {
        const today = now.toDateString();
        const lastSent = localStorage.getItem('daily_reminder_sent');
        
        if (lastSent !== today) {
          new Notification('Time to Study! 📚', {
            body: 'Review your assignments and keep your streak going!',
            icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695dc31072d91caa519edece/c8b285c7c_Screenshot2026-01-09at102735PM.png'
          });
          localStorage.setItem('daily_reminder_sent', today);
        }
      }
    };

    sendDailyReminder();
    const interval = setInterval(sendDailyReminder, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
}

export default function NotificationManager({ assignments, children }) {
  useAssignmentNotifications(assignments);
  useDailyStudyReminder();
  
  return children;
}