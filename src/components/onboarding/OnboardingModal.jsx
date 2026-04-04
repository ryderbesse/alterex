import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, Upload, Gamepad2, Target, Calendar, 
  ChevronRight, ChevronLeft, Sparkles, CheckCircle2, Brain
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  {
    icon: BookOpen,
    title: "Welcome to Alterex!",
    description: "Your personal learning companion that transforms studying into an engaging experience. Let's take a quick tour of the key features.",
    color: "from-violet-500 to-purple-600"
  },
  {
    icon: Upload,
    title: "Upload Study Materials",
    description: "Upload PDFs, images, Word docs, or slides. Our AI will automatically extract key concepts, generate summaries, and create study games for you.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Gamepad2,
    title: "Learn Through Games",
    description: "Master your material with interactive quizzes, flashcards, matching games, and timed challenges. Each game earns you XP and tracks your progress.",
    color: "from-emerald-500 to-teal-500"
  },
  {
    icon: Target,
    title: "Track Your Mastery",
    description: "See exactly which concepts you've mastered and which need more practice. Get personalized recommendations on what to study next.",
    color: "from-amber-500 to-orange-500"
  },
  {
    icon: Calendar,
    title: "Stay Organized",
    description: "Add assignments with due dates, view your calendar, and get smart recommendations on what to prioritize based on deadlines and difficulty.",
    color: "from-rose-500 to-pink-500"
  },
  {
    icon: Brain,
    title: "Meet Alt",
    description: "Your personal AI learning assistant tailored to your unique learning style. Alt will help optimize your study sessions and provide personalized recommendations.",
    color: "from-purple-500 to-indigo-600"
  }
];

export default function OnboardingModal({ open, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
      // Redirect to Alt AI page
      window.location.href = createPageUrl('LearningCoach');
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" hideCloseButton>
        <div className={`bg-gradient-to-br ${step.color} p-8 text-white`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Icon className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-600 text-center mb-6"
            >
              {step.description}
            </motion.p>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentStep ? 'w-6 bg-violet-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrev} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <Button onClick={handleNext} className="flex-1 bg-violet-600 hover:bg-violet-700">
              {currentStep === steps.length - 1 ? (
                <>
                  <Brain className="w-4 h-4 mr-1" />
                  Meet Alt
                </>
              ) : currentStep === steps.length - 2 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}