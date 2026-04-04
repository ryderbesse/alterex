import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, ArrowRight, Volume2 } from 'lucide-react';
import { useAccessibility } from '@/components/ui/AccessibilityContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuizGame({ questions, onComplete, onAnswer }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState([]);
  const { preferences, speak } = useAccessibility();

  const currentQuestion = questions[currentIndex];
  const isCorrect = selectedAnswer === currentQuestion?.correct_answer;

  useEffect(() => {
    if (preferences.text_to_speech && currentQuestion) {
      speak(currentQuestion.question);
    }
  }, [currentIndex, currentQuestion]);

  const handleSelect = (answer) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);
    
    const answerRecord = {
      question_id: currentQuestion.id,
      user_answer: answer,
      correct: answer === currentQuestion.correct_answer,
      concept: currentQuestion.concept
    };
    setAnswers([...answers, answerRecord]);
    onAnswer?.(answerRecord);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      onComplete(answers);
    }
  };

  if (!currentQuestion) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <div className="flex-1 mx-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-violet-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        {preferences.text_to_speech && (
          <Button variant="ghost" size="icon" onClick={() => speak(currentQuestion.question)}>
            <Volume2 className="w-5 h-5" />
          </Button>
        )}
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-6 leading-relaxed">
          {currentQuestion.question}
        </h2>

        <div className="space-y-3">
          {currentQuestion.options?.map((option, idx) => {
            const isSelected = selectedAnswer === option;
            const isCorrectOption = option === currentQuestion.correct_answer;
            
            let bgClass = 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700';
            let borderClass = 'border-2 border-transparent';
            
            if (showResult) {
              if (isCorrectOption) {
                bgClass = 'bg-emerald-50 dark:bg-emerald-900/30';
                borderClass = 'border-2 border-emerald-500';
              } else if (isSelected && !isCorrect) {
                bgClass = 'bg-red-50 dark:bg-red-900/30';
                borderClass = 'border-2 border-red-500';
              }
            } else if (isSelected) {
              borderClass = 'border-2 border-violet-500';
            }

            return (
              <motion.button
                key={idx}
                whileTap={!preferences.reduced_motion ? { scale: 0.98 } : {}}
                onClick={() => handleSelect(option)}
                disabled={showResult}
                className={`w-full p-4 rounded-xl text-left transition-all ${bgClass} ${borderClass} flex items-center justify-between`}
              >
                <span className="font-medium">{option}</span>
                {showResult && isCorrectOption && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                )}
                {showResult && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </motion.button>
            );
          })}
        </div>
      </Card>

      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={!preferences.reduced_motion ? { opacity: 0, y: 20 } : { opacity: 1 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className={`p-4 mb-6 ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200'}`}>
              <div className="flex items-start gap-3">
                {isCorrect ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold mb-1">
                    {isCorrect ? 'Great job!' : 'Not quite right'}
                  </p>
                  {currentQuestion.explanation && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {currentQuestion.explanation}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Button 
              onClick={handleNext} 
              className="w-full py-6 text-lg bg-violet-600 hover:bg-violet-700"
            >
              {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}