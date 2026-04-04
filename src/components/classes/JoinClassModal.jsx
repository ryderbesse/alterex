import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import { Users } from 'lucide-react';

export default function JoinClassModal({ open, onClose, onSuccess }) {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!joinCode.trim()) return;

    setLoading(true);
    setError('');

    try {
      const user = await base44.auth.me();
      
      // Find classroom with this join code
      const classrooms = await base44.entities.Classroom.filter({ join_code: joinCode.toUpperCase() });
      
      if (classrooms.length === 0) {
        setError('Invalid join code. Please check and try again.');
        setLoading(false);
        return;
      }

      const classroom = classrooms[0];
      
      // Check if already joined
      if (classroom.student_emails?.includes(user.email)) {
        setError('You have already joined this classroom.');
        setLoading(false);
        return;
      }

      // Add user to classroom
      const updatedEmails = [...(classroom.student_emails || []), user.email];
      await base44.entities.Classroom.update(classroom.id, {
        student_emails: updatedEmails
      });

      // Create a corresponding Class entity for the student
      await base44.entities.Class.create({
        name: classroom.name,
        color: 'blue',
        icon: 'BookOpen',
        shared_from_classroom: classroom.id,
        teacher_email: classroom.teacher_email
      });

      onSuccess?.();
      setJoinCode('');
      onClose();
    } catch (err) {
      console.error('Failed to join classroom:', err);
      setError('Failed to join classroom. Please try again.');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a Classroom</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-violet-50 rounded-lg">
            <Users className="w-5 h-5 text-violet-600" />
            <p className="text-sm text-gray-600">
              Enter the join code provided by your teacher to access their classroom
            </p>
          </div>

          <Input
            placeholder="Enter join code (e.g. ABC123)"
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase());
              setError('');
            }}
            maxLength={6}
            className="text-center text-lg font-mono tracking-wider"
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleJoin} 
              disabled={!joinCode.trim() || loading}
              className="flex-1"
            >
              {loading ? 'Joining...' : 'Join Classroom'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}