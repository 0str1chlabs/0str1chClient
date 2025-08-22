import { useState, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  type: 'ai' | 'user';
  content: string;
  chartData?: any;
  timestamp: Date;
  sessionId?: string;
  messageOrder: number;
}

interface UseSessionStorageReturn {
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp' | 'messageOrder'>) => void;
  clearMessages: () => void;
  loadMessagesFromStorage: () => void;
  hasOlderMessages: boolean;
  setHasOlderMessages: (hasMore: boolean) => void;
}

const SESSION_STORAGE_KEY = 'ai_chat_messages';
const MAX_SESSION_MESSAGES = 4;

export function useSessionStorage(): UseSessionStorageReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);

  // Load messages from session storage on mount
  useEffect(() => {
    loadMessagesFromStorage();
  }, []);

  // Save messages to session storage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const loadMessagesFromStorage = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsedMessages = JSON.parse(stored);
        // Ensure we only keep the most recent 4 messages in session
        const recentMessages = parsedMessages.slice(-MAX_SESSION_MESSAGES);
        setMessages(recentMessages);
      }
    } catch (error) {
      console.error('Error loading messages from session storage:', error);
      setMessages([]);
    }
  }, []);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp' | 'messageOrder'>) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      messageOrder: messages.length + 1,
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      // Keep only the most recent 4 messages in session
      return updated.slice(-MAX_SESSION_MESSAGES);
    });
  }, [messages.length]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  return {
    messages,
    addMessage,
    clearMessages,
    loadMessagesFromStorage,
    hasOlderMessages,
    setHasOlderMessages,
  };
}
