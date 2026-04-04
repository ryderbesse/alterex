import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Brain, Send, Loader2, Menu, X, ExternalLink,
  Video, Radio, FileText, Globe, Wrench, Lightbulb
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import BackButton from '@/components/common/BackButton';

export default function TeacherAlt() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const { data: classrooms = [] } = useQuery({
    queryKey: ['teacherClassrooms'],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Classroom.filter({ teacher_email: user.email });
    },
    enabled: !!user?.email
  });

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const classroomInfo = classrooms.map(c => 
        `${c.name} (${c.subject}): ${c.student_emails?.length || 0} students`
      ).join('\n');

      // Build context from previous messages
      const conversationContext = messages.map(m => 
        `${m.role === 'user' ? 'Teacher' : 'Alt'}: ${m.content}`
      ).join('\n\n');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Alt, a teaching assistant AI designed specifically for educators.

Teacher: ${user?.full_name || 'Teacher'}
Their classrooms:
${classroomInfo || 'No classrooms yet'}

Previous conversation:
${conversationContext}

Teacher's question: ${userMessage}

IMPORTANT: If the teacher's question lacks context or specific information needed to provide a helpful answer, politely ask for more details. For example:
- If they ask about "my students" without specifying which class or grade level
- If they mention an issue but don't provide enough background
- If they ask for resources without specifying subject or age group

Otherwise, provide helpful teaching strategies, classroom management tips, and lesson planning advice tailored to their students' needs.

Focus on:
- Differentiated instruction strategies
- Engaging activities for different learning styles
- Assessment and feedback techniques
- Classroom management best practices
- Ways to support diverse learners

When suggesting resources (like teaching materials, videos, articles), provide:
1. The resource name/title
2. A brief description
3. A real, working URL/link to the resource

Keep responses practical, actionable, and teacher-focused.`,
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
        content: response.response,
        resources: response.suggested_resources || []
      }]);
    } catch (err) {
      console.error('Failed to get response:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.',
        isError: true
      }]);
    }
    setLoading(false);
  };

  const resourceIcons = {
    video: Video,
    podcast: Radio,
    article: FileText,
    website: Globe,
    tool: Wrench
  };

  const clearHistory = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar - Desktop */}
      <div className="hidden md:block w-64 border-r bg-white dark:bg-gray-800 overflow-y-auto flex flex-col">
        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="font-semibold mb-3 text-sm text-gray-500">Chat History</h3>
          {messages.filter(m => m.role === 'user').length === 0 ? (
            <p className="text-sm text-gray-400">No conversations yet</p>
          ) : (
            <div className="space-y-2">
              {messages.filter(m => m.role === 'user').map((msg, idx) => (
                <Card key={idx} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <p className="text-sm line-clamp-2">{msg.content}</p>
                </Card>
              ))}
            </div>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="w-full mt-4" onClick={clearHistory}>
              Clear History
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSidebar(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-800 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Chat History</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              {messages.filter(m => m.role === 'user').length === 0 ? (
                <p className="text-sm text-gray-400">No conversations yet</p>
              ) : (
                <div className="space-y-2">
                  {messages.filter(m => m.role === 'user').map((msg, idx) => (
                    <Card key={idx} className="p-3">
                      <p className="text-sm line-clamp-2">{msg.content}</p>
                    </Card>
                  ))}
                </div>
              )}
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full mt-4" onClick={clearHistory}>
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
              <BackButton to="TeacherHome" label="Home" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Brain className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Alt for Teachers</h1>
                  <p className="text-sm text-gray-500">Your teaching assistant</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-4xl mx-auto w-full p-4 overflow-y-auto pb-24">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Welcome, Teacher!</h2>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                I'm here to help with teaching strategies, lesson planning, and classroom management.
              </p>
              <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {[
                  "Engaging visual learners?",
                  "Differentiated instruction tips?",
                  "Assess student understanding?",
                  "Managing diverse classrooms?"
                ].map((prompt, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="text-left h-auto py-3 px-4 whitespace-normal"
                    onClick={() => setInput(prompt)}
                  >
                    <Lightbulb className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm leading-tight">{prompt}</span>
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
                      ? 'bg-emerald-600 text-white' 
                      : msg.isError 
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-white dark:bg-gray-800'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    
                    {msg.resources && msg.resources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
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
                              className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                            >
                              <div className="flex items-start gap-3">
                                <ResourceIcon className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm group-hover:text-emerald-600 transition-colors">
                                    {resource.title}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {resource.description}
                                  </p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 flex-shrink-0" />
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
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-white dark:bg-gray-800 md:pl-80">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about teaching strategies, lesson plans, or classroom management..."
                disabled={loading}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!input.trim() || loading}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}