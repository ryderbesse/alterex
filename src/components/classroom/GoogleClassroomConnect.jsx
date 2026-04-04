import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { CheckCircle2, RefreshCw, Unplug, AlertTriangle, Loader2, GraduationCap } from 'lucide-react';

const REDIRECT_URI = "https://alterexai.com";

export default function GoogleClassroomConnect({ classId, onSyncComplete }) {
  const [status, setStatus] = useState(null); // null=loading, object=loaded
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [pendingConnectionId, setPendingConnectionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('googleClassroom', { action: 'get_status', class_folder_id: classId });
      setStatus(res.data);
    } catch {
      setStatus({ connected: false });
    }
  }, [classId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleCodeExchange = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('googleClassroom', {
        action: 'exchange_code',
        code,
        class_folder_id: classId
      });
      setCourses(res.data.courses || []);
      setPendingConnectionId(res.data.connection_id);
      setShowCourseDialog(true);
    } catch (e) {
      setError('Failed to connect Google account. Please try again.');
    }
    setLoading(false);
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('googleClassroom', { action: 'start_auth', class_folder_id: classId });
      const { authUrl } = res.data;
      localStorage.setItem('gc_pending_class', classId);
      localStorage.setItem('class_folder_id', classId);
      window.location.href = authUrl;
    } catch (e) {
      setError('Failed to initiate Google connection. Please try again.');
      setLoading(false);
    }
  };

  // Re-check if we came back from OAuth with standard ?code= param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state === classId) {
      // Rename to gc_code to avoid conflicts
      const clean = new URL(window.location.href);
      clean.searchParams.delete('code');
      clean.searchParams.delete('state');
      clean.searchParams.delete('scope');
      clean.searchParams.delete('authuser');
      clean.searchParams.delete('prompt');
      window.history.replaceState({}, '', clean.toString());
      handleCodeExchange(code);
    }
  }, [classId]);

  const handleSelectCourse = async () => {
    if (!selectedCourse || !pendingConnectionId) return;
    setLoading(true);
    setError(null);
    try {
      const course = courses.find(c => c.id === selectedCourse);
      await base44.functions.invoke('googleClassroom', {
        action: 'select_course',
        connection_id: pendingConnectionId,
        google_course_id: selectedCourse,
        google_course_name: course?.name || selectedCourse,
        class_folder_id: classId
      });
      setShowCourseDialog(false);
      await fetchStatus();
      onSyncComplete?.();
    } catch (e) {
      setError('Failed to import assignments. Please try again.');
    }
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      await base44.functions.invoke('googleClassroom', { action: 'sync', class_folder_id: classId });
      await fetchStatus();
      onSyncComplete?.();
    } catch (e) {
      setError(e.response?.data?.error || 'Sync failed. Your access may have been revoked.');
    }
    setSyncing(false);
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await base44.functions.invoke('googleClassroom', { action: 'disconnect', class_folder_id: classId });
      setStatus({ connected: false });
      onSyncComplete?.();
    } catch {
      setError('Failed to disconnect.');
    }
    setLoading(false);
  };

  if (status === null) return null;

  return (
    <>
      <Card className="p-4 mb-4 border-2 border-dashed border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${status.connected ? 'bg-emerald-100' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <GraduationCap className={`w-5 h-5 ${status.connected ? 'text-emerald-600' : 'text-gray-500'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Google Classroom</span>
                {status.connected && (
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </Badge>
                )}
              </div>
              {status.connected && status.google_course_name && (
                <p className="text-xs text-gray-500 mt-0.5">{status.google_course_name}</p>
              )}
              {status.connected && status.last_synced_at && (
                <p className="text-xs text-gray-400">
                  Last synced {new Date(status.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status.connected ? (
              <>
                <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="gap-1.5">
                  {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Sync
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDisconnect} disabled={loading} className="gap-1.5 text-gray-500 hover:text-red-500">
                  <Unplug className="w-3.5 h-3.5" />
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={handleConnect}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GraduationCap className="w-3.5 h-3.5" />}
                Connect Google Classroom
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </Card>

      {/* Course Selection Dialog */}
      <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a Google Classroom Course</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            Choose which Google Classroom course to sync with this class folder.
          </p>
          {courses.length === 0 ? (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">No active courses found in your Google Classroom account.</span>
            </div>
          ) : (
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course..." />
              </SelectTrigger>
              <SelectContent>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowCourseDialog(false)}>Cancel</Button>
            <Button onClick={handleSelectCourse} disabled={!selectedCourse || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Connect & Import
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}