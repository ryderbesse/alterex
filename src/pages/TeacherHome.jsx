import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Users, Plus, BookOpen, Eye, Headphones, Hand, PenLine, Brain,
  PieChart, UserPlus, Trash2, ChevronRight, Book, FlaskConical, Monitor, 
  Calculator, Palette, Music, Globe, Atom, PenTool, Languages, History, Heart
} from 'lucide-react';
import { motion } from 'framer-motion';

const patternIconMap = {
  book: Book,
  flask: FlaskConical,
  monitor: Monitor,
  calculator: Calculator,
  palette: Palette,
  music: Music,
  globe: Globe,
  atom: Atom,
  pen: PenTool,
  languages: Languages,
  history: History,
  health: Heart
};

const colorMap = {
  violet: 'from-violet-500 to-purple-600',
  blue: 'from-blue-500 to-indigo-600',
  emerald: 'from-emerald-500 to-teal-600',
  green: 'from-green-500 to-emerald-600',
  amber: 'from-amber-500 to-orange-600',
  rose: 'from-rose-500 to-pink-600',
  red: 'from-red-500 to-rose-600',
  indigo: 'from-indigo-500 to-blue-600',
  cyan: 'from-cyan-500 to-blue-500',
  pink: 'from-pink-500 to-rose-500',
  teal: 'from-teal-500 to-cyan-500',
  purple: 'from-purple-500 to-indigo-600',
  orange: 'from-orange-500 to-red-500',
  'violet-purple': 'from-violet-500 to-purple-600',
  'blue-cyan': 'from-blue-500 to-cyan-500',
  'emerald-teal': 'from-emerald-500 to-teal-500',
  'amber-orange': 'from-amber-500 to-orange-500',
  'rose-pink': 'from-rose-500 to-pink-500',
  'indigo-blue': 'from-indigo-500 to-blue-600',
  'pink-purple': 'from-pink-500 to-purple-500',
  'cyan-blue': 'from-cyan-500 to-blue-500',
  'orange-red': 'from-orange-500 to-red-500',
  'teal-emerald': 'from-teal-500 to-emerald-500',
  'purple-indigo': 'from-purple-500 to-indigo-600',
  'red-rose': 'from-red-500 to-rose-500',
};

const styleIcons = {
  visual: Eye,
  auditory: Headphones,
  kinesthetic: Hand,
  reading_writing: PenLine,
  logical: Brain,
  social: Users
};

const styleColors = {
  visual: '#3B82F6',
  auditory: '#8B5CF6',
  kinesthetic: '#F97316',
  reading_writing: '#10B981',
  logical: '#06B6D4',
  social: '#EC4899'
};

export default function TeacherHome() {
  const [user, setUser] = useState(null);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [newClassData, setNewClassData] = useState({ name: '', description: '', subject: '' });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: classrooms = [] } = useQuery({
    queryKey: ['teacherClassrooms'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Classroom.filter({ teacher_email: user.email });
    },
    enabled: !!user?.email
  });

  const { data: studentProfiles = [] } = useQuery({
    queryKey: ['studentProfiles'],
    queryFn: () => base44.entities.UserProfile.filter({ user_type: 'student' })
  });

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateClassroom = async () => {
    await base44.entities.Classroom.create({
      ...newClassData,
      teacher_email: user.email,
      teacher_id: user.id,
      student_emails: [],
      join_code: generateJoinCode()
    });
    setShowCreateClass(false);
    setNewClassData({ name: '', description: '', subject: '' });
    queryClient.invalidateQueries({ queryKey: ['teacherClassrooms'] });
  };

  const getLearningStyleStats = (classroom) => {
    const studentEmails = classroom.student_emails || [];
    const styles = {};
    
    studentProfiles
      .filter(p => studentEmails.includes(p.created_by))
      .forEach(p => {
        if (p.learning_style) {
          styles[p.learning_style] = (styles[p.learning_style] || 0) + 1;
        }
      });
    
    return styles;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Classrooms</h1>
            <p className="text-gray-500">Welcome back, {user?.full_name || 'Teacher'}</p>
          </div>
          <Button onClick={() => setShowCreateClass(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Classroom
          </Button>
        </div>

        {classrooms.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No classrooms yet</h3>
            <p className="text-gray-500 mb-4">Create your first classroom to start managing students</p>
            <Button onClick={() => setShowCreateClass(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Classroom
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {classrooms.map((classroom) => {
              const styleStats = getLearningStyleStats(classroom);
              const totalStudents = (classroom.student_emails || []).length;
              const dominantStyle = Object.entries(styleStats).sort((a, b) => b[1] - a[1])[0];
              const gradientClass = colorMap[classroom.color] || 'from-emerald-500 to-teal-600';
              const PatternIcon = classroom.background_pattern ? patternIconMap[classroom.background_pattern] : null;
              
              return (
                <Link key={classroom.id} to={createPageUrl(`TeacherClassDetail?id=${classroom.id}`)}>
                  <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group h-full">
                    {classroom.background_image ? (
                      <div className="h-24 relative p-4 flex items-end">
                        <img 
                          src={classroom.background_image} 
                          alt="" 
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="relative w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                          {PatternIcon ? (
                            <PatternIcon className="w-5 h-5 text-white" />
                          ) : (
                            <BookOpen className="w-5 h-5 text-white" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={`h-24 bg-gradient-to-br ${gradientClass} p-4 flex items-end`}>
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                          {PatternIcon ? (
                            <PatternIcon className="w-5 h-5 text-white" />
                          ) : (
                            <BookOpen className="w-5 h-5 text-white" />
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{classroom.name}</h3>
                          <p className="text-sm text-gray-500">{classroom.subject}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{totalStudents} students</span>
                        </div>
                        {dominantStyle && (
                          <Badge variant="outline" className="text-xs">
                            {dominantStyle[0].replace('_', '/')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showCreateClass} onOpenChange={setShowCreateClass}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Classroom</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Classroom name"
              value={newClassData.name}
              onChange={(e) => setNewClassData({ ...newClassData, name: e.target.value })}
            />
            <Input
              placeholder="Subject"
              value={newClassData.subject}
              onChange={(e) => setNewClassData({ ...newClassData, subject: e.target.value })}
            />
            <Textarea
              placeholder="Description (optional)"
              value={newClassData.description}
              onChange={(e) => setNewClassData({ ...newClassData, description: e.target.value })}
            />
            <Button 
              className="w-full" 
              onClick={handleCreateClassroom}
              disabled={!newClassData.name}
            >
              Create Classroom
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}