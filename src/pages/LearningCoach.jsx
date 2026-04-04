import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Brain, Send, Loader2, AlertTriangle, ThumbsUp, ThumbsDown,
  Lightbulb, BookOpen, Headphones, Eye, Hand, PenLine, ExternalLink, Menu, X,
  Video, Radio, FileText, Globe, Wrench, Calendar as CalendarIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import BackButton from '@/components/common/BackButton';
import LearningStyleQuiz from '@/components/learning/LearningStyleQuiz';
import { motion, AnimatePresence } from 'framer-motion';

const styleIcons = {
  visual: Eye,
  auditory: Headphones,
  kinesthetic: Hand,
  reading_writing: PenLine,
  logical: Brain,
  social: BookOpen
};

const styleColors = {
  visual: 'bg-blue-100 text-blue-700',
  auditory: 'bg-purple-100 text-purple-700',
  kinesthetic: 'bg-orange-100 text-orange-700',
  reading_writing: 'bg-emerald-100 text-emerald-700',
  logical: 'bg-cyan-100 text-cyan-700',
  social: 'bg-pink-100 text-pink-700'
};

const CHAT_STORAGE_KEY = 'learningcoach_chat_history';
const CHAT_EXPIRY_HOURS = 24;

// Clean AI responses by removing citations, links, and URLs
const cleanAIResponse = (text) => {
  if (!text) return text;
  
  let cleaned = text;
  
  // Remove citation markers like [1], [2], etc.
  cleaned = cleaned.replace(/\[\d+\]/g, '');
  
  // Remove markdown links [text](url) but keep the text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // Remove standalone URLs (http://, https://, www.)
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
  cleaned = cleaned.replace(/www\.[^\s]+/g, '');
  
  // Remove citation parentheses like (Source: ...) or (https://...)
  cleaned = cleaned.replace(/\(Source:.*?\)/gi, '');
  cleaned = cleaned.replace(/\(https?:\/\/[^\)]+\)/g, '');
  
  // Clean up extra spaces on same line but preserve line breaks
  cleaned = cleaned.replace(/ +/g, ' ').trim();
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned;
};

const loadStoredMessages = () => {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!stored) return [];
    const { messages, timestamp } = JSON.parse(stored);
    const hoursSinceStored = (Date.now() - timestamp) / (1000 * 60 * 60);
    if (hoursSinceStored > CHAT_EXPIRY_HOURS) {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      return [];
    }
    return messages;
  } catch {
    return [];
  }
};

const saveMessages = (messages) => {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
    messages,
    timestamp: Date.now()
  }));
};

