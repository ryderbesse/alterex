import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Shuffle, Clock } from 'lucide-react';
import { useAccessibility } from '@/components/ui/AccessibilityContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function MatchingGame({ pairs, onComplete }) {
  const [shuffledItems, setShuffledItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [attempts, setAttempts] = useState(0);
  const [startTime] = useState(Date.now());
  const { preferences } = useAccessibility();

  useEffect(() => {
    shuffleItems();
  }, [pairs]);

  const shuffleItems = () => {
    const terms = pairs.map(p => ({ id: p.id + '-term', pairId: p.id, value: p.term, type: 'term' }));
    const matches = pairs.map(p => ({ id: p.id + '-match', pairId: p.id, value: p.match, type: 'match' }));
    const all = [...terms, ...matches].sort(() => Math.random() - 0.5);
    setShuffledItems(all);
    setSelectedItems([]);
    setMatchedPairs([]);
    setAttempts(0);
  };

  const handleSelect = (item) => {
    if (matchedPairs.includes(item.pairId)) return;
    if (selectedItems.find(s => s.id === item.id)) {
      setSelectedItems(selectedItems.filter(s => s.id !== item.id));
      return;
    }
    if (selectedItems.length === 2) return;

    const newSelected = [...selectedItems, item];
    setSelectedItems(newSelected);

    if (newSelected.length === 2) {
      setAttempts(attempts + 1);
      const [first, second] = newSelected;
      
      if (first.pairId === second.pairId && first.type !== second.type) {
        // Match!
        setTimeout(() => {
          setMatchedPairs([...matchedPairs, first.pairId]);
          setSelectedItems([]);
          
          if (matchedPairs.length + 1 === pairs.length) {
            const timeSpent = Math.round((Date.now() - startTime) / 1000);
            onComplete({
              matchedPairs: matchedPairs.length + 1,
              totalPairs: pairs.length,
              attempts: attempts + 1,
              timeSpent,
              // Score based only on matches, not penalized for wrong attempts
              score: matchedPairs.length + 1,
              maxScore: pairs.length
            });
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setSelectedItems([]);
        }, 800);
      }
    }
  };

  const getItemStyle = (item) => {
    const isSelected = selectedItems.find(s => s.id === item.id);
    const isMatched = matchedPairs.includes(item.pairId);
    
    if (isMatched) {
      return 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 text-emerald-700 dark:text-emerald-300';
    }
    if (isSelected) {
      return 'bg-violet-100 dark:bg-violet-900/30 border-violet-500 ring-2 ring-violet-500';
    }
    return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/10';
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>Matched: {matchedPairs.length} / {pairs.length}</span>
          <span>Attempts: {attempts}</span>
        </div>
        <Button variant="outline" size="sm" onClick={shuffleItems}>
          <Shuffle className="w-4 h-4 mr-2" />
          Shuffle
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <AnimatePresence>
          {shuffledItems.map((item) => (
            <motion.button
              key={item.id}
              initial={!preferences.reduced_motion ? { scale: 0.8, opacity: 0 } : { opacity: 1 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileTap={!preferences.reduced_motion ? { scale: 0.95 } : {}}
              onClick={() => handleSelect(item)}
              disabled={matchedPairs.includes(item.pairId)}
              className={`p-4 rounded-xl border-2 transition-all min-h-[80px] flex items-center justify-center text-center ${getItemStyle(item)}`}
            >
              <span className="font-medium text-sm leading-snug">
                {item.value}
              </span>
              {matchedPairs.includes(item.pairId) && (
                <CheckCircle2 className="w-4 h-4 ml-2 text-emerald-500 flex-shrink-0" />
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {matchedPairs.length === pairs.length && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center"
        >
          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">All Matched!</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Completed in {attempts} attempts
            </p>
          </Card>
        </motion.div>
      )}
    </div>
  );
}