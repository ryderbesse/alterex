import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, FolderPlus, Upload, Book, FlaskConical, Monitor, Calculator, Palette, Music, Globe, Atom, PenTool, Languages, History, Heart, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const colorOptions = [
  { id: 'violet', class: 'bg-violet-500' },
  { id: 'blue', class: 'bg-blue-500' },
  { id: 'emerald', class: 'bg-emerald-500' },
  { id: 'amber', class: 'bg-amber-500' },
  { id: 'rose', class: 'bg-rose-500' },
  { id: 'indigo', class: 'bg-indigo-500' },
  { id: 'cyan', class: 'bg-cyan-500' },
  { id: 'pink', class: 'bg-pink-500' },
  { id: 'orange', class: 'bg-orange-500' },
  { id: 'teal', class: 'bg-teal-500' },
  { id: 'purple', class: 'bg-purple-500' },
  { id: 'red', class: 'bg-red-500' }
];

const gradientOptions = [
  { id: 'violet-purple', class: 'bg-gradient-to-br from-violet-500 to-purple-600' },
  { id: 'blue-cyan', class: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
  { id: 'emerald-teal', class: 'bg-gradient-to-br from-emerald-500 to-teal-500' },
  { id: 'amber-orange', class: 'bg-gradient-to-br from-amber-500 to-orange-500' },
  { id: 'rose-pink', class: 'bg-gradient-to-br from-rose-500 to-pink-500' },
  { id: 'indigo-blue', class: 'bg-gradient-to-br from-indigo-500 to-blue-600' },
  { id: 'pink-purple', class: 'bg-gradient-to-br from-pink-500 to-purple-500' },
  { id: 'cyan-blue', class: 'bg-gradient-to-br from-cyan-500 to-blue-500' },
  { id: 'orange-red', class: 'bg-gradient-to-br from-orange-500 to-red-500' },
  { id: 'teal-emerald', class: 'bg-gradient-to-br from-teal-500 to-emerald-500' },
  { id: 'purple-indigo', class: 'bg-gradient-to-br from-purple-500 to-indigo-600' },
  { id: 'red-rose', class: 'bg-gradient-to-br from-red-500 to-rose-500' }
];

const patternIcons = [
  { id: 'none', label: 'None', icon: null },
  { id: 'book', label: 'Books', icon: Book },
  { id: 'flask', label: 'Science', icon: FlaskConical },
  { id: 'monitor', label: 'Computer', icon: Monitor },
  { id: 'calculator', label: 'Math', icon: Calculator },
  { id: 'palette', label: 'Art', icon: Palette },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'globe', label: 'Geography', icon: Globe },
  { id: 'atom', label: 'Physics', icon: Atom },
  { id: 'pen', label: 'Writing', icon: PenTool },
  { id: 'languages', label: 'Languages', icon: Languages },
  { id: 'history', label: 'History', icon: History },
  { id: 'health', label: 'Health', icon: Heart }
];

const defaultWeights = {
  homework: 20,
  quiz: 15,
  test: 30,
  project: 20,
  participation: 10,
  essay: 0,
  other: 5
};

