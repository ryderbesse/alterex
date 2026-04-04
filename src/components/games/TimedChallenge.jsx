import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Timer, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { useAccessibility } from '@/components/ui/AccessibilityContext';
import { motion } from 'framer-motion';

export default function TimedChallenge({ questions, timeLimit = 60, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [showFeedback, setShowFeedback] = useState(null);
  const { preferences } = useAccessibility();

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (isComplete || timeLeft <= 0) {
      if (!isComplete) {
        finishGame();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isComplete]);

  const finishGame = useCallback(() => {
    setIsComplete(true);
    onComplete({
      score,
      totalQuestions: questions.length,
      answeredQuestions: answers.length,
      timeUsed: timeLimit - timeLeft,
      answers
    });
  }, [score, answers, timeLimit, timeLeft, questions.length, onComplete]);

  const handleAnswer = (answer) => {
    if (showFeedback !== null) return;
    
    const isCorrect = answer === currentQuestion.correct_answer;
    setShowFeedback(isCorrect);
    
    if (isCorrect) {
      setScore(score + currentQuestion.points || 10);
    }

    setAnswers([...answers, {
      question_id: currentQuestion.id,
      user_answer: answer,
      correct: isCorrect,
      concept: currentQuestion.concept
    }]);

    setTimeout(() => {
      setShowFeedback(null);
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        finishGame();
      }
    }, 500);
  };

  const timePercent = (timeLeft / timeLimit) * 100;
  const timeColor = timePercent > 50 ? 'bg-emerald-500' : timePercent > 25 ? 'bg-amber-500' : 'bg-red-500';

  if (isComplete) {
    return (
      <div className="max-w-lg mx-auto text-center">
        <Card className="p-8 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
          <Zap className="w-16 h-16 text-violet-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Time's Up!</h2>
          <div className="text-4xl font-bold text-violet-600 mb-4">{score} points</div>
          <p className="text-gray-600 dark:text-gray-300">
            You answered {answers.filter(a => a.correct).length} out of {answers.length} correctly
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Timer className={timePercent <= 25 ? 'text-red-500 animate-pulse' : 'text-gray-500'} />
            <span className={timePercent <= 25 ? 'text-red-500' : ''}>{timeLeft}s</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-lg">{score} pts</span>
          </div>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${timeColor} transition-colors`}
            initial={{ width: '100%' }}
            animate={{ width: `${timePercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      <Card className={`p-6 mb-6 transition-colors ${
        showFeedback === true ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300' :
        showFeedback === false ? 'bg-red-50 dark:bg-red-900/20 border-red-300' : ''
      }`}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">
            Question {currentIndex + 1} / {questions.length}
          </span>
          <span className="text-sm font-medium text-violet-600">
            +{currentQuestion.points || 10} pts
          </span>
        </div>
        <h2 className="text-xl font-semibold mb-6">{currentQuestion.question}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentQuestion.options?.map((option, idx) => (
            <motion.button
              key={idx}
              whileTap={!preferences.reduced_motion ? { scale: 0.95 } : {}}
              onClick={() => handleAnswer(option)}
              disabled={showFeedback !== null}
              className={`p-4 rounded-xl border-2 text-left font-medium transition-all ${
                showFeedback !== null && option === currentQuestion.correct_answer
                  ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                  : showFeedback === false && option === answers[answers.length - 1]?.user_answer
                  ? 'bg-red-100 border-red-500 text-red-700'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-violet-300 hover:bg-violet-50'
              }`}
            >
              {option}
            </motion.button>
          ))}
        </div>
      </Card>

      {showFeedback !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center"
        >
          {showFeedback ? (
            <div className="flex items-center gap-2 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-6 h-6" />
              Correct!
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600 font-semibold">
              <XCircle className="w-6 h-6" />
              Wrong!
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}