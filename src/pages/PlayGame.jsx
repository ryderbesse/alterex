import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Gamepad2, Loader2, Settings2 } from 'lucide-react';
import QuizGame from '@/components/games/QuizGame';
import FlashcardGame from '@/components/games/FlashcardGame';
import MatchingGame from '@/components/games/MatchingGame';
import TimedChallenge from '@/components/games/TimedChallenge';
import GameResults from '@/components/games/GameResults';

export default function PlayGame() {
  const [gameState, setGameState] = useState('playing'); // playing, results
  const [sessionData, setSessionData] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('id');

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: async () => {
      const games = await base44.entities.LearningGame.filter({ id: gameId });
      return games[0];
    },
    enabled: !!gameId
  });

  const handleGameComplete = async (results) => {
    let score = 0;
    let maxScore = 0;
    let correctCount = 0;
    let totalCount = 0;
    let answers = [];
    let weakAreas = [];
    const conceptsMap = {};

    if (game.game_type === 'quiz' || game.game_type === 'timed_challenge') {
      answers = results.answers || results;
      totalCount = answers.length;
      correctCount = answers.filter(a => a.correct).length;
      score = correctCount * 10;
      maxScore = totalCount * 10;

      // Track weak areas
      answers.forEach(a => {
        if (!conceptsMap[a.concept]) {
          conceptsMap[a.concept] = { correct: 0, total: 0 };
        }
        conceptsMap[a.concept].total++;
        if (a.correct) conceptsMap[a.concept].correct++;
      });
    } else if (game.game_type === 'flashcards') {
      // Flashcards now returns { studied: number }
      totalCount = results.studied || 0;
      correctCount = totalCount; // All studied cards count as completed
      score = totalCount * 10;
      maxScore = totalCount * 10;
    } else if (game.game_type === 'matching') {
      score = Math.round((results.matchedPairs / results.totalPairs) * 100);
      maxScore = 100;
      correctCount = results.matchedPairs;
      totalCount = results.totalPairs;
    }

    // Calculate weak areas
    Object.entries(conceptsMap).forEach(([concept, data]) => {
      if (data.correct / data.total < 0.5) {
        weakAreas.push(concept);
      }
    });

    // Calculate XP
    const accuracy = totalCount > 0 ? correctCount / totalCount : 0;
    const xpEarned = Math.round(accuracy * (game.total_xp || 100));

    // Save session
    const session = await base44.entities.GameSession.create({
      game_id: gameId,
      document_id: game.document_id,
      class_id: game.class_id,
      score,
      max_score: maxScore,
      xp_earned: xpEarned,
      answers,
      concepts_practiced: Object.keys(conceptsMap),
      weak_areas: weakAreas
    });

    // Update concept mastery
    for (const [concept, data] of Object.entries(conceptsMap)) {
      const existing = await base44.entities.ConceptMastery.filter({
        class_id: game.class_id,
        concept
      });

      if (existing.length > 0) {
        const current = existing[0];
        const newTotal = (current.total_attempts || 0) + data.total;
        const newCorrect = (current.correct_attempts || 0) + data.correct;
        const masteryPct = Math.round((newCorrect / newTotal) * 100);
        const masteryLevel = masteryPct >= 80 ? 'mastered' : 
                            masteryPct >= 50 ? 'practicing' : 
                            masteryPct >= 20 ? 'learning' : 'not_started';

        await base44.entities.ConceptMastery.update(current.id, {
          total_attempts: newTotal,
          correct_attempts: newCorrect,
          mastery_percentage: masteryPct,
          mastery_level: masteryLevel,
          last_practiced: new Date().toISOString(),
          suggested_focus: masteryPct < 50
        });
      } else {
        const masteryPct = Math.round((data.correct / data.total) * 100);
        const masteryLevel = masteryPct >= 80 ? 'mastered' : 
                            masteryPct >= 50 ? 'practicing' : 
                            masteryPct >= 20 ? 'learning' : 'not_started';

        await base44.entities.ConceptMastery.create({
          class_id: game.class_id,
          concept,
          total_attempts: data.total,
          correct_attempts: data.correct,
          mastery_percentage: masteryPct,
          mastery_level: masteryLevel,
          last_practiced: new Date().toISOString(),
          suggested_focus: masteryPct < 50
        });
      }
    }

    // Update user progress
    const progress = await base44.entities.UserProgress.list();
    const today = new Date().toDateString();
    const todayDate = new Date().toISOString().split('T')[0];
    
    if (progress.length > 0) {
      const current = progress[0];
      const lastActivity = current.last_activity_date ? new Date(current.last_activity_date).toDateString() : null;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      let newStreak = current.current_streak || 0;
      if (lastActivity !== today) {
        if (lastActivity === yesterday) {
          newStreak = (current.current_streak || 0) + 1;
        } else if (lastActivity !== today) {
          newStreak = 1;
        }
      }

      await base44.entities.UserProgress.update(current.id, {
        total_xp: (current.total_xp || 0) + xpEarned,
        level: Math.floor(((current.total_xp || 0) + xpEarned) / 500) + 1,
        current_streak: newStreak,
        longest_streak: Math.max(current.longest_streak || 0, newStreak),
        last_activity_date: today,
        games_completed: (current.games_completed || 0) + 1
      });
    } else {
      await base44.entities.UserProgress.create({
        total_xp: xpEarned,
        level: 1,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
        games_completed: 1
      });
    }

    // Track daily XP
    const dailyXP = await base44.entities.DailyXP.filter({ date: todayDate });
    if (dailyXP.length > 0) {
      await base44.entities.DailyXP.update(dailyXP[0].id, {
        total_xp: (dailyXP[0].total_xp || 0) + xpEarned
      });
    } else {
      await base44.entities.DailyXP.create({
        date: todayDate,
        total_xp: xpEarned
      });
    }

    // Check for badge unlocks
    try {
      await base44.functions.invoke('checkBadges', {});
    } catch (e) {
      console.log('Badge check failed:', e);
    }

    // Generate feedback
    let feedback = '';
    if (accuracy >= 0.9) {
      feedback = "Excellent work! You've demonstrated strong understanding of this material.";
    } else if (accuracy >= 0.7) {
      feedback = "Good job! You're making progress. Focus on the concepts you missed.";
    } else if (accuracy >= 0.5) {
      feedback = "Keep practicing! Review the key concepts and try again.";
    } else {
      feedback = "This material needs more attention. Consider reviewing the summary before trying again.";
    }

    setSessionData({
      score,
      maxScore,
      xpEarned,
      correctCount,
      totalCount,
      weakAreas,
      feedback
    });
    setGameState('results');
    
    queryClient.invalidateQueries(['userProgress']);
    queryClient.invalidateQueries(['mastery']);
  };

  const handlePlayAgain = () => {
    setGameState('playing');
    setSessionData(null);
  };

  // Filter content based on difficulty
  const getFilteredContent = () => {
    if (!game) return { questions: [], flashcards: [], matching_pairs: [] };
    
    let questions = game.questions || [];
    let flashcards = game.flashcards || [];
    let matchingPairs = game.matching_pairs || [];

    if (difficulty === 'easy') {
      // Easy: fewer items, simpler content
      questions = questions.slice(0, Math.max(3, Math.floor(questions.length * 0.5)));
      flashcards = flashcards.slice(0, Math.max(3, Math.floor(flashcards.length * 0.5)));
      matchingPairs = matchingPairs.slice(0, Math.max(3, Math.floor(matchingPairs.length * 0.5)));
    } else if (difficulty === 'hard') {
      // Hard: all items, potentially shuffled more
      questions = questions;
      flashcards = flashcards;
      matchingPairs = matchingPairs;
    } else {
      // Medium: default amount
      questions = questions.slice(0, Math.max(5, Math.floor(questions.length * 0.75)));
      flashcards = flashcards.slice(0, Math.max(5, Math.floor(flashcards.length * 0.75)));
      matchingPairs = matchingPairs.slice(0, Math.max(4, Math.floor(matchingPairs.length * 0.75)));
    }

    return { questions, flashcards, matching_pairs: matchingPairs };
  };

  const filteredContent = getFilteredContent();
  const timeLimit = difficulty === 'easy' ? (game?.time_limit || 60) * 1.5 : 
                    difficulty === 'hard' ? (game?.time_limit || 60) * 0.75 : 
                    (game?.time_limit || 60);

  const handleContinue = () => {
    if (game?.class_id) {
      window.location.href = createPageUrl(`ClassDetail?id=${game.class_id}`);
    } else {
      window.location.href = createPageUrl('Home');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <Gamepad2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Game not found</h3>
          <Link to={createPageUrl('Home')}>
            <Button>Go Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to={game.class_id ? createPageUrl(`ClassDetail?id=${game.class_id}`) : createPageUrl('Home')}>
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Exit Game
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-violet-600" />
              <span className="font-semibold">{game.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-gray-400" />
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {gameState === 'playing' ? (
          <>
            {game.game_type === 'quiz' && filteredContent.questions?.length > 0 && (
              <QuizGame 
                questions={filteredContent.questions} 
                onComplete={handleGameComplete}
              />
            )}
            {game.game_type === 'flashcards' && filteredContent.flashcards?.length > 0 && (
              <FlashcardGame 
                flashcards={filteredContent.flashcards} 
                gameId={gameId}
                onComplete={handleGameComplete}
              />
            )}
            {game.game_type === 'matching' && filteredContent.matching_pairs?.length > 0 && (
              <MatchingGame 
                pairs={filteredContent.matching_pairs} 
                onComplete={handleGameComplete}
              />
            )}
            {game.game_type === 'timed_challenge' && filteredContent.questions?.length > 0 && (
              <TimedChallenge 
                questions={filteredContent.questions}
                timeLimit={Math.round(timeLimit)}
                onComplete={handleGameComplete}
              />
            )}
          </>
        ) : (
          <GameResults
            score={sessionData.score}
            maxScore={sessionData.maxScore}
            xpEarned={sessionData.xpEarned}
            correctCount={sessionData.correctCount}
            totalCount={sessionData.totalCount}
            weakAreas={sessionData.weakAreas}
            feedback={sessionData.feedback}
            onPlayAgain={handlePlayAgain}
            onContinue={handleContinue}
          />
        )}
      </div>
    </div>
  );
}