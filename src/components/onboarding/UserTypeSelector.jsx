import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, Users, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UserTypeSelector({ open, onSelect }) {
  const handleSelect = async (type) => {
    await onSelect(type);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden" hideCloseButton>
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-8 text-white text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Welcome to StudyQuest!</h2>
          <p className="text-white/80">Tell us how you'll be using the app</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Card 
                className="p-6 cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-all text-center"
                onClick={() => handleSelect('student')}
              >
                <GraduationCap className="w-12 h-12 text-violet-600 mx-auto mb-3" />
                <h3 className="font-semibold text-lg mb-1">I'm a Student</h3>
                <p className="text-sm text-gray-500">
                  Upload materials, play games, and track your learning
                </p>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Card 
                className="p-6 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all text-center"
                onClick={() => handleSelect('teacher')}
              >
                <Users className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="font-semibold text-lg mb-1">I'm a Teacher</h3>
                <p className="text-sm text-gray-500">
                  Create classes, assign work, and monitor student progress
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}