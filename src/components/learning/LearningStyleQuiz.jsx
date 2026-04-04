import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ChevronRight, Brain, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const questions = [
  {
    question: "When learning something new, I prefer to:",
    options: [
      { text: "Watch a video or look at diagrams", style: "visual" },
      { text: "Listen to someone explain it", style: "auditory" },
      { text: "Try it hands-on myself", style: "kinesthetic" },
      { text: "Read about it and take notes", style: "reading_writing" }
    ]
  },
  {
    question: "I remember things best when I:",
    options: [
      { text: "See pictures or visualizations", style: "visual" },
      { text: "Hear them spoken or discussed", style: "auditory" },
      { text: "Do an activity or practice", style: "kinesthetic" },
      { text: "Write them down multiple times", style: "reading_writing" }
    ]
  },
  {
    question: "When studying, I like to:",
    options: [
      { text: "Use color-coded notes and mind maps", style: "visual" },
      { text: "Record myself or use podcasts", style: "auditory" },
      { text: "Walk around or use flashcards physically", style: "kinesthetic" },
      { text: "Rewrite notes and create summaries", style: "reading_writing" }
    ]
  },
  {
    question: "I find it easier to understand concepts when:",
    options: [
      { text: "I can see a chart or infographic", style: "visual" },
      { text: "Someone talks me through it", style: "auditory" },
      { text: "I can build or create something", style: "kinesthetic" },
      { text: "I analyze patterns and logic", style: "logical" }
    ]
  },
  {
    question: "During group projects, I prefer to:",
    options: [
      { text: "Create presentations and visuals", style: "visual" },
      { text: "Lead discussions and explain ideas", style: "auditory" },
      { text: "Build prototypes or demonstrations", style: "kinesthetic" },
      { text: "Discuss and collaborate with the team", style: "social" }
    ]
  },
  {
    question: "When solving problems, I:",
    options: [
      { text: "Draw diagrams or sketch ideas", style: "visual" },
      { text: "Talk through the problem out loud", style: "auditory" },
      { text: "Use trial and error", style: "kinesthetic" },
      { text: "Break it into logical steps", style: "logical" }
    ]
  },
  {
    question: "In class, I pay most attention when the teacher:",
    options: [
      { text: "Shows slides, videos, or writes on the board", style: "visual" },
      { text: "Explains verbally or tells stories", style: "auditory" },
      { text: "Has us do activities or experiments", style: "kinesthetic" },
      { text: "Gives handouts or asks us to take notes", style: "reading_writing" }
    ]
  },
  {
    question: "When I need directions somewhere new, I prefer:",
    options: [
      { text: "Looking at a map or GPS visual", style: "visual" },
      { text: "Having someone tell me the directions", style: "auditory" },
      { text: "Walking or driving the route myself first", style: "kinesthetic" },
      { text: "Written step-by-step instructions", style: "reading_writing" }
    ]
  },
  {
    question: "When preparing for a test, I usually:",
    options: [
      { text: "Review diagrams, charts, and highlighted notes", style: "visual" },
      { text: "Explain the material to myself or others out loud", style: "auditory" },
      { text: "Practice problems or use physical flashcards", style: "kinesthetic" },
      { text: "Work with a study group or partner", style: "social" }
    ]
  },
  {
    question: "I get distracted most easily when:",
    options: [
      { text: "There's visual clutter or movement around me", style: "visual" },
      { text: "There's noise or people talking nearby", style: "auditory" },
      { text: "I have to sit still for too long", style: "kinesthetic" },
      { text: "The instructions aren't clear or logical", style: "logical" }
    ]
  }
];

const styleDescriptions = {
  visual: "Visual learners understand best through images, diagrams, and spatial understanding.",
  auditory: "Auditory learners excel when information is heard and discussed.",
  kinesthetic: "Kinesthetic learners learn by doing and through physical activities.",
  reading_writing: "Reading/Writing learners prefer text-based information and note-taking.",
  logical: "Logical learners excel at reasoning, patterns, and systematic thinking.",
  social: "Social learners thrive in group settings and collaborative environments."
};

export default function LearningStyleQuiz({ open, onClose, onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [scores, setScores] = useState({
    visual: 0,
    auditory: 0,
    kinesthetic: 0,
    reading_writing: 0,
    logical: 0,
    social: 0
  });
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const handleAnswer = (style) => {
    setSelectedAnswer(style);
    const newScores = { ...scores, [style]: scores[style] + 1 };
    setScores(newScores);

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
      } else {
        setShowResults(true);
      }
    }, 300);
  };

  const getTopStyle = () => {
    return Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  };

  const handleComplete = () => {
    onComplete({
      learning_style: getTopStyle(),
      learning_style_scores: scores
    });
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  // Prevent closing without completing
  const handleOpenChange = (isOpen) => {
    if (!isOpen && !showResults) {
      // Don't allow closing until quiz is complete
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-amber-600 font-medium">Beta Feature</span>
          </div>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-600" />
            Learning Style Quiz
          </DialogTitle>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Question {currentQuestion + 1} of {questions.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-lg font-medium mb-4">
                  {questions[currentQuestion].question}
                </h3>

                <div className="space-y-3">
                  {questions[currentQuestion].options.map((option, idx) => (
                    <Card
                      key={idx}
                      className={`p-4 cursor-pointer transition-all ${
                        selectedAnswer === option.style
                          ? 'border-violet-500 bg-violet-50'
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => handleAnswer(option.style)}
                    >
                      <p>{option.text}</p>
                    </Card>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4"
          >
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              You're a {getTopStyle().replace('_', '/')} learner!
            </h3>
            <p className="text-gray-600 mb-6">
              {styleDescriptions[getTopStyle()]}
            </p>
            <Button onClick={handleComplete} className="bg-violet-600 hover:bg-violet-700">
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}