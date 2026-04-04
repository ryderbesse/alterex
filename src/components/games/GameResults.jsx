import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Target, Sparkles, RotateCcw, ArrowRight, AlertTriangle } from 'lucide-react';
import ProgressRing from '@/components/common/ProgressRing';
import MasteryBadge from '@/components/common/MasteryBadge';
import { motion } from 'framer-motion';

export default function GameResults({ 
  score, 
  maxScore, 
  xpEarned, 
  correctCount, 
  totalCount, 
  weakAreas = [], 
  feedback,
  onPlayAgain,
  onContinue,
  onPracticeWeakAreas
}) {
  const percentage = Math.round((score / maxScore) * 100);
  const accuracy = Math.round((correctCount / totalCount) * 100);
  
  const getMasteryLevel = () => {
    if (accuracy >= 90) return 'mastered';
    if (accuracy >= 70) return 'practicing';
    if (accuracy >= 40) return 'learning';
    return 'not_started';
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-8 text-center bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
          <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">
            {accuracy >= 80 ? 'Excellent!' : accuracy >= 60 ? 'Good Job!' : 'Keep Practicing!'}
          </h2>
          <MasteryBadge level={getMasteryLevel()} size="large" />
        </Card>
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <ProgressRing progress={accuracy} size={60} />
          <p className="text-sm text-gray-500 mt-2">Accuracy</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center h-[60px]">
            <div className="flex items-center gap-1 text-2xl font-bold text-emerald-600">
              <Target className="w-6 h-6" />
              {correctCount}/{totalCount}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Correct</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center h-[60px]">
            <div className="flex items-center gap-1 text-2xl font-bold text-violet-600">
              <Sparkles className="w-6 h-6" />
              +{xpEarned}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">XP Earned</p>
        </Card>
      </div>

      {feedback && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Personalized Feedback
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">{feedback}</p>
        </Card>
      )}

      {weakAreas.length > 0 && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Areas to Focus On
          </h3>
          <div className="space-y-2">
            {weakAreas.map((area, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{area}</span>
              </div>
            ))}
          </div>
          {onPracticeWeakAreas && (
            <Button 
              variant="outline" 
              className="w-full mt-4 border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={onPracticeWeakAreas}
            >
              Practice These Topics
            </Button>
          )}
        </Card>
      )}

      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1" 
          onClick={onPlayAgain}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Play Again
        </Button>
        <Button 
          className="flex-1 bg-violet-600 hover:bg-violet-700" 
          onClick={onContinue}
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}