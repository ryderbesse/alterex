import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { Sparkles, ArrowRight, Loader2, BookOpen, Lightbulb } from 'lucide-react';
import BackButton from '@/components/common/BackButton';
import { motion } from 'framer-motion';

export default function DailyTopic() {
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFullContent, setShowFullContent] = useState(false);
  const [fullContent, setFullContent] = useState('');
  const [loadingFull, setLoadingFull] = useState(false);

  useEffect(() => {
    loadDailyTopic();
  }, []);

  const loadDailyTopic = async () => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('daily_topic');
    
    if (stored) {
      const { topic: storedTopic, date } = JSON.parse(stored);
      if (date === today) {
        setTopic(storedTopic);
        setLoading(false);
        return;
      }
    }

    // Generate new topic
    setLoading(true);
    try {
      // Load persistent history of all previous topic titles
      const historyRaw = localStorage.getItem('daily_topic_history');
      const previousTopics = historyRaw ? JSON.parse(historyRaw) : [];

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate an interesting "did you know" fact about a random educational topic. 
        
Make it engaging, surprising, and educational. Topics can range from science, history, nature, technology, culture, space, animals, human body, geography, mathematics, art, psychology, etc.

STRICT REQUIREMENT: You MUST NOT generate a topic that is the same as or closely related to ANY of the following previously shown topics. Choose something entirely different in subject matter:
${previousTopics.length > 0 ? previousTopics.map((t, i) => `${i + 1}. ${t}`).join('\n') : 'None yet - generate any topic'}

Pick a completely different subject area from the ones listed above.
        
Provide:
1. A catchy title
2. A brief teaser (2-3 sentences) that hooks the reader
3. Category of the topic
4. 3-5 fascinating related facts

DO NOT include any citations, sources, or references in your response.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            teaser: { type: "string" },
            category: { type: "string" },
            quick_facts: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      // Add new topic to persistent history (keep last 90 entries)
      const updatedHistory = [...previousTopics, result.title].slice(-90);
      localStorage.setItem('daily_topic_history', JSON.stringify(updatedHistory));

      localStorage.setItem('daily_topic', JSON.stringify({
        topic: result,
        date: today
      }));
      
      setTopic(result);
    } catch (err) {
      console.error('Failed to load topic:', err);
    }
    setLoading(false);
  };

  const handleLearnMore = async () => {
    setLoadingFull(true);
    setShowFullContent(true);
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Provide a comprehensive, engaging explanation about: ${topic.title}

Include:
- Detailed explanation
- Historical context or discoveries
- Why it's significant
- Recent developments or interesting applications
- Fun facts and trivia

Make it educational but entertaining, suitable for curious learners.
IMPORTANT: Do not include any source links or references in your response.`
      });

      setFullContent(result);
    } catch (err) {
      console.error('Failed to load full content:', err);
      setFullContent('Failed to load content. Please try again.');
    }
    setLoadingFull(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-coral-50 to-rose-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 overflow-auto">
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-8">
        <div className="mb-6">
          <BackButton />
        </div>

        {!showFullContent ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4 md:p-8 bg-gradient-to-br from-orange-500 to-rose-500 text-white mb-3 md:mb-4">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <Sparkles className="w-6 h-6 md:w-8 md:h-8" />
                <div>
                  <p className="text-xs md:text-sm opacity-90">Daily Discovery</p>
                  <p className="text-[10px] md:text-xs opacity-75">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
              </div>
              <h1 className="text-lg md:text-2xl font-bold mb-2 leading-tight">{topic.title}</h1>
              <span className="inline-block px-2 md:px-3 py-1 bg-white/20 rounded-full text-xs md:text-sm">
                {topic.category}
              </span>
            </Card>

            <Card className="p-4 md:p-6 mb-4 md:mb-6">
              <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-4 md:mb-6">
                {topic.teaser}
              </p>

              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Lightbulb className="w-3 h-3 md:w-4 md:h-4 text-orange-600" />
                  Quick Facts
                </div>
                {topic.quick_facts?.map((fact, idx) => (
                  <div key={idx} className="flex gap-2 md:gap-3">
                    <span className="text-orange-600 font-bold text-sm md:text-base">{idx + 1}.</span>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{fact}</p>
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleLearnMore}
                className="w-full bg-orange-600 hover:bg-orange-700 text-sm md:text-base py-2 md:py-3"
              >
                <BookOpen className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                Learn More
                <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-2" />
              </Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">{topic.title}</h2>
              {loadingFull ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed">{fullContent}</p>
                </div>
              )}
              <Button 
                variant="outline" 
                onClick={() => setShowFullContent(false)}
                className="mt-6"
              >
                Back to Quick Facts
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}