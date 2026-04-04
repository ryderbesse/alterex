import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, Plus, FileText, Gamepad2, Trophy, Target, 
  Settings, Upload, Sparkles, BookOpen, TrendingUp, ClipboardList, Home, Trash2, Edit, GraduationCap, CheckCircle2
} from 'lucide-react';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import DocumentCard from '@/components/documents/DocumentCard';
import DocumentUploader from '@/components/upload/DocumentUploader';
import TextMaterialUploader from '@/components/upload/TextMaterialUploader';
import SyllabusUploader from '@/components/upload/SyllabusUploader';
import ProgressRing from '@/components/common/ProgressRing';
import MasteryBadge from '@/components/common/MasteryBadge';
import BackButton from '@/components/common/BackButton';
import AssignmentList from '@/components/assignments/AssignmentList';
import ClassSyncModal from '@/components/classroom/ClassSyncModal';
import GradeManager from '@/components/grades/GradeManager';
import StudentEditClassModal from '@/components/classes/StudentEditClassModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function ClassDetail() {
  const [showUploader, setShowUploader] = useState(false);
  const [gcJustConnected, setGcJustConnected] = useState(false);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'text'
  const [activeTab, setActiveTab] = useState('materials');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSyllabusUploader, setShowSyllabusUploader] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get('id');

  useEffect(() => {
    if (urlParams.get('gc_connected') === '1') {
      setGcJustConnected(true);
      // Clean the URL param without reload
      const clean = new URL(window.location.href);
      clean.searchParams.delete('gc_connected');
      window.history.replaceState({}, '', clean.toString());
      // Hide banner after 4 seconds
      setTimeout(() => setGcJustConnected(false), 4000);
    }
  }, []);

  const { data: classData } = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      const classes = await base44.entities.Class.filter({ id: classId });
      return classes[0];
    },
    enabled: !!classId
  });

  const { data: documents = [], refetch: refetchDocs } = useQuery({
    queryKey: ['classDocuments', classId],
    queryFn: () => base44.entities.Document.filter({ class_id: classId }, '-created_date'),
    enabled: !!classId
  });

  const { data: games = [], refetch: refetchGames } = useQuery({
    queryKey: ['classGames', classId],
    queryFn: () => base44.entities.LearningGame.filter({ class_id: classId }, '-created_date'),
    enabled: !!classId
  });

  const { data: mastery = [] } = useQuery({
    queryKey: ['classMastery', classId],
    queryFn: () => base44.entities.ConceptMastery.filter({ class_id: classId }),
    enabled: !!classId
  });

  const colorMap = {
    violet: 'from-violet-500 to-purple-600',
    blue: 'from-blue-500 to-cyan-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-pink-500',
    indigo: 'from-indigo-500 to-blue-600',
    cyan: 'from-cyan-500 to-cyan-600',
    pink: 'from-pink-500 to-pink-600',
    orange: 'from-orange-500 to-orange-600',
    teal: 'from-teal-500 to-teal-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
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
    'red-rose': 'from-red-500 to-rose-500'
  };

  const gradient = colorMap[classData?.color] || colorMap.violet;
  const hasBackgroundImage = classData?.background_image;

  const avgMastery = mastery.length > 0 
    ? mastery.reduce((sum, m) => sum + (m.mastery_percentage || 0), 0) / mastery.length 
    : 0;

  const masteredCount = mastery.filter(m => m.mastery_level === 'mastered').length;
  const learningCount = mastery.filter(m => m.mastery_level === 'learning' || m.mastery_level === 'practicing').length;

  const handleDeleteClass = async () => {
    // Delete all related data
    for (const doc of documents) {
      await base44.entities.Document.delete(doc.id);
    }
    for (const game of games) {
      await base44.entities.LearningGame.delete(game.id);
    }
    for (const m of mastery) {
      await base44.entities.ConceptMastery.delete(m.id);
    }
    
    // Delete all assignments for this class
    const assignments = await base44.entities.Assignment.filter({ class_id: classId });
    for (const assignment of assignments) {
      await base44.entities.Assignment.delete(assignment.id);
    }
    
    // Delete the class itself
    await base44.entities.Class.delete(classId);
    // Redirect to home
    window.location.href = createPageUrl('Home');
  };

  const handleUploadComplete = async (doc) => {
    setShowUploader(false);
    refetchDocs();
    // Auto-generate games for the document
    await generateGamesForDocument(doc);
  };

  const generateGamesForDocument = async (doc) => {
    try {
      const gamePrompt = `Based on this educational content, create interactive learning games.

Content: ${doc.summary_detailed || doc.summary_medium || doc.summary_short || 'No summary available'}
Key concepts: ${JSON.stringify(doc.key_concepts || [])}

Create a comprehensive quiz with 10 questions, flashcards, and matching pairs.`;

      const gameData = await base44.integrations.Core.InvokeLLM({
        prompt: gamePrompt,
        response_json_schema: {
          type: "object",
          properties: {
            quiz_questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  question: { type: "string" },
                  correct_answer: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  explanation: { type: "string" },
                  concept: { type: "string" },
                  points: { type: "number" }
                }
              }
            },
            flashcards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  front: { type: "string" },
                  back: { type: "string" },
                  concept: { type: "string" }
                }
              }
            },
            matching_pairs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  term: { type: "string" },
                  match: { type: "string" },
                  concept: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Create games
      const gameTypes = [
        { type: 'quiz', title: `${doc.title} - Quiz`, questions: gameData.quiz_questions },
        { type: 'flashcards', title: `${doc.title} - Flashcards`, flashcards: gameData.flashcards },
        { type: 'matching', title: `${doc.title} - Matching`, matching_pairs: gameData.matching_pairs },
        { type: 'timed_challenge', title: `${doc.title} - Speed Round`, questions: gameData.quiz_questions?.slice(0, 5), time_limit: 60 }
      ];

      for (const game of gameTypes) {
        if (game.type === 'quiz' && game.questions?.length > 0 ||
            game.type === 'flashcards' && game.flashcards?.length > 0 ||
            game.type === 'matching' && game.matching_pairs?.length > 0 ||
            game.type === 'timed_challenge' && game.questions?.length > 0) {
          await base44.entities.LearningGame.create({
            document_id: doc.id,
            class_id: classId,
            game_type: game.type,
            title: game.title,
            questions: game.questions,
            flashcards: game.flashcards,
            matching_pairs: game.matching_pairs,
            time_limit: game.time_limit,
            total_xp: 100
          });
        }
      }

      refetchGames();
    } catch (err) {
      console.error('Failed to generate games:', err);
    }
  };

  const getGamesForDocument = (docId) => {
    return games.filter(g => g.document_id === docId).length;
  };

  if (!classData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div 
        className={`${hasBackgroundImage ? '' : `bg-gradient-to-br ${gradient}`} text-white relative overflow-hidden h-48 md:h-auto`}
        style={hasBackgroundImage ? {
          backgroundImage: `url(${classData.background_image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        {hasBackgroundImage && <div className="absolute inset-0 bg-black/40" />}
        {classData?.background_pattern && (
          <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Ctext x='50' y='50' font-size='40' text-anchor='middle' dominant-baseline='middle' opacity='0.3'%3E${classData.background_pattern}%3C/text%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '100px 100px'
            }} />
          </div>
        )}
        <div className="max-w-6xl mx-auto px-4 py-4 md:py-8 relative z-10">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 mb-4">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-3xl font-bold mb-2">{classData.name}</h1>
              <p className="text-white/80 text-sm md:text-base">{documents.length} materials • {games.length} games</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit className="w-5 h-5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Class</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{classData.name}"? This will permanently remove all materials, games, and progress associated with this class.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteClass} className="bg-red-600 hover:bg-red-700">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>

      {/* Google Classroom Connected Banner */}
      {gcJustConnected && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700">
            <GraduationCap className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="font-medium text-sm">Google Classroom connected successfully!</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <ProgressRing progress={avgMastery} size={50} strokeWidth={5} />
              <div>
                <p className="text-sm text-gray-500">Overall Mastery</p>
                <p className="font-semibold">{Math.round(avgMastery)}%</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Mastered</p>
                <p className="font-semibold">{masteredCount} concepts</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Learning</p>
                <p className="font-semibold">{learningCount} concepts</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Games Available</p>
                <p className="font-semibold">{games.length}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="materials" className="gap-2">
                <FileText className="w-4 h-4" />
                Materials
              </TabsTrigger>
              <TabsTrigger value="assignments" className="gap-2">
                <ClipboardList className="w-4 h-4" />
                Assignments
              </TabsTrigger>
              <TabsTrigger value="games" className="gap-2">
                <Gamepad2 className="w-4 h-4" />
                Games
              </TabsTrigger>
              <TabsTrigger value="mastery" className="gap-2">
                <Target className="w-4 h-4" />
                Mastery
              </TabsTrigger>
              <TabsTrigger value="grades" className="gap-2">
                <Trophy className="w-4 h-4" />
                Grades
              </TabsTrigger>
            </TabsList>

            {activeTab === 'materials' && !showUploader && (
              <div className="flex gap-2">
                <Button onClick={() => { setUploadMode('file'); setShowUploader(true); }}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
                <Button variant="outline" onClick={() => { setUploadMode('text'); setShowUploader(true); }}>
                  <FileText className="w-4 h-4 mr-2" />
                  Add Text
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="materials">
            <AnimatePresence>
              {showUploader && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6"
                >
                  {uploadMode === 'file' ? (
                    <DocumentUploader
                      classId={classId}
                      onUploadComplete={handleUploadComplete}
                      onCancel={() => setShowUploader(false)}
                    />
                  ) : (
                    <TextMaterialUploader
                      classId={classId}
                      onUploadComplete={handleUploadComplete}
                      onCancel={() => setShowUploader(false)}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {documents.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No materials yet</h3>
                <p className="text-gray-500 mb-4">
                  Upload your first study material to get started
                </p>
                <Button onClick={() => setShowUploader(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Material
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {documents.map((doc) => (
                  <Link key={doc.id} to={createPageUrl(`DocumentDetail?id=${doc.id}`)}>
                    <DocumentCard 
                      document={doc} 
                      gamesCount={getGamesForDocument(doc.id)}
                    />
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assignments">
            <AssignmentList
              classId={classId}
              onSyncClick={() => setShowSyncModal(true)}
              onUploadSyllabus={() => setShowSyllabusUploader(true)}
            />
          </TabsContent>

          <TabsContent value="games">
            {games.length === 0 ? (
              <Card className="p-8 text-center">
                <Gamepad2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No games yet</h3>
                <p className="text-gray-500">
                  Games will be automatically generated when you upload materials
                </p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {games.map((game) => (
                  <Link key={game.id} to={createPageUrl(`PlayGame?id=${game.id}`)}>
                    <Card className="p-4 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                          <Gamepad2 className="w-5 h-5 text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{game.title}</h4>
                          <p className="text-sm text-gray-500 capitalize">
                            {game.game_type?.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-violet-600 font-medium">
                          +{game.total_xp || 100} XP
                        </span>
                        <Button variant="outline" size="sm">
                          Play Now
                        </Button>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mastery">
            {mastery.length === 0 ? (
              <Card className="p-8 text-center">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No mastery data yet</h3>
                <p className="text-gray-500">
                  Play games to start tracking your concept mastery
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {mastery.map((concept) => (
                  <Card key={concept.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <ProgressRing 
                          progress={concept.mastery_percentage} 
                          size={50} 
                          strokeWidth={5}
                          color={concept.mastery_level === 'mastered' ? '#10b981' : '#8b5cf6'}
                        />
                        <div>
                          <h4 className="font-semibold">{concept.concept}</h4>
                          <p className="text-sm text-gray-500">
                            {concept.correct_attempts || 0} / {concept.total_attempts || 0} correct
                          </p>
                        </div>
                      </div>
                      <MasteryBadge level={concept.mastery_level} />
                    </div>
                    {concept.feedback && (
                      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        {concept.feedback}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="grades">
            <GradeManager classId={classId} gradeWeights={classData?.grade_weights} />
          </TabsContent>
        </Tabs>
      </div>

      {showEditDialog && (
        <StudentEditClassModal
          classData={classData}
          onClose={() => setShowEditDialog(false)}
          onSave={() => queryClient.invalidateQueries(['class', classId])}
        />
      )}

      {showSyllabusUploader && (
        <SyllabusUploader
          classId={classId}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['allAssignments'] });
            setShowSyllabusUploader(false);
          }}
          onClose={() => setShowSyllabusUploader(false)}
        />
      )}

      <ClassSyncModal
        open={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        classId={classId}
        onSynced={() => queryClient.invalidateQueries({ queryKey: ['syncedAssignments', classId] })}
      />
    </div>
  );
}