import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';

export default function GradeEntry({ document, onSave, onCancel }) {
  const [grade, setGrade] = useState(document?.grade || '');
  const [maxGrade, setMaxGrade] = useState(document?.max_grade || 100);
  const [dueDate, setDueDate] = useState(document?.due_date ? new Date(document.due_date) : null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Document.update(document.id, {
        grade: grade !== '' ? parseFloat(grade) : null,
        max_grade: parseFloat(maxGrade),
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null
      });
      onSave?.();
    } catch (err) {
      console.error('Failed to save grade:', err);
    }
    setSaving(false);
  };

  const percentage = grade !== '' && maxGrade ? Math.round((grade / maxGrade) * 100) : null;

  return (
    <Card className="p-4">
      <h4 className="font-semibold mb-4">Grade Entry</h4>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="grade">Score</Label>
            <Input
              id="grade"
              type="number"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="e.g., 85"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="maxGrade">Out of</Label>
            <Input
              id="maxGrade"
              type="number"
              value={maxGrade}
              onChange={(e) => setMaxGrade(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {percentage !== null && (
          <div className={`text-center py-2 rounded-lg ${
            percentage >= 90 ? 'bg-emerald-100 text-emerald-700' :
            percentage >= 70 ? 'bg-blue-100 text-blue-700' :
            percentage >= 60 ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            <span className="text-2xl font-bold">{percentage}%</span>
          </div>
        )}

        <div>
          <Label>Due Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full mt-1 justify-start">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {dueDate ? format(dueDate, 'PPP') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-violet-600 hover:bg-violet-700" 
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Grade
          </Button>
        </div>
      </div>
    </Card>
  );
}