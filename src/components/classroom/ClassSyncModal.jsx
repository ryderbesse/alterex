import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { Loader2, GraduationCap, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

// Google Classroom "G" logo as inline SVG
function GCIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#1A73E8"/>
      <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white" fontFamily="Arial">G</text>
    </svg>
  );
}

export default function ClassSyncModal({ open, onClose, classId, onSynced }) {
  const [step, setStep] = useState('idle'); // idle | loading | select_course | syncing | done | error | not_connected
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!open) {
      setStep('idle');
      setSelectedCourse('');
      setResult(null);
      setErrorMsg('');
    } else {
      checkAndLoadCourses();
    }
  }, [open]);

  const checkAndLoadCourses = async () => {
    setStep('loading');
    try {
      const res = await base44.functions.invoke('googleClassroom', { action: 'get_courses' });
      if (!res.data.connected || res.data.courses.length === 0) {
        setStep('not_connected');
        return;
      }
      setCourses(res.data.courses);
      setStep('select_course');
    } catch {
      setStep('not_connected');
    }
  };

  const handleConnect = async () => {
    try {
      const res = await base44.functions.invoke('googleClassroom', { action: 'start_auth', class_folder_id: classId });
      localStorage.setItem('gc_pending_class', classId);
      window.location.href = res.data.authUrl;
    } catch {
      setErrorMsg('Failed to start Google connection.');
    }
  };

  const handleSync = async () => {
    if (!selectedCourse) return;
    setStep('syncing');
    try {
      const course = courses.find(c => c.id === selectedCourse);
      const res = await base44.functions.invoke('googleClassroom', {
        action: 'sync_class',
        class_folder_id: classId,
        google_course_id: selectedCourse,
        google_course_name: course?.name || selectedCourse
      });
      setResult(res.data);
      setStep('done');
      onSynced?.();
    } catch (e) {
      setErrorMsg(e?.response?.data?.error || 'Sync failed. Please try again.');
      setStep('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GCIcon size={20} />
            Sync Google Classroom Assignments
          </DialogTitle>
        </DialogHeader>

        {step === 'loading' && (
          <div className="flex items-center justify-center py-8 gap-3 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Checking connection…
          </div>
        )}

        {step === 'not_connected' && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 text-sm">Google Classroom not connected</p>
                <p className="text-xs text-amber-700 mt-1">Connect your Google account to sync assignments from your courses.</p>
              </div>
            </div>
            <Button onClick={handleConnect} className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
              <GCIcon size={16} />
              Connect Google Classroom
            </Button>
          </div>
        )}

        {step === 'select_course' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Choose which Google Classroom course to import assignments from into this class folder.
            </p>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course…" />
              </SelectTrigger>
              <SelectContent>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSync} disabled={!selectedCourse} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="w-4 h-4" />
                Sync Assignments
              </Button>
            </div>
          </div>
        )}

        {step === 'syncing' && (
          <div className="flex items-center justify-center py-8 gap-3 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            Importing assignments…
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-800">Sync complete!</p>
                <p className="text-sm text-emerald-700 mt-1">
                  {result?.imported > 0 ? `${result.imported} new assignment${result.imported !== 1 ? 's' : ''} imported.` : 'No new assignments found.'}
                  {result?.updated > 0 ? ` ${result.updated} updated.` : ''}
                </p>
              </div>
            </div>
            <Button onClick={onClose} className="w-full">Done</Button>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={checkAndLoadCourses}>Try Again</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}