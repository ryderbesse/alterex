import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Brain, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const CHAT_STORAGE_KEY = 'learningcoach_chat_history';

export default function ChatHistory() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        const { messages: storedMessages } = JSON.parse(stored);
        setMessages(storedMessages || []);
      }
    } catch {
      setMessages([]);
    }
  }, []);

  const userMessages = messages.filter(m => m.role === 'user');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <Link to={createPageUrl('LearningCoach')}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Alt
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Chat History</h1>
            <p className="text-sm text-gray-500">All your conversations with Alt</p>
          </div>
        </div>

        {userMessages.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No chat history yet. Start a conversation with Alt!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {userMessages.map((msg, idx) => (
              <Card key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Message {userMessages.length - idx}
                </p>
                <p className="text-base">{msg.content}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}