export default function CreateClassModal({ onClose, onCreate, editMode = false, existingClass = null }) {
  const [mode, setMode] = useState('create');
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState(existingClass?.name || '');
  const [color, setColor] = useState(existingClass?.color || 'violet');
  const [backgroundPattern, setBackgroundPattern] = useState(existingClass?.background_pattern || 'none');
  const [backgroundImage, setBackgroundImage] = useState(existingClass?.background_image || '');
  const [backgroundType, setBackgroundType] = useState(
    existingClass?.background_image ? 'image' : 
    existingClass?.color?.includes('-') ? 'gradient' : 'color'
  );
  const [gradesEnabled, setGradesEnabled] = useState(existingClass?.grades_enabled || false);
  const [targetGrade, setTargetGrade] = useState(existingClass?.target_grade || 90);
  const [gradeWeights, setGradeWeights] = useState(existingClass?.grade_weights || defaultWeights);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBackgroundImage(file_url);
      setBackgroundType('image');
    } catch (err) {
      console.error('Failed to upload image:', err);
    }
    setUploading(false);
  };

  const handleWeightChange = (category, value) => {
    setGradeWeights(prev => ({
      ...prev,
      [category]: parseInt(value) || 0
    }));
  };

  const getTotalWeight = () => {
    return Object.values(gradeWeights).reduce((sum, w) => sum + w, 0);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    setCreating(true);
    try {
      const classData = {
        name: name.trim(),
        color,
        background_pattern: backgroundPattern !== 'none' ? backgroundPattern : null,
        background_image: backgroundType === 'image' ? backgroundImage : null,
        grades_enabled: gradesEnabled,
        target_grade: gradesEnabled ? targetGrade : null,
        grade_weights: gradesEnabled ? gradeWeights : null
      };

      if (editMode && existingClass) {
        await base44.entities.Class.update(existingClass.id, classData);
      } else {
        await base44.entities.Class.create(classData);
      }
      onCreate?.();
      onClose();
    } catch (err) {
      console.error('Failed to save class:', err);
    }
    setCreating(false);
  };

  const handleJoinClass = async () => {
    if (!joinCode) return;

    try {
      const classrooms = await base44.entities.Classroom.filter({ join_code: joinCode.toUpperCase() });
      if (classrooms.length === 0) {
        toast.error('Invalid join code');
        return;
      }

      const classroom = classrooms[0];
      await base44.entities.Class.create({
        name: classroom.name,
        color: 'violet',
        icon: '📚'
      });

      toast.success(`Joined ${classroom.name}!`);
      onCreate?.();
      onClose();
    } catch (err) {
      console.error('Failed to join class:', err);
      toast.error('Failed to join class');
    }
  };

  if (!editMode && mode === 'join') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Join Existing Class</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button variant="outline" className="flex-1" onClick={() => setMode('create')}>
                Create New
              </Button>
              <Button className="flex-1 bg-violet-600">Join with Code</Button>
            </div>
            <div>
              <Label>Classroom Join Code</Label>
              <Input
                placeholder="Enter 6-digit code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-lg tracking-wider mt-1"
              />
            </div>
            <Button 
              className="w-full bg-violet-600 hover:bg-violet-700" 
              onClick={handleJoinClass}
              disabled={joinCode.length !== 6}
            >
              <Users className="w-4 h-4 mr-2" />
              Join Classroom
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-lg p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{editMode ? 'Edit Class' : 'Create New Class'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {!editMode && (
          <div className="flex gap-2 mb-4">
            <Button 
              variant={mode === 'create' ? 'default' : 'outline'} 
              className="flex-1"
              onClick={() => setMode('create')}
            >
              Create New
            </Button>
            <Button 
              variant={mode === 'join' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setMode('join')}
            >
              Join with Code
            </Button>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <Label htmlFor="name">Class Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Biology 101"
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <Label>Background Style</Label>
            <Tabs value={backgroundType} onValueChange={setBackgroundType} className="mt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="color">Solid</TabsTrigger>
                <TabsTrigger value="gradient">Gradient</TabsTrigger>
                <TabsTrigger value="image">Image</TabsTrigger>
              </TabsList>
              
              <TabsContent value="color" className="mt-3">
                <div className="grid grid-cols-6 gap-2">
                  {colorOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setColor(opt.id)}
                      className={`w-10 h-10 rounded-xl ${opt.class} transition-all ${
                        color === opt.id && backgroundType === 'color' ? 'ring-2 ring-offset-2 ring-violet-500 scale-110' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="gradient" className="mt-3">
                <div className="grid grid-cols-4 gap-2">
                  {gradientOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setColor(opt.id)}
                      className={`w-full h-10 rounded-xl ${opt.class} transition-all ${
                        color === opt.id && backgroundType === 'gradient' ? 'ring-2 ring-offset-2 ring-violet-500 scale-105' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="image" className="mt-3">
                <div className="space-y-3">
                  {backgroundImage ? (
                    <div className="relative">
                      <img 
                        src={backgroundImage} 
                        alt="Background preview" 
                        className="w-full h-32 object-cover rounded-xl"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setBackgroundImage('')}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">
                        {uploading ? 'Uploading...' : 'Click to upload image'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <Label>Background Pattern (Optional)</Label>
            <div className="grid grid-cols-7 gap-2 mt-2">
              {patternIcons.map((pattern) => (
                <button
                  key={pattern.id}
                  onClick={() => setBackgroundPattern(pattern.id)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all border ${
                    backgroundPattern === pattern.id 
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30' 
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }`}
                  title={pattern.label}
                >
                  {pattern.icon ? <pattern.icon className="w-5 h-5" /> : <X className="w-4 h-4 text-gray-400" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div>
              <p className="font-medium">Enable Grades</p>
              <p className="text-sm text-gray-500">Track grades for assignments</p>
            </div>
            <Switch
              checked={gradesEnabled}
              onCheckedChange={setGradesEnabled}
            />
          </div>

          {gradesEnabled && (
            <>
              <div>
                <Label htmlFor="targetGrade">Target Grade (%)</Label>
                <Input
                  id="targetGrade"
                  type="number"
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(parseInt(e.target.value) || 0)}
                  min={0}
                  max={100}
                  className="mt-1"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Grade Weights</Label>
                  <span className={`text-sm font-medium ${getTotalWeight() === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    Total: {getTotalWeight()}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'homework', label: 'Homework' },
                    { key: 'quiz', label: 'Quizzes' },
                    { key: 'test', label: 'Tests' },
                    { key: 'project', label: 'Projects' },
                    { key: 'participation', label: 'Participation' },
                    { key: 'essay', label: 'Essays' },
                    { key: 'other', label: 'Other' }
                  ].map((cat) => (
                    <div key={cat.key} className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={gradeWeights[cat.key]}
                        onChange={(e) => handleWeightChange(cat.key, e.target.value)}
                        min={0}
                        max={100}
                        className="w-16 h-8 text-sm"
                      />
                      <span className="text-sm">% {cat.label}</span>
                    </div>
                  ))}
                </div>
                {getTotalWeight() !== 100 && (
                  <p className="text-xs text-amber-600 mt-2">
                    Weights should add up to 100% for accurate grade calculation
                  </p>
                )}
              </div>
            </>
          )}

          <Button 
            className="w-full bg-violet-600 hover:bg-violet-700"
            onClick={handleCreate}
            disabled={!name.trim() || creating}
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            {editMode ? 'Save Changes' : 'Create Class'}
          </Button>
        </div>
      </Card>
    </div>
  );
}