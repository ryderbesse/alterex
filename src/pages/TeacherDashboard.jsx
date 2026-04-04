import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Users, Plus, BookOpen, ClipboardList, BarChart3, 
  Trash2, UserPlus, UserMinus, Gamepad2, FileText,
  PieChart, Eye, Headphones, Hand, PenLine, Brain
} from 'lucide-react';
import { motion } from 'framer-motion';

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

export default function TeacherDashboard() {
  const [user, setUser] = useState(null);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [newClassData, setNewClassData] = useState({ name: '', description: '', subject: '' });
  const [studentEmail, setStudentEmail] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: classrooms = [], refetch: refetchClassrooms } = useQuery({
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
    refetchClassrooms();
  };

  const handleAddStudent = async () => {
    if (!selectedClassroom || !studentEmail) return;
    
    const updatedEmails = [...(selectedClassroom.student_emails || []), studentEmail];
    await base44.entities.Classroom.update(selectedClassroom.id, {
      student_emails: updatedEmails
    });
    setStudentEmail('');
    setShowAddStudent(false);
    refetchClassrooms();
  };

  const handleRemoveStudent = async (classroom, email) => {
    const updatedEmails = (classroom.student_emails || []).filter(e => e !== email);
    await base44.entities.Classroom.update(classroom.id, {
      student_emails: updatedEmails
    });
    refetchClassrooms();
  };

  const handleDeleteClassroom = async (classroom) => {
    await base44.entities.Classroom.delete(classroom.id);
    refetchClassrooms();
  };

  // Calculate learning style distribution for a classroom
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
            <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
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
          <div className="space-y-6">
            {classrooms.map((classroom) => {
              const styleStats = getLearningStyleStats(classroom);
              const totalStudents = (classroom.student_emails || []).length;
              
              return (
                <Card key={classroom.id} className="overflow-hidden">
                  <div className="p-6 border-b">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold">{classroom.name}</h2>
                        <p className="text-gray-500">{classroom.subject}</p>
                        <Badge variant="outline" className="mt-2">
                          Join Code: {classroom.join_code}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedClassroom(classroom); setShowAddStudent(true); }}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Add Student
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDeleteClassroom(classroom)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Tabs defaultValue="students" className="p-4">
                    <TabsList>
                      <TabsTrigger value="students">
                        <Users className="w-4 h-4 mr-1" />
                        Students ({totalStudents})
                      </TabsTrigger>
                      <TabsTrigger value="analytics">
                        <PieChart className="w-4 h-4 mr-1" />
                        Learning Styles
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="students" className="mt-4">
                      {totalStudents === 0 ? (
                        <p className="text-gray-500 text-center py-4">No students added yet</p>
                      ) : (
                        <div className="space-y-2">
                          {(classroom.student_emails || []).map((email, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span>{email}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500"
                                onClick={() => handleRemoveStudent(classroom, email)}
                              >
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="analytics" className="mt-4">
                      {Object.keys(styleStats).length === 0 ? (
                        <p className="text-gray-500 text-center py-4">
                          No learning style data yet. Students need to complete the Learning Coach quiz.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-sm text-gray-500">
                            Understanding your students' learning styles can help you plan more effective lessons.
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(styleStats).map(([style, count]) => {
                              const Icon = styleIcons[style] || Brain;
                              const percentage = Math.round((count / totalStudents) * 100);
                              return (
                                <Card key={style} className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                                      style={{ backgroundColor: styleColors[style] + '20' }}
                                    >
                                      <Icon className="w-5 h-5" style={{ color: styleColors[style] }} />
                                    </div>
                                    <div>
                                      <p className="font-semibold capitalize">{style.replace('_', '/')}</p>
                                      <p className="text-sm text-gray-500">{count} students ({percentage}%)</p>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Classroom Dialog */}
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

      {/* Add Student Dialog */}
      <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student to {selectedClassroom?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Student email"
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
            />
            <Button 
              className="w-full" 
              onClick={handleAddStudent}
              disabled={!studentEmail}
            >
              Add Student
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}