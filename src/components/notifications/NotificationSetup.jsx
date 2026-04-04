import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function NotificationSetup({ user }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setPermission(Notification.permission);
      // Check localStorage for notification preference
      const enabled = localStorage.getItem('notifications_enabled') === 'true';
      setNotificationsEnabled(enabled && Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Your browser does not support notifications');
      return;
    }

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('notifications_enabled', 'true');
        
        // Show test notification
        new Notification('Alterex Notifications Enabled! 🎉', {
          body: 'You\'ll now receive reminders for your assignments and study sessions.',
          icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695dc31072d91caa519edece/c8b285c7c_Screenshot2026-01-09at102735PM.png'
        });
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
    setLoading(false);
  };

  const toggleNotifications = () => {
    if (permission !== 'granted') {
      requestPermission();
    } else {
      const newState = !notificationsEnabled;
      setNotificationsEnabled(newState);
      localStorage.setItem('notifications_enabled', newState.toString());
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {permission === 'granted' ? (
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-emerald-600" />
            </div>
          ) : permission === 'denied' ? (
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <BellOff className="w-5 h-5 text-red-600" />
            </div>
          ) : (
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          )}
          
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Push Notifications</h3>
            <p className="text-sm text-gray-500 mb-3">
              {permission === 'granted' 
                ? 'Get reminders for assignments and study sessions'
                : permission === 'denied'
                ? 'Notifications are blocked. Enable them in your browser settings.'
                : 'Allow notifications to receive study reminders'}
            </p>
            
            {permission === 'granted' && notificationsEnabled && (
              <div className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Notifications are active
              </div>
            )}
          </div>
        </div>

        {permission !== 'denied' && (
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={toggleNotifications}
            disabled={loading}
          />
        )}
      </div>

      {permission === 'denied' && (
        <div className="mt-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
          To enable notifications, go to your browser settings and allow notifications for this site.
        </div>
      )}
    </Card>
  );
}