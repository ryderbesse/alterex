import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, FileText, Gamepad2, Volume2, VolumeX, 
  BookOpen, Target, ExternalLink, Edit2, Save, Loader2
} from 'lucide-react';
import { useAccessibility } from '@/components/ui/AccessibilityContext';
import MasteryBadge from '@/components/common/MasteryBadge';
import GradeEntry from '@/components/grades/GradeEntry';
import { motion } from 'framer-motion';

export default function DocumentDetail() {
  const [activeTab, setActiveTab] = useState('summary');
  const [summaryLength, setSummaryLength] = useState('medium');
  const [showGradeEntry, setShowGradeEntry] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { speak, stopSpeaking, preferences } = useAccessibility();

  const urlParams = new URLSearchParams(window.location.search);
  const docId = urlParams.get('id');

  const { data: document, refetch } = useQuery({
    queryKey: ['document', docId],
    queryFn: async () => {
      const docs = await base44.entities.Document.filter({ id: docId });
      return docs[0];
    },
    enabled: !!docId
  });

  const { data: games = [] } = useQuery({
    queryKey: ['documentGames', docId],
    queryFn: () => base44.entities.LearningGame.filter({ document_id: docId }),
    enabled: !!docId
  });

  const { data: classData } = useQuery({
    queryKey: ['documentClass', document?.class_id],
    queryFn: async () => {
      const classes = await base44.entities.Class.filter({ id: document.class_id });
      return classes[0];
    },
    enabled: !!document?.class_id
  });

  const handleSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      const text = summaryLength === 'short' ? document?.summary_short :
                   summaryLength === 'detailed' ? document?.summary_detailed :
                   document?.summary_medium;
      speak(text || 'No summary available');
      setIsSpeaking(true);
    }
  };

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const getSummary = () => {
    switch (summaryLength) {
      case 'short': return document.summary_short;
      case 'detailed': return document.summary_detailed;
      default: return document.summary_medium;
    }
  };

  const gameTypeIcons = {
    quiz: '📝',
    flashcards: '🎴',
    matching: '🔗',
    sorting: '📊',
    timed_challenge: '⚡'
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link to={createPageUrl(`ClassDetail?id=${document.class_id}`)}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {classData?.name || 'Class'}
            </Button>
          </Link>
          
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                <FileText className="w-7 h-7 text-violet-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{document.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="outline" className="capitalize">
                    {document.file_type}
                  </Badge>
                  {document.processing_status === 'completed' && (
                    <Badge className="bg-emerald-100 text-emerald-700">
                      Processed
                    </Badge>
                  )}
                  {document.key_concepts?.length > 0 && (
                    <Badge variant="outline">
                      {document.key_concepts.length} concepts
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {document.file_url && (
                <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Original
                  </Button>
                </a>
              )}
              {classData?.grades_enabled && (
                <Button variant="outline" onClick={() => setShowGradeEntry(!showGradeEntry)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  {document.grade !== undefined ? 'Edit Grade' : 'Add Grade'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {showGradeEntry && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <GradeEntry
              document={document}
              onSave={() => { setShowGradeEntry(false); refetch(); }}
              onCancel={() => setShowGradeEntry(false)}
            />
          </motion.div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="summary" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="concepts" className="gap-2">
              <Target className="w-4 h-4" />
              Key Concepts
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-2">
              <Gamepad2 className="w-4 h-4" />
              Games ({games.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  {['short', 'medium', 'detailed'].map((length) => (
                    <Button
                      key={length}
                      variant={summaryLength === length ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSummaryLength(length)}
                      className={summaryLength === length ? 'bg-violet-600' : ''}
                    >
                      {length.charAt(0).toUpperCase() + length.slice(1)}
                    </Button>
                  ))}
                </div>
                
                {preferences.text_to_speech && (
                  <Button variant="outline" size="sm" onClick={handleSpeak}>
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-4 h-4 mr-2" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 mr-2" />
                        Listen
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="prose prose-violet max-w-none dark:prose-invert">
                <p className="text-lg leading-relaxed whitespace-pre-wrap">
                  {getSummary() || 'No summary available for this document.'}
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="concepts">
            {document.key_concepts?.length > 0 ? (
              <div className="space-y-4">
                {document.key_concepts.map((concept, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">{concept.term}</h4>
                        <p className="text-gray-600 dark:text-gray-300">
                          {concept.definition}
                        </p>
                      </div>
                      <Badge 
                        variant="outline"
                        className={
                          concept.importance === 'high' ? 'border-red-300 text-red-600' :
                          concept.importance === 'medium' ? 'border-amber-300 text-amber-600' :
                          'border-blue-300 text-blue-600'
                        }
                      >
                        {concept.importance} priority
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No concepts extracted</h3>
                <p className="text-gray-500">
                  Key concepts will appear here once the document is processed
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="games">
            {games.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {games.map((game) => (
                  <Link key={game.id} to={createPageUrl(`PlayGame?id=${game.id}`)}>
                    <Card className="p-4 hover:shadow-md transition-all group cursor-pointer">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-3xl">
                          {gameTypeIcons[game.game_type] || '🎮'}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{game.title}</h4>
                          <p className="text-sm text-gray-500 capitalize">
                            {game.game_type?.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-violet-600 font-medium">
                          +{game.total_xp || 100} XP
                        </span>
                        <Button variant="outline" size="sm" className="group-hover:bg-violet-50 group-hover:border-violet-300">
                          Play Now
                        </Button>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Gamepad2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No games yet</h3>
                <p className="text-gray-500">
                  Games are being generated for this document
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}