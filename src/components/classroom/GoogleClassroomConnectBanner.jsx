import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function GCIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#1A73E8"/>
      <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white" fontFamily="Arial">G</text>
    </svg>
  );
}

export default function GoogleClassroomConnectBanner() {
  const [connected, setConnected] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('gc_banner_dismissed')) {
      setDismissed(true);
      return;
    }
    base44.functions.invoke('googleClassroom', { action: 'check_global_connection' })
      .then(res => setConnected(res.data.connected))
      .catch(() => setConnected(false));
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('googleClassroom', { action: 'start_auth' });
      localStorage.setItem('gc_global_connect', '1');
      window.location.href = res.data.authUrl;
    } catch {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('gc_banner_dismissed', '1');
    setDismissed(true);
  };

  if (dismissed || connected === null || connected === true) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-5"
      >
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                <GCIcon size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">Connect Google Classroom</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Sync assignments from your courses directly into your class folders.</p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                size="sm"
                onClick={handleConnect}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
              >
                <GCIcon size={13} />
                Connect
              </Button>
              <Button variant="ghost" size="icon" className="w-7 h-7 text-blue-400 hover:text-blue-600" onClick={handleDismiss}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}