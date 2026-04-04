import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Bookmark, Layers, ArrowRight } from 'lucide-react';
import BackButton from '@/components/common/BackButton';
import { motion } from 'framer-motion';

export default function BookmarkedFlashcards() {
  const [user, setUser] = useState(null);
  const [bookmarkedSets, setBookmarkedSets] = useState([]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: flashcardGames = [] } = useQuery({
    queryKey: ['flashcardGames', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allGames = await base44.entities.LearningGame.filter({ created_by: user.email });
      return allGames.filter(g => g.game_type === 'flashcards');
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

  useEffect(() => {
    // Get all bookmark sets
    const sets = [];
    flashcardGames.forEach(game => {
      const stored = localStorage.getItem(`flashcard_bookmarks_${game.id}`);
      if (stored) {
        const bookmarks = JSON.parse(stored);
        if (bookmarks.length > 0) {
          sets.push({
            game,
            bookmarkCount: bookmarks.length
          });
        }
      }
    });
    setBookmarkedSets(sets);
  }, [flashcardGames]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Bookmark className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Bookmarked Flashcards</h1>
              <p className="text-gray-600 dark:text-gray-400">Cards that need more attention</p>
            </div>
          </div>
        </motion.div>

        {bookmarkedSets.length === 0 ? (
          <Card className="p-8 text-center">
            <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No bookmarked cards yet</h3>
            <p className="text-gray-500">
              Bookmark flashcards while studying to create a focused review set
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {bookmarkedSets.map(({ game, bookmarkCount }, idx) => {
              const classInfo = classes.find(c => c.id === game.class_id);
              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                >
                  <Link to={createPageUrl(`PlayGame?id=${game.id}`)}>
                    <Card className="p-5 hover:shadow-lg transition-all group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                            <Layers className="w-6 h-6 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{game.title}</h3>
                            <p className="text-sm text-gray-500">{classInfo?.name || 'Unknown Class'}</p>
                            <p className="text-sm text-amber-600 mt-1">
                              {bookmarkCount} bookmarked card{bookmarkCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 group-hover:text-violet-600 transition-all" />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}