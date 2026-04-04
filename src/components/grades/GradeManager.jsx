import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Trophy, GraduationCap } from 'lucide-react';

export default function GradeManager({ classId, gradeWeights }) {
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [formData, setFormData] = useState({
    assignment_name: '',
    grade: '',
    max_grade: '100',
    date: new Date().toISOString().split('T')[0],
    category: 'homework'
  });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: grades = [], refetch } = useQuery({
    queryKey: ['classGrades', classId],
    queryFn: async () => {
      // Get grades from localStorage for this class
      const stored = localStorage.getItem(`grades_${classId}`);
      return stored ? JSON.parse(stored) : [];
    },
    enabled: !!classId
  });

  const saveGrades = (newGrades) => {
    localStorage.setItem(`grades_${classId}`, JSON.stringify(newGrades));
    refetch();
  };

  const handleSave = () => {
    if (!formData.assignment_name || !formData.grade) return;
    setSaving(true);

    const newGrade = {
      id: editingGrade?.id || Date.now().toString(),
      ...formData,
      grade: parseFloat(formData.grade),
      max_grade: parseFloat(formData.max_grade)
    };

    let newGrades;
    if (editingGrade) {
      newGrades = grades.map(g => g.id === editingGrade.id ? newGrade : g);
    } else {
      newGrades = [...grades, newGrade];
    }

    saveGrades(newGrades);
    setFormData({ assignment_name: '', grade: '', max_grade: '100', date: new Date().toISOString().split('T')[0], category: 'homework' });
    setEditingGrade(null);
    setShowAddGrade(false);
    setSaving(false);
  };

  const handleDelete = (id) => {
    const newGrades = grades.filter(g => g.id !== id);
    saveGrades(newGrades);
  };

  const handleEdit = (grade) => {
    setFormData({
      assignment_name: grade.assignment_name,
      grade: grade.grade.toString(),
      max_grade: grade.max_grade.toString(),
      date: grade.date,
      category: grade.category
    });
    setEditingGrade(grade);
    setShowAddGrade(true);
  };

  const calculateWeightedAverage = (weights) => {
    if (grades.length === 0) return null;
    
    // If no weights provided, fall back to simple average
    if (!weights || Object.keys(weights).length === 0) {
      const total = grades.reduce((sum, g) => sum + (g.grade / g.max_grade) * 100, 0);
      return (total / grades.length).toFixed(1);
    }

    // Group grades by category
    const categoryGrades = {};
    grades.forEach(g => {
      const cat = g.category || 'other';
      if (!categoryGrades[cat]) categoryGrades[cat] = [];
      categoryGrades[cat].push((g.grade / g.max_grade) * 100);
    });

    // Calculate weighted average
    let weightedSum = 0;
    let totalWeight = 0;

    Object.entries(categoryGrades).forEach(([category, catGrades]) => {
      const weight = weights[category] || 0;
      if (weight > 0 && catGrades.length > 0) {
        const categoryAvg = catGrades.reduce((sum, g) => sum + g, 0) / catGrades.length;
        weightedSum += categoryAvg * (weight / 100);
        totalWeight += weight;
      }
    });

    // If we have grades but no matching weights, fall back to simple average
    if (totalWeight === 0) {
      const total = grades.reduce((sum, g) => sum + (g.grade / g.max_grade) * 100, 0);
      return (total / grades.length).toFixed(1);
    }

    // Normalize if weights don't add to 100
    return ((weightedSum / totalWeight) * 100).toFixed(1);
  };

  const calculateAverage = () => {
    return calculateWeightedAverage(null);
  };

  const average = calculateWeightedAverage(gradeWeights);

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'text-emerald-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {average !== null && (
            <Card className="p-4 bg-gradient-to-br from-violet-50 to-purple-50">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-8 h-8 text-violet-600" />
                <div>
                  <p className="text-sm text-gray-500">Class Average</p>
                  <p className={`text-2xl font-bold ${getGradeColor(parseFloat(average))}`}>
                    {average}%
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
        <Button onClick={() => setShowAddGrade(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Grade
        </Button>
      </div>

      {grades.length === 0 ? (
        <Card className="p-8 text-center">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No grades yet</h3>
          <p className="text-gray-500 mb-4">
            Add your grades to track your progress in this class
          </p>
          <Button onClick={() => setShowAddGrade(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Grade
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {grades.sort((a, b) => new Date(b.date) - new Date(a.date)).map((grade) => {
            const percentage = (grade.grade / grade.max_grade) * 100;
            return (
              <Card key={grade.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{grade.assignment_name}</h4>
                      <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full capitalize">
                        {grade.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(grade.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-xl font-bold ${getGradeColor(percentage)}`}>
                        {grade.grade}/{grade.max_grade}
                      </p>
                      <p className="text-sm text-gray-500">{percentage.toFixed(0)}%</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(grade)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(grade.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showAddGrade} onOpenChange={(open) => {
        setShowAddGrade(open);
        if (!open) {
          setEditingGrade(null);
          setFormData({ assignment_name: '', grade: '', max_grade: '100', date: new Date().toISOString().split('T')[0], category: 'homework' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGrade ? 'Edit Grade' : 'Add Grade'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Assignment Name</Label>
              <Input
                value={formData.assignment_name}
                onChange={(e) => setFormData({ ...formData, assignment_name: e.target.value })}
                placeholder="e.g., Chapter 5 Quiz"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Score</Label>
                <Input
                  type="number"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="85"
                />
              </div>
              <div>
                <Label>Max Score</Label>
                <Input
                  type="number"
                  value={formData.max_grade}
                  onChange={(e) => setFormData({ ...formData, max_grade: e.target.value })}
                  placeholder="100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Category</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="homework">Homework</option>
                  <option value="quiz">Quiz</option>
                  <option value="test">Test</option>
                  <option value="project">Project</option>
                  <option value="participation">Participation</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddGrade(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleSave}
                disabled={!formData.assignment_name || !formData.grade || saving}
              >
                {editingGrade ? 'Update' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}