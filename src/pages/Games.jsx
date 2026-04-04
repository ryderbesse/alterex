import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Gamepad2, Sparkles, Clock, Target, ArrowRight, 
  Filter, BookOpen, Zap, Upload, Layers, Loader2, Search
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { motion } from 'framer-motion';
import BackButton from '@/components/common/BackButton';
import FlashcardUploader from '@/components/flashcards/FlashcardUploader';

const gameTypeConfig = {
  quiz: { emoji: '📝', label: 'Quiz', description: 'Test your knowledge' },
  matching: { emoji: '🔗', label: 'Matching', description: 'Connect related items' },
  sorting: { emoji: '📊', label: 'Sorting', description: 'Organize by category' },
  timed_challenge: { emoji: '⚡', label: 'Speed Round', description: 'Beat the clock' }
};

// Exclude flashcards from games - they're now study resources

export default function Games() {
  const [activeTab, setActiveTab] = useState('all');
  const [showFlashcardUploader, setShowFlashcardUploader] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: games = [] } = useQuery({
    queryKey: ['allGames', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allGames = await base44.entities.LearningGame.filter({ created_by: user.email }, '-created_date');
      // Filter out flashcards - they're now study resources
      return allGames.filter(g => g.game_type !== 'flashcards');
    },
    enabled: !!user?.email
  });

  const { data: flashcards = [] } = useQuery({
    queryKey: ['flashcards', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allGames = await base44.entities.LearningGame.filter({ created_by: user.email }, '-created_date');
      return allGames.filter(g => g.game_type === 'flashcards');
    },
    enabled: !!user?.email
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['gameSessions', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.GameSession.filter({ created_by: user.email }, '-created_date', 100);
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

  const getSessionsForGame = (gameId) => {
    return sessions.filter(s => s.game_id === gameId);
  };

  const getBestScore = (gameId) => {
    const gameSessions = getSessionsForGame(gameId);
    if (gameSessions.length === 0) return null;
    return Math.max(...gameSessions.map(s => Math.round((s.score / s.max_score) * 100)));
  };

  const filteredGames = activeTab === 'all' 
    ? games 
    : games.filter(g => g.game_type === activeTab);

  const filteredGamesBySearch = filteredGames.filter(game =>
    game.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFlashcardsBySearch = (flashcards || []).filter(card =>
    card.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Suggested games (games with low scores or unplayed)
  const suggestedGames = games
    .filter(g => {
      const best = getBestScore(g.id);
      return best === null || best < 70;
    })
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-violet-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="mb-4">
          <BackButton />
        </div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-2">Learning Games</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Master your material through interactive games
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Input
            placeholder="Search games and flashcards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md"
          />
        </motion.div>

        {/* Suggested Games */}
        {suggestedGames.length > 0 && !searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="p-6 bg-gradient-to-r from-violet-500 to-purple-600 text-white">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-6 h-6" />
                <h3 className="font-semibold text-lg">Suggested for You</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                {suggestedGames.map((game) => {
                  const config = gameTypeConfig[game.game_type];
                  const classInfo = classes.find(c => c.id === game.class_id);
                  return (
                    <Link key={game.id} to={createPageUrl(`PlayGame?id=${game.id}`)}>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{config?.emoji || '🎮'}</span>
                        <div className="flex-1 min-w-0">
                         <p className="font-medium text-sm truncate">{game.title}</p>
                         <p className="text-xs text-white/70 truncate">{classInfo?.name}</p>
                        </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/70">{config?.label}</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Game Filters */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-2 bg-transparent p-0 w-full">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-full px-4"
            >
              All Games
            </TabsTrigger>
            {Object.entries(gameTypeConfig).map(([type, config]) => (
              <TabsTrigger 
                key={type}
                value={type}
                className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-full px-4"
              >
                <span className="mr-2">{config.emoji}</span>
                {config.label}
              </TabsTrigger>
            ))}
            <TabsTrigger 
              value="flashcards" 
              className="data-[state=active]:bg-violet-600 data-[state=active]:text-white rounded-full px-4"
            >
              <span className="mr-2">🗂️</span>
              Flashcards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flashcards">
            <div className="mb-6">
              <Button onClick={() => setShowFlashcardUploader(true)} className="bg-violet-600 hover:bg-violet-700">
                <Upload className="w-4 h-4 mr-2" />
                Generate Flashcards
              </Button>
            </div>
            
            {showFlashcardUploader && (
              <FlashcardUploader 
                onClose={() => setShowFlashcardUploader(false)}
                classes={classes}
              />
            )}

            {flashcards.length === 0 ? (
              <Card className="p-8 text-center">
                <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No flashcards yet</h3>
                <p className="text-gray-500 mb-4">
                  Upload study materials to generate flashcards
                </p>
                <Button onClick={() => setShowFlashcardUploader(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Generate Flashcards
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFlashcardsBySearch.map((flashcard, idx) => {
                  const classInfo = classes.find(c => c.id === flashcard.class_id);
                  return (
                    <motion.div
                      key={flashcard.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * idx }}
                    >
                      <Link to={createPageUrl(`PlayGame?id=${flashcard.id}`)}>
                        <Card className="p-5 hover:shadow-lg transition-all group h-full">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">🗂️</span>
                              <div>
                                <h4 className="font-semibold">{flashcard.title}</h4>
                                <p className="text-sm text-gray-500">{classInfo?.name || 'Unknown Class'}</p>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {flashcard.flashcards?.length || 0} cards to study
                          </p>
                          <Button className="w-full bg-violet-600 hover:bg-violet-700 group-hover:shadow-md">
                            Study Now
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value={activeTab === 'flashcards' ? 'ignore' : activeTab}>
            {filteredGamesBySearch.length === 0 ? (
              <Card className="p-8 text-center">
                <Gamepad2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No games found</h3>
                <p className="text-gray-500">
                  Upload study materials to generate learning games
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGamesBySearch.map((game, idx) => {
                  const config = gameTypeConfig[game.game_type];
                  const classInfo = classes.find(c => c.id === game.class_id);
                  const bestScore = getBestScore(game.id);
                  const timesPlayed = getSessionsForGame(game.id).length;

                  return (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * idx }}
                    >
                      <Link to={createPageUrl(`PlayGame?id=${game.id}`)}>
                        <Card className="p-5 hover:shadow-lg transition-all group h-full overflow-hidden">
                          <div className="flex items-start justify-between mb-4 min-w-0">
                            <div className="flex items-center gap-3 min-w-0 w-full">
                              <span className="text-3xl flex-shrink-0">{config?.emoji || '🎮'}</span>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <h4 className="font-semibold truncate text-sm md:text-base">{game.title}</h4>
                                <p className="text-sm text-gray-500 truncate">{classInfo?.name || 'Unknown Class'}</p>
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {config?.description}
                          </p>

                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Sparkles className="w-4 h-4 text-violet-500" />
                                {game.total_xp || 100} XP
                              </span>
                              {timesPlayed > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {timesPlayed}x played
                                </span>
                              )}
                            </div>
                            {bestScore !== null && (
                              <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                                bestScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                bestScore >= 60 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                Best: {bestScore}%
                              </div>
                            )}
                          </div>

                          <Button className="w-full bg-violet-600 hover:bg-violet-700 group-hover:shadow-md">
                            Play Now
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}