export default function LearningCoach() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [messages, setMessages] = useState(() => loadStoredMessages());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      return profiles[0];
    },
    enabled: !!user?.email
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['upcomingAssignments', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Assignment.filter({ created_by: user.email }, 'due_date');
    },
    enabled: !!user?.email
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Class.filter({ created_by: user.email });
    },
    enabled: !!user?.email
  });

  useEffect(() => {
    // Show quiz if user hasn't completed it - this is required before using the coach
    if (userProfile !== undefined && (!userProfile || !userProfile.quiz_completed)) {
      setShowQuiz(true);
    }
  }, [userProfile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Rotate prompts every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromptIndex((prev) => (prev + 1) % 20); // Cycle through prompts
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  const handleQuizComplete = async (results) => {
    if (userProfile) {
      await base44.entities.UserProfile.update(userProfile.id, {
        ...results,
        quiz_completed: true
      });
    } else {
      await base44.entities.UserProfile.create({
        ...results,
        quiz_completed: true,
        user_type: 'student'
      });
    }
    queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    setShowQuiz(false);
    
    // Add welcome message
    setMessages([{
      role: 'assistant',
      content: `Welcome! I've identified you as a ${results.learning_style.replace('_', '/')} learner. I'll tailor my study recommendations to match your style. How can I help you today?`
    }]);
  };

  const isQuestionAboutAnswers = (text) => {
    const patterns = [
      /what('s| is) the answer/i,
      /give me the answer/i,
      /tell me the answer/i,
      /solve this/i,
      /do (this|my) (homework|assignment|work)/i,
      /complete this for me/i,
      /write (this|my) (essay|paper)/i,
      /what is \d+\s*[\+\-\*\/x]\s*\d+/i,
      /calculate/i,
      /who (was|is|were)/i,
      /when (did|was|is)/i,
      /where (did|was|is)/i,
      /explain (the|this) (answer|solution)/i,
      /help me (finish|complete|do)/i
    ];
    return patterns.some(p => p.test(text));
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // Check if user is asking for direct answers
    if (isQuestionAboutAnswers(userMessage)) {
      setShowErrorMessage(true);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "⚠️ I can't provide direct answers to homework or assignment questions.\n\nI'm here to help you learn more effectively, not to do your work for you. Instead, I can:\n\n• Suggest study techniques for this topic\n• Explain concepts in ways that match your learning style\n• Help you break down the problem into steps\n• Recommend resources to learn the material\n\nPlease rephrase your question to ask HOW to learn or study the topic better.",
        isError: true
      }]);
      setLoading(false);
      return;
    }

    try {
      // Filter out assignments from deleted classes
      const validAssignments = assignments.filter(a => {
        if (!a.class_id) return true;
        return classes.some(c => c.id === a.class_id);
      });

      const upcomingAssignmentsInfo = validAssignments
        .filter(a => a.status !== 'completed')
        .slice(0, 5)
        .map(a => `- ${a.title} (${a.type}, due: ${a.due_date})`).join('\n');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a personalized learning coach for a ${userProfile?.learning_style?.replace('_', '/')} learner. 

User's learning style: ${userProfile?.learning_style || 'not determined'}
Learning style scores: ${JSON.stringify(userProfile?.learning_style_scores || {})}

Upcoming assignments:
${upcomingAssignmentsInfo || 'None'}

User message: ${userMessage}

Provide helpful study tips, learning strategies, and recommendations tailored to their learning style. 
- For visual learners: suggest diagrams, videos, color-coding, mind maps
- For auditory learners: suggest podcasts, discussions, recording notes, verbal repetition
- For kinesthetic learners: suggest hands-on activities, movement, practice problems
- For reading/writing learners: suggest note-taking, rewriting, lists, written summaries
- For logical learners: suggest organizing information, finding patterns, step-by-step analysis
- For social learners: suggest study groups, teaching others, discussion

When suggesting resources (like podcasts, videos, articles, websites), provide:
1. The resource name/title
2. A brief description of why it's helpful
3. IMPORTANT: A real, working URL/link to the resource

CRITICAL: Do NOT include inline citations or reference numbers (like [1], [2], etc.) in your response text. Write naturally without citations. Only list resources in the suggested_resources array.

IMPORTANT: Never provide direct answers to homework or assignment questions. Instead, guide them on HOW to learn and study effectively.

Respond in a friendly, encouraging tone. Keep responses concise but helpful.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            response: { type: "string" },
            suggested_resources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  url: { type: "string" },
                  type: { type: "string", enum: ["video", "podcast", "article", "website", "tool"] }
                }
              }
            }
          }
        }
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: cleanAIResponse(response.response),
        resources: response.suggested_resources || []
      }]);
      
      // Occasionally ask for feedback
      if (messages.length > 4 && messages.length % 5 === 0) {
        setTimeout(() => setShowFeedback(true), 1000);
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    }
    setLoading(false);
  };

  const handleFeedback = async (helpful, comments = '') => {
    if (userProfile) {
      const feedback = {
        date: new Date().toISOString(),
        helpful,
        comments
      };
      await base44.entities.UserProfile.update(userProfile.id, {
        feedback_history: [...(userProfile.feedback_history || []), feedback]
      });
    }
    setShowFeedback(false);
  };

  const StyleIcon = userProfile?.learning_style ? styleIcons[userProfile.learning_style] : Brain;

  const resourceIcons = {
    video: Video,
    podcast: Radio,
    article: FileText,
    website: Globe,
    tool: Wrench
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex w-64 border-r bg-white dark:bg-gray-800 flex-col h-screen sticky top-0">
        <div className="p-4 border-b overflow-y-auto max-h-[40vh]">
          <h3 className="font-semibold mb-3 text-sm text-gray-500">Study Plan</h3>
          <div className="space-y-1.5">
            {assignments
              .filter(a => a.status !== 'completed')
              .filter(a => !a.class_id || classes.some(c => c.id === a.class_id))
              .filter(a => {
                const daysUntil = Math.ceil((new Date(a.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                return a.priority === 'high' || daysUntil <= 7;
              })
              .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
              .slice(0, 3)
              .map(assignment => {
                const classInfo = classes.find(c => c.id === assignment.class_id);
                const daysUntil = Math.ceil((new Date(assignment.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <Button
                    key={assignment.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2 px-2"
                    onClick={() => setInput(`Create a study plan for "${assignment.title}"`)}
                  >
                    <div className="flex flex-col items-start gap-0.5 w-full">
                      <span className="text-xs font-medium line-clamp-1">{assignment.title}</span>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        {assignment.priority === 'high' && (
                          <span className="text-red-600 font-medium">High Priority</span>
                        )}
                        {daysUntil <= 0 ? (
                          <span className="text-red-600">Due today</span>
                        ) : (
                          <span>{daysUntil}d</span>
                        )}
                        {classInfo && <span>• {classInfo.name}</span>}
                      </div>
                    </div>
                  </Button>
                );
              })}
            {assignments.filter(a => a.status !== 'completed' && (!a.class_id || classes.some(c => c.id === a.class_id)) && (a.priority === 'high' || Math.ceil((new Date(a.due_date) - new Date()) / (1000 * 60 * 60 * 24)) <= 7)).length === 0 && (
              <p className="text-xs text-gray-400">No urgent assignments</p>
            )}
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="font-semibold mb-3 text-sm text-gray-500">Chat History</h3>
          {messages.filter(m => m.role === 'user').length === 0 ? (
            <p className="text-sm text-gray-400">No conversations yet</p>
          ) : (
            <div className="space-y-2">
              {messages.filter(m => m.role === 'user').slice(0, 8).map((msg, idx) => (
                <Card key={idx} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <p className="text-xs line-clamp-1">{msg.content.split(' ').slice(0, 4).join(' ')}</p>
                </Card>
              ))}
            </div>
          )}
          {messages.filter(m => m.role === 'user').length > 8 && (
            <Link to={createPageUrl('ChatHistory')}>
              <Button variant="ghost" size="sm" className="w-full mt-4">
                View Full Chat History
              </Button>
            </Link>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="w-full mt-2" onClick={clearHistory}>
              Clear History
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSidebar(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-800 flex flex-col">
            <div className="p-4 border-b overflow-y-auto max-h-[40vh]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Study Plan</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="space-y-1.5">
                {assignments
                  .filter(a => a.status !== 'completed')
                  .filter(a => !a.class_id || classes.some(c => c.id === a.class_id))
                  .filter(a => {
                    const daysUntil = Math.ceil((new Date(a.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                    return a.priority === 'high' || daysUntil <= 7;
                  })
                  .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                  .slice(0, 3)
                  .map(assignment => {
                    const classInfo = classes.find(c => c.id === assignment.class_id);
                    const daysUntil = Math.ceil((new Date(assignment.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <Button
                        key={assignment.id}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left h-auto py-2 px-2"
                        onClick={() => {
                          setInput(`Create a study plan for "${assignment.title}"`);
                          setShowSidebar(false);
                        }}
                      >
                        <div className="flex flex-col items-start gap-0.5 w-full">
                          <span className="text-xs font-medium line-clamp-1">{assignment.title}</span>
                          <div className="flex items-center gap-1 text-[10px] text-gray-500">
                            {assignment.priority === 'high' && (
                              <span className="text-red-600 font-medium">High Priority</span>
                            )}
                            {daysUntil <= 0 ? (
                              <span className="text-red-600">Due today</span>
                            ) : (
                              <span>{daysUntil}d</span>
                            )}
                            {classInfo && <span>• {classInfo.name}</span>}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                {assignments.filter(a => a.status !== 'completed' && (!a.class_id || classes.some(c => c.id === a.class_id)) && (a.priority === 'high' || Math.ceil((new Date(a.due_date) - new Date()) / (1000 * 60 * 60 * 24)) <= 7)).length === 0 && (
                  <p className="text-xs text-gray-400">No urgent assignments</p>
                )}
              </div>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <h3 className="font-semibold mb-3 text-sm text-gray-500">Chat History</h3>
              {messages.filter(m => m.role === 'user').length === 0 ? (
                <p className="text-sm text-gray-400">No conversations yet</p>
              ) : (
                <div className="space-y-2">
                  {messages.filter(m => m.role === 'user').slice(0, 8).map((msg, idx) => (
                    <Card key={idx} className="p-2">
                      <p className="text-xs line-clamp-1">{msg.content.split(' ').slice(0, 4).join(' ')}</p>
                    </Card>
                  ))}
                </div>
              )}
              {messages.filter(m => m.role === 'user').length > 8 && (
                <Link to={createPageUrl('ChatHistory')}>
                  <Button variant="ghost" size="sm" className="w-full mt-4" onClick={() => setShowSidebar(false)}>
                    View Full Chat History
                  </Button>
                </Link>
              )}
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full mt-2" onClick={clearHistory}>
                  Clear History
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <div className="sticky top-0 z-10 p-4 border-b bg-white dark:bg-gray-800">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowSidebar(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              <BackButton />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Brain className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Alt</h1>
                  <p className="text-sm text-gray-500">Your personal learning assistant</p>
                </div>
              </div>
              {userProfile?.learning_style && (
                <Badge className={styleColors[userProfile.learning_style]}>
                  <StyleIcon className="w-3 h-3 mr-1" />
                  {userProfile.learning_style.replace('_', '/')} learner
                </Badge>
              )}
            </div>
          </div>
        </div>

          <div className="flex-1 max-w-4xl mx-auto w-full p-4 pb-36 md:pb-24">
          {messages.length === 0 && userProfile?.quiz_completed && (
            <div className="text-center py-8 md:py-12">
            <Brain className="w-12 h-12 text-violet-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Hello! I'm Alt</h3>
            <p className="text-gray-500 mb-4 max-w-md mx-auto">
              I am your learning assistant designed to help you optimize your learning based on your personal learning style. Ask me questions on how to study the best way for tests or complete assignments to make your learning experience the most efficient possible.
            </p>
            <div className="flex flex-col gap-2 max-w-lg mx-auto">
              {(() => {
                // Dynamic Alt prompts showcasing capabilities
                const basePrompts = [
                  "What's the best way to study for an upcoming test?",
                  "Help me create a study schedule for this week",
                  "Explain the key concepts from my recent materials",
                  "What study techniques work best for my learning style?",
                  "How can I improve my retention of new information?",
                  "Give me tips to stay motivated while studying",
                  "Help me break down a complex topic into simple steps",
                  "What are effective strategies for test preparation?",
                  "How can I better manage my study time?",
                  "Suggest active learning techniques I can try",
                  "Help me identify gaps in my understanding",
                  "What's the best way to review before an exam?",
                  "I learn better with visuals - how can I use that for math?",
                  "What are some good ways to stay focused while studying?"
                ];

                // Add personalized prompts based on upcoming assignments
                const personalizedPrompts = [];
                const upcomingAssignments = assignments
                  .filter(a => a.status !== 'completed' && a.due_date)
                  .filter(a => !a.class_id || classes.some(c => c.id === a.class_id))
                  .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                  .slice(0, 3);

                if (upcomingAssignments.length > 0) {
                  const next = upcomingAssignments[0];
                  personalizedPrompts.push(`Help me prepare for "${next.title}" due soon`);
                  
                  if (upcomingAssignments.length > 1) {
                    personalizedPrompts.push(`Create a study plan for my ${upcomingAssignments.length} upcoming assignments`);
                  }
                  
                  if (next.type === 'test' || next.type === 'quiz') {
                    personalizedPrompts.push(`Give me test-taking strategies for "${next.title}"`);
                  }
                }

                // Combine personalized and base prompts
                const altPrompts = [...personalizedPrompts, ...basePrompts];
                
                // Select 5 prompts rotating based on currentPromptIndex
                const displayPrompts = Array.from({ length: 5 }, (_, i) => 
                  altPrompts[(currentPromptIndex + i) % altPrompts.length]
                );

                return displayPrompts;
              })().map(suggestion => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="text-left h-auto py-2 px-3 whitespace-normal"
                  onClick={() => setInput(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
          )}

          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <Card className={`max-w-[80%] p-4 ${
                    msg.role === 'user' 
                      ? 'bg-violet-600 text-white' 
                      : msg.isError 
                        ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20'
                        : 'bg-white dark:bg-gray-800'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    
                    {msg.resources && msg.resources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          Recommended Resources
                        </p>
                        {msg.resources.map((resource, ridx) => {
                          const ResourceIcon = resourceIcons[resource.type] || Globe;
                          return (
                            <a
                              key={ridx}
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
                            >
                              <div className="flex items-start gap-3">
                                <ResourceIcon className="w-5 h-5 text-violet-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm group-hover:text-violet-600 transition-colors">
                                    {resource.title}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {resource.description}
                                  </p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-violet-600 flex-shrink-0" />
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          {loading && (
            <div className="flex justify-start">
              <Card className="p-4">
                <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
              </Card>
            </div>
          )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-4 border-t bg-white dark:bg-gray-800 md:pl-80">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for study tips or learning strategies..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Learning Style Quiz */}
      <LearningStyleQuiz
        open={showQuiz}
        onClose={() => setShowQuiz(false)}
        onComplete={handleQuizComplete}
      />

      {/* Feedback Dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How are the recommendations?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 mb-4">
            Your feedback helps us improve the Learning Coach for your learning style.
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => handleFeedback(false)}
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              Not helpful
            </Button>
            <Button 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleFeedback(true)}
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Helpful!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}