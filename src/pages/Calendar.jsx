import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  AlertTriangle, Clock, Lightbulb, Bell, CheckCircle2,
  BookOpen, GraduationCap, FileText, ChevronDown
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, 
  isToday, addMonths, subMonths, differenceInDays, isPast, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import BackButton from '@/components/common/BackButton';
import AssignmentCard from '@/components/assignments/AssignmentCard';
import { useEffect } from 'react';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('month');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: assignments = [] } = useQuery({
    queryKey: ['allAssignments', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Assignment.filter({ created_by: user.email }, 'due_date');
    },
    enabled: !!user?.email
  });

  const { data: syncedAssignments = [] } = useQuery({
    queryKey: ['allSyncedAssignments', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.SyncedAssignment.filter({ created_by: user.email, archived: false, sync_active: true }, 'due_date');
    },
    enabled: !!user?.email
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Class.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  const getClassById = (id) => classes.find(c => c.id === id);

  // CRITICAL: Filter out assignments whose class has been deleted
  const validManualAssignments = assignments.filter(assignment => {
    if (!assignment.class_id) return true;
    return classes.some(c => c.id === assignment.class_id);
  });

  // Merge manual + synced assignments
  const validAssignments = [
    ...validManualAssignments,
    ...syncedAssignments.map(a => ({ ...a, _synced: true }))
  ];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getAssignmentsForDate = (date) => {
    return validAssignments.filter(a => {
      // CRITICAL: Parse assignment due date as local date to prevent timezone shifting
      const dueDateStr = a.due_date.split('T')[0];
      const [year, month, day] = dueDateStr.split('-').map(Number);
      const assignmentDate = new Date(year, month - 1, day); // Month is 0-indexed
      return isSameDay(assignmentDate, date);
    });
  };

  const handleToggleComplete = async (assignment) => {
    const newStatus = assignment.status === 'completed' ? 'not_started' : 'completed';
    if (assignment._synced) {
      await base44.entities.SyncedAssignment.update(assignment.id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['allSyncedAssignments'] });
      return;
    }
    await base44.entities.Assignment.update(assignment.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['allAssignments'] });
    
    // Check for badge unlocks after completing assignment
    if (newStatus === 'completed') {
      try {
        await base44.functions.invoke('checkBadges', {});
        queryClient.invalidateQueries({ queryKey: ['badges'] });
      } catch (e) {
        console.log('Badge check failed:', e);
      }
    }
  };

  const handleDelete = async (assignment) => {
    await base44.entities.Assignment.delete(assignment.id);
    queryClient.invalidateQueries({ queryKey: ['allAssignments'] });
  };

  // Get upcoming assignments sorted by urgency
  const getUpcomingAssignments = () => {
    const now = new Date();
    return validAssignments
      .filter(a => a.status !== 'completed')
      .map(a => {
        // CRITICAL: Parse assignment due date as local date to prevent timezone shifting
        const dueDateStr = a.due_date.split('T')[0];
        const [year, month, day] = dueDateStr.split('-').map(Number);
        const assignmentDate = new Date(year, month - 1, day); // Month is 0-indexed
        
        return {
          ...a,
          daysUntil: differenceInDays(assignmentDate, now),
          isOverdue: isPast(assignmentDate)
        };
      })
      .sort((a, b) => {
        // Overdue first, then by days until due
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return a.daysUntil - b.daysUntil;
      });
  };

  // Generate smart recommendations
  const getRecommendations = () => {
    const upcoming = getUpcomingAssignments();
    const recommendations = [];

    // Overdue assignments
    const overdue = upcoming.filter(a => a.isOverdue);
    if (overdue.length > 0) {
      recommendations.push({
        type: 'urgent',
        icon: AlertTriangle,
        title: `${overdue.length} overdue assignment${overdue.length > 1 ? 's' : ''}!`,
        description: `Complete "${overdue[0].title}" immediately.`,
        color: 'text-red-600 bg-red-50'
      });
    }

    // Due within 24 hours
    const dueSoon = upcoming.filter(a => !a.isOverdue && a.daysUntil === 0);
    if (dueSoon.length > 0) {
      recommendations.push({
        type: 'warning',
        icon: Bell,
        title: `${dueSoon.length} due today!`,
        description: `Focus on "${dueSoon[0].title}" first.`,
        color: 'text-amber-600 bg-amber-50'
      });
    }

    // Tests/quizzes coming up
    const upcomingTests = upcoming.filter(a => 
      (a.type === 'test' || a.type === 'quiz') && a.daysUntil <= 7 && a.daysUntil >= 0
    );
    if (upcomingTests.length > 0) {
      recommendations.push({
        type: 'study',
        icon: GraduationCap,
        title: `${upcomingTests[0].type === 'test' ? 'Test' : 'Quiz'} in ${upcomingTests[0].daysUntil} day${upcomingTests[0].daysUntil !== 1 ? 's' : ''}`,
        description: `Start studying for "${upcomingTests[0].title}" now.`,
        color: 'text-violet-600 bg-violet-50'
      });
    }

    // High priority items
    const highPriority = upcoming.filter(a => a.priority === 'high' && a.daysUntil <= 5 && a.daysUntil >= 0);
    if (highPriority.length > 0 && !overdue.length && !dueSoon.length) {
      recommendations.push({
        type: 'priority',
        icon: Lightbulb,
        title: 'High priority assignment',
        description: `Work on "${highPriority[0].title}" (due in ${highPriority[0].daysUntil} days).`,
        color: 'text-blue-600 bg-blue-50'
      });
    }

    // If all good
    if (recommendations.length === 0 && upcoming.length > 0) {
      recommendations.push({
        type: 'good',
        icon: CheckCircle2,
        title: 'You\'re on track!',
        description: `Next up: "${upcoming[0].title}" in ${upcoming[0].daysUntil} days.`,
        color: 'text-emerald-600 bg-emerald-50'
      });
    }

    return recommendations;
  };

  const recommendations = getRecommendations();
  const upcomingAssignments = getUpcomingAssignments().slice(0, 5);
  const selectedDateAssignments = getAssignmentsForDate(selectedDate);

  const handlePrevious = () => {
    if (viewMode === 'month') {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else if (viewMode === 'week') {
      setSelectedDate(subWeeks(selectedDate, 1));
    } else {
      setSelectedDate(subDays(selectedDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentMonth(addMonths(currentMonth, 1));
    } else if (viewMode === 'week') {
      setSelectedDate(addWeeks(selectedDate, 1));
    } else {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <BackButton />
        </div>

        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-violet-600" />
          Calendar & Planner
        </h1>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-6 space-y-3">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Recommendations</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recommendations.map((rec, idx) => (
                <Card key={idx} className={`p-4 ${rec.color}`}>
                  <div className="flex items-start gap-3">
                    <rec.icon className="w-5 h-5 mt-0.5" />
                    <div>
                      <h3 className="font-semibold">{rec.title}</h3>
                      <p className="text-sm opacity-80">{rec.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {viewMode === 'month' && format(currentMonth, 'MMMM yyyy')}
                {viewMode === 'week' && `Week of ${format(weekStart, 'MMM d, yyyy')}`}
                {viewMode === 'day' && format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h2>
              <div className="flex gap-2">
                <Select value={viewMode} onValueChange={setViewMode}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={handlePrevious}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleNext}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {viewMode === 'month' && (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  
                  {daysInMonth.map(day => {
                    const dayAssignments = getAssignmentsForDate(day);
                    const hasOverdue = dayAssignments.some(a => {
                      const dueDateStr = a.due_date.split('T')[0];
                      const [year, month, dayNum] = dueDateStr.split('-').map(Number);
                      const assignmentDate = new Date(year, month - 1, dayNum);
                      return a.status !== 'completed' && isPast(assignmentDate);
                    });
                    const isSelected = isSameDay(day, selectedDate);
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`aspect-square p-1 rounded-lg text-sm relative transition-all
                          ${isToday(day) ? 'ring-2 ring-violet-500 font-bold' : ''}
                          ${isSelected ? 'ring-2 ring-violet-500' : ''}
                          ${dayAssignments.length > 0 ? 'font-medium' : 'text-gray-600'}
                          hover:bg-gray-100
                        `}
                      >
                        <span>{format(day, 'd')}</span>
                        {dayAssignments.length > 0 && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {dayAssignments.slice(0, 3).map((a, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  a.status === 'completed' ? 'bg-emerald-400' :
                                  hasOverdue ? 'bg-red-400' :
                                  a.priority === 'high' ? 'bg-amber-400' : 'bg-red-500'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected date assignments */}
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-medium mb-3">
                    {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMMM d')}
                  </h3>
                  {selectedDateAssignments.length === 0 ? (
                    <p className="text-gray-500 text-sm">No assignments due on this day</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDateAssignments.map(assignment => (
                        <AssignmentCard
                          key={assignment.id}
                          assignment={assignment}
                          onToggleComplete={handleToggleComplete}
                          onEdit={() => {}}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {viewMode === 'week' && (
              <>
                <div className="grid grid-cols-7 gap-2">
                  {daysInWeek.map(day => {
                    const dayAssignments = getAssignmentsForDate(day);
                    return (
                      <div key={day.toISOString()} className={`p-2 rounded-lg bg-gray-900 border border-gray-700 ${isToday(day) ? 'ring-2 ring-violet-500' : ''}`}>
                        <div className="text-center mb-2">
                          <div className="text-xs text-gray-400">{format(day, 'EEE')}</div>
                          <div className="text-lg font-semibold text-white">{format(day, 'd')}</div>
                        </div>
                        <div className="space-y-1 min-h-[100px]">
                          {dayAssignments.map(assignment => (
                            <button
                              key={assignment.id}
                              onClick={() => setSelectedAssignment(assignment)}
                              className="w-full text-left p-1.5 rounded bg-gray-900 border border-gray-700 hover:bg-purple-900 transition-colors text-xs truncate text-white"
                            >
                              {assignment.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {selectedAssignment && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="font-medium mb-3">Assignment Details</h3>
                    <AssignmentCard
                      assignment={selectedAssignment}
                      onToggleComplete={handleToggleComplete}
                      onEdit={() => {}}
                      onDelete={(a) => {
                        handleDelete(a);
                        setSelectedAssignment(null);
                      }}
                    />
                  </div>
                )}
              </>
            )}

            {viewMode === 'day' && (
              <>
                <div className="space-y-2">
                  {selectedDateAssignments.length === 0 ? (
                    <p className="text-gray-500 text-sm py-8 text-center">No assignments due on this day</p>
                  ) : (
                    selectedDateAssignments.map(assignment => (
                      <button
                        key={assignment.id}
                        onClick={() => setSelectedAssignment(assignment)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedAssignment?.id === assignment.id
                            ? 'border-violet-500 bg-gray-900 text-white'
                            : 'border-gray-200 hover:border-violet-300 hover:bg-gray-900 hover:text-white'
                        }`}
                      >
                        <div className="font-medium">{assignment.title}</div>
                        <div className="text-sm text-gray-500 mt-1">{assignment.due_time || 'No time specified'}</div>
                      </button>
                    ))
                  )}
                </div>
                
                {selectedAssignment && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="font-medium mb-3">Assignment Details</h3>
                    <AssignmentCard
                      assignment={selectedAssignment}
                      onToggleComplete={handleToggleComplete}
                      onEdit={() => {}}
                      onDelete={(a) => {
                        handleDelete(a);
                        setSelectedAssignment(null);
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Upcoming & Priority */}
          <div className="space-y-6">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Upcoming Deadlines
              </h3>
              {upcomingAssignments.length === 0 ? (
                <p className="text-gray-500 text-sm">No upcoming assignments</p>
              ) : (
                <div className="space-y-3">
                  {upcomingAssignments.map(assignment => {
                    const classInfo = getClassById(assignment.class_id);
                    const colorMap = {
                      'violet': 'border-violet-500',
                      'blue': 'border-blue-500',
                      'purple': 'border-purple-500',
                      'pink': 'border-pink-500',
                      'red': 'border-red-500',
                      'orange': 'border-orange-500',
                      'amber': 'border-amber-500',
                      'yellow': 'border-yellow-500',
                      'lime': 'border-lime-500',
                      'green': 'border-green-500',
                      'emerald': 'border-emerald-500',
                      'teal': 'border-teal-500',
                      'cyan': 'border-cyan-500',
                      'sky': 'border-sky-500',
                      'indigo': 'border-indigo-500'
                    };
                    const borderColor = classInfo?.color ? colorMap[classInfo.color] || 'border-violet-500' : 'border-violet-500';
                    
                    return (
                      <div key={assignment.id} className={`flex items-start gap-3 p-2 rounded-lg transition-all hover:border-2 ${borderColor}`}>
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          assignment.isOverdue ? 'bg-red-500' :
                          assignment.daysUntil === 0 ? 'bg-amber-500' :
                          'bg-violet-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{assignment.title}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>
                              {assignment.isOverdue ? 'Overdue' :
                               assignment.daysUntil === 0 ? 'Due today' :
                               `${assignment.daysUntil} day${assignment.daysUntil !== 1 ? 's' : ''}`}
                            </span>
                            {classInfo && (
                              <Badge variant="outline" className="text-xs">
                                {classInfo.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-violet-600" />
                Study Tips
              </h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Start tests/quizzes prep 3-5 days early</li>
                <li>• Break large projects into daily tasks</li>
                <li>• Complete high priority items first</li>
                <li>• Review completed work to reinforce learning</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}