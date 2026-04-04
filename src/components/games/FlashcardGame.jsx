import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, ChevronLeft, ChevronRight, Volume2, Bookmark } from 'lucide-react';
import { useAccessibility } from '@/components/ui/AccessibilityContext';
import { motion } from 'framer-motion';

// Flashcards is now a study material, not a game
// This component is used for studying, not scoring
export default function FlashcardGame({ flashcards, onComplete, gameId }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [bookmarked, setBookmarked] = useState(() => {
    const stored = localStorage.getItem(`flashcard_bookmarks_${gameId}`);
    return stored ? JSON.parse(stored) : [];
  });
  const [showFinishOptions, setShowFinishOptions] = useState(false);
  const [shuffledCards, setShuffledCards] = useState(flashcards);
  const { preferences, speak } = useAccessibility();

  const currentCard = shuffledCards[currentIndex];
  const isBookmarked = bookmarked.includes(currentCard?.id);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped && preferences.text_to_speech) {
      speak(currentCard.back);
    }
  };

  const toggleBookmark = (cardId) => {
    const updated = bookmarked.includes(cardId)
      ? bookmarked.filter(id => id !== cardId)
      : [...bookmarked, cardId];
    setBookmarked(updated);
    localStorage.setItem(`flashcard_bookmarks_${gameId}`, JSON.stringify(updated));
  };

  const handleNext = () => {
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      // Finished studying all cards
      setShowFinishOptions(true);
    }
  };

  const handleRepeatShuffled = () => {
    const shuffled = [...shuffledCards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowFinishOptions(false);
  };

  const handleStudyBookmarked = () => {
    const bookmarkedCards = flashcards.filter(card => bookmarked.includes(card.id));
    if (bookmarkedCards.length > 0) {
      setShuffledCards(bookmarkedCards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowFinishOptions(false);
    }
  };

  const handleFinish = () => {
    onComplete({ studied: shuffledCards.length });
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  if (!currentCard) return null;

  if (showFinishOptions) {
    return (
      <Card className="max-w-lg mx-auto p-8 text-center">
        <h3 className="text-xl font-bold mb-4">Great job studying!</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You've reviewed all {shuffledCards.length} flashcards. What would you like to do next?
        </p>
        <div className="space-y-3">
          <Button 
            onClick={handleRepeatShuffled}
            className="w-full bg-violet-600 hover:bg-violet-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Repeat Flashcards (Shuffled)
          </Button>
          {bookmarked.length > 0 && (
            <Button 
              onClick={handleStudyBookmarked}
              variant="outline"
              className="w-full"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Study Bookmarked Cards ({bookmarked.length})
            </Button>
          )}
          <Button 
            onClick={handleFinish}
            variant="ghost"
            className="w-full"
          >
            Finish Studying
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">
          Card {currentIndex + 1} of {shuffledCards.length}
        </span>
        <div className="flex-1 mx-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-violet-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / shuffledCards.length) * 100}%` }}
          />
        </div>
      </div>

      <motion.div 
        className="relative h-72 mb-6 cursor-pointer perspective-1000"
        onClick={handleFlip}
        whileTap={!preferences.reduced_motion ? { scale: 0.98 } : {}}
      >
        <motion.div
          className="w-full h-full"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: preferences.reduced_motion ? 0 : 0.4 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front - Question */}
          <Card className={`absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 ${isFlipped ? 'invisible' : 'visible'}`}>
            <p className="text-sm text-violet-600 dark:text-violet-400 mb-4 font-medium">QUESTION</p>
            <p className="text-xl font-semibold leading-relaxed">{currentCard.front}</p>
            <p className="text-sm text-gray-400 mt-4">Tap to see answer</p>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4"
              onClick={(e) => { e.stopPropagation(); toggleBookmark(currentCard.id); }}
            >
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-violet-600 text-violet-600' : 'text-gray-400'}`} />
            </Button>
            {preferences.text_to_speech && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 left-4"
                onClick={(e) => { e.stopPropagation(); speak(currentCard.front); }}
              >
                <Volume2 className="w-5 h-5" />
              </Button>
            )}
          </Card>
          
          {/* Back - Answer */}
          <Card 
            className={`absolute inset-0 p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 flex flex-col items-center justify-center text-center ${isFlipped ? 'visible' : 'invisible'}`}
            style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
          >
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4 font-medium">ANSWER</p>
            <p className="text-xl font-semibold leading-relaxed">{currentCard.back}</p>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4"
              onClick={(e) => { e.stopPropagation(); toggleBookmark(currentCard.id); }}
            >
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-emerald-600 text-emerald-600' : 'text-gray-400'}`} />
            </Button>
            {preferences.text_to_speech && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 left-4"
                onClick={(e) => { e.stopPropagation(); speak(currentCard.back); }}
              >
                <Volume2 className="w-5 h-5" />
              </Button>
            )}
          </Card>

        </motion.div>
      </motion.div>

      <div className="flex justify-center gap-4">
        <Button 
          variant="outline" 
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Previous
        </Button>
        <Button variant="outline" onClick={handleFlip}>
          <RotateCcw className="w-5 h-5 mr-1" />
          Flip
        </Button>
        <Button 
          onClick={handleNext}
          className="bg-violet-600 hover:bg-violet-700"
        >
          {currentIndex === flashcards.length - 1 ? 'Finish' : 'Next'}
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  );
}