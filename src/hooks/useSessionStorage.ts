import { useState, useEffect } from 'react';

interface Message {
  _id: string; // Changed from id to _id for MongoDB
  type: 'ai' | 'user';
  content: string;
  chartData?: any;
  timestamp: Date;
  sessionId?: string;
  messageOrder: number;
}

const MAX_MESSAGES = 4;

export const useSessionStorage = () => {
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);

  // Load messages from session storage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('recentMessages');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentMessages(parsed);
      } catch (error) {
        console.error('Error parsing stored messages:', error);
        sessionStorage.removeItem('recentMessages');
      }
    }
  }, []);

  // Save messages to session storage whenever they change
  useEffect(() => {
    sessionStorage.setItem('recentMessages', JSON.stringify(recentMessages));
  }, [recentMessages]);

  const addMessage = (message: Omit<Message, '_id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      _id: Date.now().toString(), // Generate a temporary ID for session storage
      timestamp: new Date()
    };

    setRecentMessages(prev => {
      const updated = [newMessage, ...prev];
      return updated.slice(0, MAX_MESSAGES);
    });
  };

  const clearMessages = () => {
    setRecentMessages([]);
    sessionStorage.removeItem('recentMessages');
  };

  const getRecentMessages = () => {
    return [...recentMessages].reverse(); // Return in chronological order
  };

  return {
    recentMessages,
    addMessage,
    clearMessages,
    getRecentMessages
  };
};
