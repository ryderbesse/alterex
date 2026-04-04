import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, GraduationCap, Unplug, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

function GCIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#1A73E8"/>
      <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white" fontFamily="Arial">G</text>
    </svg>
  );
}

export default function GoogleClassroomStatus() {
  const [connected, setConnected] = useState(null); // null = loading
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    base44.functions.invoke('googleClassroom', { action: 'check_global_connection' })
      .then(res => setConnected(res.data.connected))
      .catch(() => setConnected(false));
  }, []);

  const handleConnect = async () => {
    const res = await base44.functions.invoke('googleClassroom', { action: 'start_auth' });
    localStorage.setItem('gc_global_connect', '1');
    window.location.href = res.data.authUrl;
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    // Disconnect the global connection
    await base44.functions.invoke('googleClassroom', { action: 'disconnect', class_folder_id: 'global' }).catch(() => {});
    setConnected(false);
    setDisconnecting(false);
  };

  if (connected === null) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${connected ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
          <GCIcon size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">Google Classroom</p>
            {connected && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {connected ? 'Your account is linked — sync assignments from any class folder.' : 'Connect to import assignments from Google Classroom.'}
          </p>
        </div>
      </div>
      {connected ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-gray-500 hover:text-red-500 gap-1.5 text-xs"
        >
          {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
          Disconnect
        </Button>
      ) : (
        <Button size="sm" onClick={handleConnect} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs">
          <GCIcon size={13} />
          Connect
        </Button>
      )}
    </div>
  );
}