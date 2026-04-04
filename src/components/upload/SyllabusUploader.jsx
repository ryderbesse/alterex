import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Upload, FileText, Calendar, CheckCircle2, AlertCircle, Loader2, Trash2, Edit2 } from 'lucide-react';

export default function SyllabusUploader({ classId, onComplete, onClose }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editData, setEditData] = useState({});

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      toast.error('Please select a PDF file');
    }
  };

  const handleUploadAndParse = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setUploading(false);
      setParsing(true);

      // Parse the PDF using LLM
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a syllabus parser. Extract all assignments, exams, quizzes, and projects from this syllabus PDF.

For each assignment, extract:
- Title (e.g., "Midterm Exam", "Chapter 3 Homework", "Final Project")
- Due date (MUST be in YYYY-MM-DD format, e.g., "2026-09-14". This is a LOCAL DATE with no time or timezone. Preserve the exact calendar date shown in the document.)
- Type (homework, quiz, test, project, essay, or other)
- Description (brief summary if available)
- Estimated time in minutes (make a reasonable estimate based on the assignment type)

CRITICAL: For dates, use the exact calendar date from the PDF. If the syllabus says "September 14", you must return "2026-09-14" (or the appropriate year). Do not add any time or timezone information.

If you find dates but they're not clear which year, assume the current or next academic year (2026 or 2027).

Return the assignments in a structured format. If no assignments are found, return an empty array.`,
        file_urls: [file_url],
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            assignments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  due_date: { type: "string" },
                  type: { type: "string" },
                  description: { type: "string" },
                  estimated_time: { type: "number" }
                }
              }
            }
          }
        }
      });

      setParsing(false);

      if (result.assignments && result.assignments.length > 0) {
        setAssignments(result.assignments);
        setShowReview(true);
      } else {
        toast.error('No assignments were found in this syllabus. Please check the file or add assignments manually.');
        setFile(null);
      }
    } catch (err) {
      console.error('Failed to process syllabus:', err);
      toast.error('Failed to process syllabus');
      setUploading(false);
      setParsing(false);
    }
  };

  const handleCreateAssignments = async () => {
    try {
      const user = await base44.auth.me();
      
      // Get existing assignments for this class
      const existingAssignments = await base44.entities.Assignment.filter({ 
        class_id: classId,
        created_by: user.email
      });
      
      let created = 0;
      let skipped = 0;
      
      // Create assignments, checking for duplicates
      for (const assignment of assignments) {
        // Ensure the due date is in YYYY-MM-DD format (no time component, no timezone)
        // Extract only the date part if there's any time component
        let normalizedDate = assignment.due_date;
        if (normalizedDate.includes('T')) {
          normalizedDate = normalizedDate.split('T')[0];
        }
        // Remove any trailing Z or timezone info
        normalizedDate = normalizedDate.replace(/[TZ].*$/, '');
        
        // Validate format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
          console.warn(`Invalid date format: ${assignment.due_date}, skipping`);
          skipped++;
          continue;
        }
        
        // Check if assignment with same title and date already exists
        const isDuplicate = existingAssignments.some(existing => {
          let existingDate = existing.due_date;
          if (existingDate.includes('T')) {
            existingDate = existingDate.split('T')[0];
          }
          existingDate = existingDate.replace(/[TZ].*$/, '');
          return existing.title.toLowerCase().trim() === assignment.title.toLowerCase().trim() && 
                 existingDate === normalizedDate;
        });
        
        if (!isDuplicate) {
          // CRITICAL: Store the date as a plain string (YYYY-MM-DD) with no time or timezone
          // This prevents any timezone conversion during save
          await base44.entities.Assignment.create({
            class_id: classId,
            title: assignment.title,
            description: assignment.description || 'From uploaded syllabus',
            due_date: String(normalizedDate), // Ensure it's a string, not a Date object
            type: assignment.type || 'other',
            estimated_time: assignment.estimated_time || 60,
            status: 'not_started',
            notes: 'Source: Uploaded Syllabus',
            created_by: user.email
          });
          created++;
        } else {
          skipped++;
        }
      }

      if (created > 0) {
        toast.success(`${created} assignment${created !== 1 ? 's' : ''} created${skipped > 0 ? ` (${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped)` : ''}`);
      } else if (skipped > 0) {
        toast.info(`All ${skipped} assignments already exist`);
      }
      
      onComplete();
      onClose();
    } catch (err) {
      console.error('Failed to create assignments:', err);
      toast.error('Failed to create assignments');
    }
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditData(assignments[index]);
  };

  const handleSaveEdit = () => {
    const updated = [...assignments];
    updated[editingIndex] = editData;
    setAssignments(updated);
    setEditingIndex(null);
    setEditData({});
  };

  const handleDelete = (index) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  if (showReview) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Assignments</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <p className="text-sm">
                Found {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} in the syllabus. Review and edit before creating.
              </p>
            </div>

            <div className="space-y-3">
              {assignments.map((assignment, index) => (
                <Card key={index} className="p-4">
                  {editingIndex === index ? (
                    <div className="space-y-3">
                      <Input
                        value={editData.title}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        placeholder="Assignment title"
                      />
                      <Input
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        placeholder="Description"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          type="date"
                          value={editData.due_date}
                          onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                        />
                        <Select 
                          value={editData.type} 
                          onValueChange={(value) => setEditData({ ...editData, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
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
                        <Input
                          type="number"
                          value={editData.estimated_time}
                          onChange={(e) => setEditData({ ...editData, estimated_time: parseInt(e.target.value) })}
                          placeholder="Minutes"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingIndex(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{assignment.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{assignment.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {assignment.due_date}
                          </span>
                          <span className="capitalize">{assignment.type}</span>
                          <span>{assignment.estimated_time} min</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(index)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(index)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                className="flex-1" 
                onClick={handleCreateAssignments}
                disabled={assignments.length === 0}
              >
                Create {assignments.length} Assignment{assignments.length !== 1 ? 's' : ''}
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Syllabus</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">How it works:</p>
              <ul className="mt-2 space-y-1 text-blue-800 dark:text-blue-200">
                <li>• Upload your syllabus PDF</li>
                <li>• We'll extract assignments and due dates</li>
                <li>• Review and edit before adding to calendar</li>
              </ul>
            </div>
          </div>

          {!file ? (
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mb-3" />
              <span className="text-sm font-medium">Click to upload PDF</span>
              <span className="text-xs text-gray-500 mt-1">Syllabus or course schedule</span>
              <input 
                type="file" 
                accept="application/pdf" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setFile(null)}
                  disabled={uploading || parsing}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {(uploading || parsing) && (
            <div className="flex items-center gap-3 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
              <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
              <div className="text-sm">
                <p className="font-medium text-violet-900 dark:text-violet-100">
                  {uploading ? 'Uploading file...' : 'Parsing syllabus...'}
                </p>
                <p className="text-violet-700 dark:text-violet-300 text-xs mt-1">
                  {parsing && 'This may take a moment'}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              className="flex-1" 
              onClick={handleUploadAndParse}
              disabled={!file || uploading || parsing}
            >
              {uploading || parsing ? 'Processing...' : 'Parse Syllabus'}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={uploading || parsing}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}