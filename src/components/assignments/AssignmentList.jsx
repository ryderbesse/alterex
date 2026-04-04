import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardList, GraduationCap, Calendar, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AssignmentForm from './AssignmentForm';
import AssignmentCard from './AssignmentCard';

function GCIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#1A73E8"/>
      <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white" fontFamily="Arial">G</text>
    </svg>
  );
}

export default function AssignmentList({ classId, onSyncClick, onUploadSyllabus }) {
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments', classId],
    queryFn: () => base44.entities.Assignment.filter({ class_id: classId }, 'due_date'),
    enabled: !!classId
  });

  const { data: syncedAssignments = [] } = useQuery({
    queryKey: ['syncedAssignments', classId],
    queryFn: () => base44.entities.SyncedAssignment.filter({ class_folder_id: classId, archived: false, sync_active: true }, 'due_date'),
    enabled: !!classId
  });

  const handleSave = async (data) => {
    if (editingAssignment) {
      await base44.entities.Assignment.update(editingAssignment.id, data);
    } else {
      await base44.entities.Assignment.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['assignments', classId] });
    setShowForm(false);
    setEditingAssignment(null);
  };

  const handleToggleComplete = async (assignment) => {
    const newStatus = assignment.status === 'completed' ? 'not_started' : 'completed';
    await base44.entities.Assignment.update(assignment.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['assignments', classId] });
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setShowForm(true);
  };

  const handleDelete = async (assignment) => {
    await base44.entities.Assignment.delete(assignment.id);
    queryClient.invalidateQueries({ queryKey: ['assignments', classId] });
  };

  const handleToggleSyncedComplete = async (assignment) => {
    const newStatus = assignment.status === 'completed' ? 'not_started' : 'completed';
    await base44.entities.SyncedAssignment.update(assignment.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['syncedAssignments', classId] });
  };

  // Merge manual + synced assignments
  const allAssignments = [
    ...assignments,
    ...syncedAssignments.map(a => ({ ...a, _synced: true }))
  ].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date) - new Date(b.due_date);
  });

  const pendingAssignments = allAssignments.filter(a => a.status !== 'completed');
  const completedAssignments = allAssignments.filter(a => a.status === 'completed');

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Assignments
        </h3>
        <div className="flex flex-wrap gap-2">
          {onSyncClick && (
            <Button size="sm" variant="outline" onClick={onSyncClick} className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50">
              <GCIcon size={14} />
              Sync Assignments
            </Button>
          )}
          {onUploadSyllabus && (
            <Button size="sm" variant="outline" onClick={onUploadSyllabus} className="gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Upload Syllabus
            </Button>
          )}
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      </div>

      {showForm && (
        <AssignmentForm
          classId={classId}
          initialData={editingAssignment}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingAssignment(null);
          }}
        />
      )}

      {isLoading ? (
        <div className="text-center py-4 text-gray-500">Loading...</div>
      ) : assignments.length === 0 ? (
        <Card className="p-6 text-center">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No assignments yet</p>
          <p className="text-sm text-gray-400">Add assignments to track your upcoming work</p>
        </Card>
      ) : (
        <>
          {pendingAssignments.length > 0 && (
            <div className="space-y-2">
              {pendingAssignments.map((assignment) => (
                <div key={assignment.id} className="relative">
                  {assignment._synced && (
                    <Badge className="absolute -top-1.5 right-2 z-10 bg-blue-100 text-blue-700 text-[10px] gap-1 py-0 px-1.5">
                      <GraduationCap className="w-2.5 h-2.5" />
                      Google Classroom
                    </Badge>
                  )}
                  <AssignmentCard
                    assignment={assignment}
                    onToggleComplete={assignment._synced ? handleToggleSyncedComplete : handleToggleComplete}
                    onEdit={assignment._synced ? null : handleEdit}
                    onDelete={assignment._synced ? null : handleDelete}
                  />
                </div>
              ))}
            </div>
          )}

          {completedAssignments.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Completed ({completedAssignments.length})</p>
              <div className="space-y-2">
                {completedAssignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onToggleComplete={assignment._synced ? handleToggleSyncedComplete : handleToggleComplete}
                    onEdit={assignment._synced ? null : handleEdit}
                    onDelete={assignment._synced ? null : handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}