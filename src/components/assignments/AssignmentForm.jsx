import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function AssignmentForm({ classId, onSave, onCancel, initialData = null }) {
  const [formData, setFormData] = useState(initialData || {
    title: '',
    description: '',
    due_date: '',
    due_time: '',
    type: 'homework',
    priority: 'medium',
    estimated_time: 30,
    status: 'not_started'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.due_date) return;
    
    setSaving(true);
    await onSave({ ...formData, class_id: classId });
    setSaving(false);
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{initialData ? 'Edit Assignment' : 'New Assignment'}</h3>
          <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <Input
          placeholder="Assignment title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />

        <Textarea
          placeholder="Description (optional)"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />

        <div className="grid grid-cols-2 gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {formData.due_date ? format(new Date(formData.due_date), 'MMM d, yyyy') : 'Due date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.due_date ? new Date(formData.due_date + 'T12:00:00') : undefined}
                onSelect={(date) => {
                  if (date) {
                    // Add one day to fix calendar showing previous day
                    const adjustedDate = new Date(date);
                    adjustedDate.setDate(adjustedDate.getDate() + 1);
                    const year = adjustedDate.getFullYear();
                    const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(adjustedDate.getDate()).padStart(2, '0');
                    setFormData({ ...formData, due_date: `${year}-${month}-${day}` });
                  }
                }}
              />
            </PopoverContent>
          </Popover>

          <Input
            type="time"
            value={formData.due_time}
            onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
            placeholder="Time"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="homework">Homework</SelectItem>
              <SelectItem value="quiz">Quiz</SelectItem>
              <SelectItem value="test">Test</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="essay">Essay</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low Priority</SelectItem>
              <SelectItem value="medium">Medium Priority</SelectItem>
              <SelectItem value="high">High Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm text-gray-500 mb-1 block">Estimated time (minutes)</label>
          <Input
            type="number"
            value={formData.estimated_time}
            onChange={(e) => setFormData({ ...formData, estimated_time: parseInt(e.target.value) || 0 })}
            min={0}
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !formData.title || !formData.due_date} className="flex-1">
            {saving ? 'Saving...' : 'Save Assignment'}
          </Button>
        </div>
      </form>
    </Card>
  );
}