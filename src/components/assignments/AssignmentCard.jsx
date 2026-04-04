import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar, Clock, AlertTriangle, CheckCircle2, 
  FileText, BookOpen, GraduationCap, Pencil, Trash2 
} from 'lucide-react';
import { format, differenceInDays, differenceInHours, isPast } from 'date-fns';

const typeIcons = {
  homework: FileText,
  quiz: BookOpen,
  test: GraduationCap,
  project: Pencil,
  essay: FileText,
  other: FileText
};

const priorityColors = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700'
};

export default function AssignmentCard({ assignment, onToggleComplete, onEdit, onDelete, showClass = false, className = '' }) {
  const Icon = typeIcons[assignment.type] || FileText;
  
  // CRITICAL: Parse date as local date to prevent timezone shifting
  // If due_date is "2026-09-14", we want September 14, not September 13
  const [year, month, day] = assignment.due_date.split('T')[0].split('-').map(Number);
  const dueDate = new Date(year, month - 1, day); // Month is 0-indexed
  
  const now = new Date();
  const daysUntilDue = differenceInDays(dueDate, now);
  const hoursUntilDue = differenceInHours(dueDate, now);
  const isOverdue = isPast(dueDate) && assignment.status !== 'completed';
  const isDueSoon = daysUntilDue <= 2 && daysUntilDue >= 0;

  const getUrgencyText = () => {
    if (assignment.status === 'completed') return null;
    if (isOverdue) return { text: 'Overdue!', color: 'text-red-600' };
    if (hoursUntilDue <= 24) return { text: `Due in ${hoursUntilDue}h`, color: 'text-red-500' };
    if (daysUntilDue <= 2) return { text: `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`, color: 'text-amber-500' };
    return null;
  };

  const urgency = getUrgencyText();

  return (
    <Card className={`p-4 ${assignment.status === 'completed' ? 'opacity-60' : ''} ${isOverdue ? 'border-red-200 bg-red-50/50' : isDueSoon ? 'border-amber-200 bg-amber-50/50' : ''} ${className}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={assignment.status === 'completed'}
          onCheckedChange={() => onToggleComplete(assignment)}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-gray-400" />
              <h4 className={`font-medium ${assignment.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                {assignment.title}
              </h4>
            </div>
            <Badge className={priorityColors[assignment.priority]}>
              {assignment.priority}
            </Badge>
          </div>

          {assignment.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{assignment.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
            <span className="flex items-center gap-1 text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              {format(dueDate, 'MMM d, yyyy')}
              {assignment.due_time && ` at ${assignment.due_time}`}
            </span>
            
            {assignment.estimated_time > 0 && (
              <span className="flex items-center gap-1 text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                {assignment.estimated_time} min
              </span>
            )}

            {urgency && (
              <span className={`flex items-center gap-1 font-medium ${urgency.color}`}>
                <AlertTriangle className="w-3.5 h-3.5" />
                {urgency.text}
              </span>
            )}

            {assignment.status === 'completed' && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(assignment)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => onDelete(assignment)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}