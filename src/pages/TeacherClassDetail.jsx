import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Eye, Headphones, Hand, PenLine, Brain, PieChart,
  UserPlus, UserMinus, ClipboardList, Trophy, BookOpen, Plus, Calendar, Clock,
  Settings, Trash2, Edit2, AlertTriangle
} from 'lucide-react';
import BackButton from '@/components/common/BackButton';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import EditClassModal from '@/components/classes/EditClassModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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

export default function TeacherClassDetail() {
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [showEditClass, setShowEditClass] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingStudentEmail, setEditingStudentEmail] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [assignmentData, setAssignmentData] = useState({
    title: '',
    description: '',
    due_date: '',
    due_time: '',
    type: 'homework',
    estimated_time: 60
  });
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const classroomId = urlParams.get('id');

  const { data: classroom } = useQuery({
    queryKey: ['classroom', classroomId],
    queryFn: async () => {
      const rooms = await base44.entities.Classroom.filter({ id: classroomId });
      return rooms[0];
    },
    enabled: !!classroomId
  });

  const { data: studentProfiles = [] } = useQuery({
    queryKey: ['studentProfiles'],
    queryFn: () => base44.entities.UserProfile.filter({ user_type: 'student' })
  });

  const { data: classroomAssignments = [] } = useQuery({
    queryKey: ['classroomAssignments', classroomId],
    queryFn: async () => {
      if (!classroomId) return [];
      return base44.entities.ClassroomAssignment.filter({ classroom_id: classroomId }, '-due_date');
    },
    enabled: !!classroomId
  });

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['allAssignments'],
    queryFn: () => base44.entities.Assignment.list()
  });

  const { data: allClasses = [] } = useQuery({
    queryKey: ['allClasses'],
    queryFn: () => base44.entities.Class.list()
  });

  const handleAddStudent = async () => {
    if (!classroom || !studentEmail) return;
    
    const updatedEmails = [...(classroom.student_emails || []), studentEmail];
    await base44.entities.Classroom.update(classroom.id, {
      student_emails: updatedEmails
    });

    // Send email to student
    try {
      const joinLink = `${window.location.origin}${createPageUrl('Home')}?joinClass=${classroom.join_code}`;
      await base44.integrations.Core.SendEmail({
        to: studentEmail,
        subject: `You've Been Added to ${classroom.name}`,
        body: `Hello!

You've been added to the classroom "${classroom.name}" for ${classroom.subject}.

Click the link below to access your new class and view assignments:
${joinLink}

Join Code: ${classroom.join_code}

If the link doesn't work, you can manually enter the join code in the Alterex app to add the class to your homepage.

Best regards,
The Alterex Team`
      });
      toast.success(`Student added and email sent to ${studentEmail}`);
    } catch (err) {
      console.error('Failed to send email:', err);
      toast.error('Student added but failed to send email');
    }

    setStudentEmail('');
    setShowAddStudent(false);
    queryClient.invalidateQueries({ queryKey: ['classroom'] });
  };

  const handleAddAssignment = async () => {
    if (!classroom || !assignmentData.title || !assignmentData.due_date) return;

    try {
      // Create classroom assignment
      const assignment = await base44.entities.ClassroomAssignment.create({
        classroom_id: classroom.id,
        ...assignmentData
      });

      // Add assignment to each student's calendar
      const studentEmails = classroom.student_emails || [];
      for (const email of studentEmails) {
        await base44.entities.Assignment.create({
          title: assignmentData.title,
          description: assignmentData.description,
          due_date: assignmentData.due_date,
          due_time: assignmentData.due_time,
          type: assignmentData.type,
          estimated_time: assignmentData.estimated_time,
          status: 'not_started',
          created_by: email
        });
      }

      toast.success('Assignment created and added to all students calendars');
      setAssignmentData({
        title: '',
        description: '',
        due_date: '',
        due_time: '',
        type: 'homework',
        estimated_time: 60
      });
      setShowAddAssignment(false);
      queryClient.invalidateQueries({ queryKey: ['classroomAssignments'] });
    } catch (err) {
      console.error('Failed to create assignment:', err);
      toast.error('Failed to create assignment');
    }
  };

  const handleDeleteClass = async () => {
    if (!classroom) return;
    try {
      // Delete all classroom assignments
      const assignments = await base44.entities.ClassroomAssignment.filter({ classroom_id: classroom.id });
      for (const assignment of assignments) {
        await base44.entities.ClassroomAssignment.delete(assignment.id);
      }
      
      // Delete all student assignments created for this classroom
      // (assignments with matching title/date for students in this classroom)
      const studentEmails = classroom.student_emails || [];
      for (const email of studentEmails) {
        const studentAssignments = await base44.entities.Assignment.filter({ created_by: email });
        for (const assignment of studentAssignments) {
          // Check if this assignment matches any classroom assignment
          const matchingClassroomAssignment = assignments.find(ca => 
            ca.title === assignment.title && ca.due_date === assignment.due_date
          );
          if (matchingClassroomAssignment) {
            await base44.entities.Assignment.delete(assignment.id);
          }
        }
      }
      
      await base44.entities.Classroom.delete(classroom.id);
      toast.success('Classroom deleted');
      window.location.href = createPageUrl('TeacherHome');
    } catch (err) {
      console.error('Failed to delete classroom:', err);
      toast.error('Failed to delete classroom');
    }
  };

  const handleEditStudentName = async () => {
    if (!editingStudentEmail || !newStudentName) return;
    // Update in User entity
    try {
      const users = await base44.entities.User.list();
      const user = users.find(u => u.email === editingStudentEmail);
      if (user) {
        await base44.entities.User.update(user.id, { full_name: newStudentName });
        toast.success('Student name updated');
        setEditingStudentEmail('');
        setNewStudentName('');
        queryClient.invalidateQueries();
      }
    } catch (err) {
      console.error('Failed to update name:', err);
      toast.error('Failed to update name');
    }
  };

  const getStudentStats = (email) => {
    const profile = getStudentInfo(email);
    const studentClasses = allClasses.filter(c => c.created_by === email);
    const studentAssignments = allAssignments.filter(a => a.created_by === email);
    const overdueAssignments = studentAssignments.filter(a => {
      const dueDate = new Date(a.due_date);
      return dueDate < new Date() && a.status !== 'completed';
    });

    // Calculate grade - placeholder logic
    const completedAssignments = studentAssignments.filter(a => a.status === 'completed');
    const grade = studentAssignments.length > 0 
      ? Math.round((completedAssignments.length / studentAssignments.length) * 100) 
      : 0;

    return {
      profile,
      grade,
      overdueAssignments
    };
  };

  const handleRemoveStudent = async (email) => {
    if (!classroom) return;
    const updatedEmails = (classroom.student_emails || []).filter(e => e !== email);
    await base44.entities.Classroom.update(classroom.id, {
      student_emails: updatedEmails
    });
    queryClient.invalidateQueries({ queryKey: ['classroom'] });
  };

  const getLearningStyleStats = () => {
    if (!classroom) return {};
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

  const getStudentInfo = (email) => {
    return studentProfiles.find(p => p.created_by === email);
  };

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const getStudentName = (email) => {
    const user = allUsers.find(u => u.email === email);
    return user?.full_name || email;
  };

  if (!classroom) {
    return <div className="p-8">Loading...</div>;
  }

  const styleStats = getLearningStyleStats();
  const totalStudents = (classroom.student_emails || []).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <BackButton to="TeacherHome" label="My Classrooms" showHomeIcon={false} />
        </div>

        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{classroom.name}</h1>
              <p className="text-gray-500">{classroom.subject}</p>
              <Badge variant="outline" className="mt-2">
                Join Code: {classroom.join_code}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditClass(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" className="text-red-500" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button onClick={() => setShowAddStudent(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="students">
          <TabsList>
            <TabsTrigger value="students">
              <Users className="w-4 h-4 mr-1" />
              Students ({totalStudents})
            </TabsTrigger>
            <TabsTrigger value="learning_types">
              <PieChart className="w-4 h-4 mr-1" />
              Learning Types
            </TabsTrigger>
            <TabsTrigger value="assignments">
              <ClipboardList className="w-4 h-4 mr-1" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="grades">
              <Trophy className="w-4 h-4 mr-1" />
              Grades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-6">
            {totalStudents === 0 ? (
              <Card className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No students added yet</p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {(classroom.student_emails || []).map((email) => {
                  const profile = getStudentInfo(email);
                  const StyleIcon = profile?.learning_style ? styleIcons[profile.learning_style] : Users;
                  return (
                    <Card key={email} className="p-4">
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-gray-50 rounded p-2 -m-2"
                          onClick={() => setSelectedStudent(email)}
                        >
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <StyleIcon className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium">{getStudentName(email)}</p>
                            {profile?.learning_style && (
                              <p className="text-sm text-gray-500 capitalize">
                                {profile.learning_style.replace('_', '/')} learner
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingStudentEmail(email);
                              setNewStudentName('');
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => handleRemoveStudent(email)}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="learning_types" className="mt-6">
            {Object.keys(styleStats).length === 0 ? (
              <Card className="p-8 text-center">
                <PieChart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  No learning style data yet. Students need to complete the learning quiz.
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Learning Style Distribution</h3>
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
                              <p className="text-sm text-gray-500">{count} ({percentage}%)</p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="mt-6">
            <div className="mb-4">
              <Button onClick={() => setShowAddAssignment(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Assignment
              </Button>
            </div>

            {classroomAssignments.length === 0 ? (
              <Card className="p-8 text-center">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No assignments yet. Create one to get started!</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {classroomAssignments.map((assignment) => (
                  <Card key={assignment.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{assignment.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(assignment.due_date).toLocaleDateString()}
                          </span>
                          {assignment.due_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {assignment.due_time}
                            </span>
                          )}
                          <Badge variant="outline" className="capitalize">{assignment.type}</Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="grades" className="mt-6">
            <Card className="p-8 text-center">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Grade management coming soon</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student to {classroom.name}</DialogTitle>
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

      <Dialog open={showAddAssignment} onOpenChange={setShowAddAssignment}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Assignment for {classroom.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Assignment title"
                value={assignmentData.title}
                onChange={(e) => setAssignmentData({ ...assignmentData, title: e.target.value })}
              />
            </div>
            <div>
              <Textarea
                placeholder="Assignment description"
                value={assignmentData.description}
                onChange={(e) => setAssignmentData({ ...assignmentData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Due Date</label>
                <Input
                  type="date"
                  value={assignmentData.due_date}
                  onChange={(e) => setAssignmentData({ ...assignmentData, due_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Due Time</label>
                <Input
                  type="time"
                  value={assignmentData.due_time}
                  onChange={(e) => setAssignmentData({ ...assignmentData, due_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Type</label>
                <Select 
                  value={assignmentData.type} 
                  onValueChange={(value) => setAssignmentData({ ...assignmentData, type: value })}
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
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Est. Time (min)</label>
                <Input
                  type="number"
                  value={assignmentData.estimated_time}
                  onChange={(e) => setAssignmentData({ ...assignmentData, estimated_time: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <Button 
              className="w-full" 
              onClick={handleAddAssignment}
              disabled={!assignmentData.title || !assignmentData.due_date}
            >
              Create Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showEditClass && (
        <EditClassModal
          classroom={classroom}
          onClose={() => {
            setShowEditClass(false);
            queryClient.invalidateQueries({ queryKey: ['classroom'] });
          }}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Classroom?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{classroom?.name}" and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClass} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingStudentEmail} onOpenChange={() => setEditingStudentEmail('')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Email: {editingStudentEmail}</p>
              <Input
                placeholder="New student name"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleEditStudentName}
              disabled={!newStudentName}
            >
              Update Name
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student Stats</DialogTitle>
          </DialogHeader>
          {selectedStudent && (() => {
            const stats = getStudentStats(selectedStudent);
            const StyleIcon = stats.profile?.learning_style ? styleIcons[stats.profile.learning_style] : Users;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <StyleIcon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{getStudentName(selectedStudent)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedStudent}</p>
                    {stats.profile?.learning_style && (
                      <p className="text-sm text-gray-500 capitalize mt-1">
                        {stats.profile.learning_style.replace('_', '/')} learner
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Grade in Class</span>
                    <Badge variant="outline" className="text-lg">{stats.grade}%</Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <h4 className="font-semibold">Overdue Assignments</h4>
                  </div>
                  {stats.overdueAssignments.length === 0 ? (
                    <p className="text-sm text-gray-500">No overdue assignments</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.overdueAssignments.map((assignment) => (
                        <div key={assignment.id} className="p-2 bg-red-50 rounded border border-red-200">
                          <p className="font-medium text-sm">{assignment.title}</p>
                          <p className="text-xs text-gray-600">
                            Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}