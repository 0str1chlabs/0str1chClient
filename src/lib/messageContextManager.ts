import api from '@/lib/api';

/**
 * Message Context Manager
 * Manages conversation history with localStorage (max 15 messages) and DB storage
 * When 15 messages exceeded: summarize → push to DB → clear localStorage → start fresh
 * On page load: if localStorage empty, fetch from DB
 */

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  messageId?: string;
}

export interface ConversationContext {
  summary?: string; // Summary of older messages (from DB)
  recentMessages: ConversationMessage[]; // Recent messages in full (from localStorage or DB)
  totalMessages: number; // Total number of messages in conversation
}

export class MessageContextManager {
  private messages: ConversationMessage[] = [];
  private summary: string = '';
  private readonly MAX_LOCALSTORAGE_MESSAGES = 15; // Max messages to keep in localStorage
  private readonly STORAGE_KEY = 'ai_conversation_context'; // localStorage key for messages
  private readonly STORAGE_KEY_SUMMARY = 'ai_conversation_summary'; // localStorage key for summary

  // Token limits for AI models (approximate: 1 token ≈ 4 characters)
  private readonly MAX_CONTEXT_TOKENS = 2000; // Max tokens for context (conservative limit)
  private readonly MAX_SUMMARY_TOKENS = 200; // Max tokens for summary
  private readonly MAX_RECENT_MESSAGES_TOKENS = 1500; // Max tokens for recent messages
  private readonly TOKEN_CHAR_RATIO = 4; // Approximate: 1 token = 4 characters

  private userEmail: string | null = null;
  private authToken: string | null = null;

  constructor() {
    // Load persisted context from localStorage on initialization
    this.loadFromStorage();
  }

  /**
   * Set user credentials for DB operations
   */
  setUserCredentials(userEmail: string | null, authToken: string | null): void {
    this.userEmail = userEmail;
    this.authToken = authToken;
  }

  /**
   * Estimate token count from text (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / this.TOKEN_CHAR_RATIO);
  }

  /**
   * Truncate text to fit within token limit
   */
  private truncateToTokenLimit(text: string, maxTokens: number): string {
    const maxChars = maxTokens * this.TOKEN_CHAR_RATIO;
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars - 3) + '...';
  }

  /**
   * Load conversation context from localStorage
   */
  private loadFromStorage(): void {
    try {
      // Load messages
      const storedMessages = localStorage.getItem(this.STORAGE_KEY);
      if (storedMessages) {
        const parsed = JSON.parse(storedMessages);
        if (Array.isArray(parsed)) {
          this.messages = parsed;
          console.log(`📦 Loaded ${this.messages.length} messages from localStorage`);
        }
      }

      // Load summary
      const storedSummary = localStorage.getItem(this.STORAGE_KEY_SUMMARY);
      if (storedSummary) {
        this.summary = storedSummary;
        console.log(`📦 Loaded conversation summary from localStorage`);
      }
    } catch (error) {
      console.error('❌ Error loading conversation context from localStorage:', error);
      // Clear corrupted data
      this.clearStorage();
    }
  }

  /**
   * Load messages from database if localStorage is empty
   */
  async loadFromDatabase(): Promise<void> {
    // Only load from DB if localStorage is empty
    if (this.messages.length > 0) {
      console.log('📦 localStorage has messages, skipping DB load');
      return;
    }

    if (!this.userEmail || !this.authToken) {
      console.log('⚠️ No user credentials, skipping DB load');
      return;
    }

    try {
      console.log('📥 Loading messages from database...');

      // Fetch recent messages and summary from DB
      // Use api client for encryption and correct path
      const response = await api.get('/ai/messages/context');

      if (response.status === 200) {
        const data = response.data;

        // Load messages (max 15, exclude summary messages)
        if (data.messages && Array.isArray(data.messages)) {
          // Filter out summary messages and limit to MAX_LOCALSTORAGE_MESSAGES
          this.messages = data.messages
            .filter((msg: any) => msg.type !== 'summary')
            .slice(0, this.MAX_LOCALSTORAGE_MESSAGES)
            .map((msg: any) => ({
              role: msg.type === 'user' ? 'user' : 'assistant',
              content: msg.content,
              timestamp: new Date(msg.timestamp).getTime(),
              messageId: msg.id
            }));
          console.log(`📦 Loaded ${this.messages.length} messages from database`);
        }

        // Load summary if available
        if (data.summary) {
          this.summary = data.summary;
          console.log(`📦 Loaded conversation summary from database`);
        }

        // Save to localStorage for future use
        this.saveToStorage();
      } else {
        console.log('⚠️ No messages found in database or error loading');
      }
    } catch (error) {
      console.error('❌ Error loading messages from database:', error);
      // Continue without DB data
    }
  }

  /**
   * Save conversation context to localStorage
   */
  private saveToStorage(): void {
    try {
      // Save messages (only up to MAX_LOCALSTORAGE_MESSAGES)
      const messagesToSave = this.messages.slice(-this.MAX_LOCALSTORAGE_MESSAGES);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(messagesToSave));

      // Save summary
      if (this.summary) {
        localStorage.setItem(this.STORAGE_KEY_SUMMARY, this.summary);
      } else {
        localStorage.removeItem(this.STORAGE_KEY_SUMMARY);
      }
    } catch (error) {
      console.error('❌ Error saving conversation context to localStorage:', error);
      // If storage is full, try to clear old data
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded, clearing old conversation data');
        this.clearStorage();
      }
    }
  }

  /**
   * Save summary to database and clear localStorage
   */
  private async saveSummaryToDatabase(): Promise<void> {
    if (!this.userEmail || !this.authToken) {
      console.warn('⚠️ No user credentials, cannot save to database');
      return;
    }

    if (this.messages.length === 0 && !this.summary) {
      console.log('📦 No messages to save to database');
      return;
    }

    try {
      console.log('💾 Saving conversation summary to database...');

      // Create summary of all messages
      const summaryText = this.createSummary(this.messages);

      // Combine with existing summary if any
      const finalSummary = this.summary
        ? `${this.summary}\n\n${summaryText}`
        : summaryText;

      // Truncate if too long
      const truncatedSummary = this.truncateToTokenLimit(finalSummary, this.MAX_SUMMARY_TOKENS);

      // Save to database
      // Use api client for encryption and correct path
      const response = await api.post('/ai/messages/save-summary', {
        summary: truncatedSummary,
        messageCount: this.messages.length
      });

      if (response.status === 200) {
        console.log('✅ Successfully saved summary to database');

        // Clear localStorage and reset
        this.clearStorage();
        this.messages = [];
        this.summary = truncatedSummary; // Keep summary in memory for context

        console.log('🔄 Cleared localStorage, starting fresh');
      } else {
        console.error('❌ Failed to save summary to database:', response.data);
      }
    } catch (error) {
      console.error('❌ Error saving summary to database:', error);
      // Continue even if DB save fails
    }
  }

  /**
   * Create a summary of messages
   */
  private createSummary(messages: ConversationMessage[]): string {
    if (messages.length === 0) return '';

    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    // Group messages by topic (simple heuristic: consecutive similar messages)
    const topics: string[] = [];
    let currentTopic: string[] = [];

    userMessages.forEach((msg, index) => {
      const preview = msg.content.substring(0, 50).replace(/\n/g, ' ').trim();
      if (preview) {
        currentTopic.push(preview);

        // If we have 3+ messages or hit a natural break, save topic
        if (currentTopic.length >= 3 || index === userMessages.length - 1) {
          const topicSummary = currentTopic.slice(0, 3).join('; ');
          topics.push(topicSummary);
          currentTopic = [];
        }
      }
    });

    // If we have remaining messages, add them
    if (currentTopic.length > 0) {
      topics.push(currentTopic.slice(0, 3).join('; '));
    }

    const summary = `Previous conversation (${messages.length} messages, ${userMessages.length} user questions): `;
    const topicsText = topics.length > 0
      ? topics.join(' | ')
      : userMessages.slice(0, 5).map(m => m.content.substring(0, 30)).join('; ');

    return `${summary}${topicsText}`;
  }

  /**
   * Clear localStorage storage
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.STORAGE_KEY_SUMMARY);
    } catch (error) {
      console.error('❌ Error clearing localStorage:', error);
    }
  }

  /**
   * Add a new message to the conversation
   */
  async addMessage(role: 'user' | 'assistant', content: string, messageId?: string): Promise<void> {
    this.messages.push({
      role,
      content,
      timestamp: Date.now(),
      messageId
    });

    // If we exceed MAX_LOCALSTORAGE_MESSAGES, summarize and push to DB
    if (this.messages.length > this.MAX_LOCALSTORAGE_MESSAGES) {
      console.log(`📊 Exceeded ${this.MAX_LOCALSTORAGE_MESSAGES} messages, summarizing and pushing to DB...`);
      await this.saveSummaryToDatabase();
    } else {
      // Persist to localStorage after adding message
      this.saveToStorage();
    }
  }

  /**
   * Get the current conversation context for AI
   */
  getContext(): ConversationContext {
    return {
      summary: this.summary || undefined,
      recentMessages: this.messages,
      totalMessages: this.messages.length
    };
  }

  /**
   * Get formatted context string for AI prompt (token-limited)
   */
  getFormattedContext(): string {
    const context = this.getContext();
    let formatted = '';
    let totalTokens = 0;

    // Add summary if available (token-limited)
    if (context.summary) {
      const summaryTokens = this.estimateTokens(context.summary);
      if (summaryTokens <= this.MAX_SUMMARY_TOKENS) {
        formatted += `CONVERSATION SUMMARY (earlier messages):\n${context.summary}\n\n`;
        totalTokens += summaryTokens;
      } else {
        const truncatedSummary = this.truncateToTokenLimit(context.summary, this.MAX_SUMMARY_TOKENS);
        formatted += `CONVERSATION SUMMARY (earlier messages):\n${truncatedSummary}\n\n`;
        totalTokens += this.MAX_SUMMARY_TOKENS;
      }
    }

    // Add recent messages (token-limited, prioritize most recent)
    if (context.recentMessages.length > 0) {
      formatted += 'RECENT CONVERSATION:\n';

      const messagesToInclude: ConversationMessage[] = [];
      let messagesTokens = 0;

      // Start from most recent and work backwards
      for (let i = context.recentMessages.length - 1; i >= 0; i--) {
        const msg = context.recentMessages[i];
        const msgText = `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        const msgTokens = this.estimateTokens(msgText);

        if (messagesTokens + msgTokens > this.MAX_RECENT_MESSAGES_TOKENS) {
          break;
        }

        messagesToInclude.unshift(msg);
        messagesTokens += msgTokens;
      }

      messagesToInclude.forEach(msg => {
        const msgText = `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        formatted += msgText;
      });

      totalTokens += messagesTokens;
      console.log(`💬 Context tokens: Summary=${this.estimateTokens(context.summary || '')}, Messages=${messagesTokens}, Total=${totalTokens}`);
    }

    // Final check: if total exceeds limit, truncate
    if (totalTokens > this.MAX_CONTEXT_TOKENS) {
      const maxChars = this.MAX_CONTEXT_TOKENS * this.TOKEN_CHAR_RATIO;
      formatted = formatted.substring(0, maxChars - 3) + '...';
      console.warn(`⚠️ Context truncated to ${this.MAX_CONTEXT_TOKENS} tokens`);
    }

    return formatted;
  }

  /**
   * Clear all conversation history
   */
  clear(): void {
    this.messages = [];
    this.summary = '';
    this.clearStorage();
  }

  /**
   * Get all messages (for debugging)
   */
  getAllMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  /**
   * Get summary (for debugging)
   */
  getSummary(): string {
    return this.summary;
  }

  /**
   * Get token count estimate for current context
   */
  getTokenEstimate(): number {
    const formatted = this.getFormattedContext();
    return this.estimateTokens(formatted);
  }
}

// Singleton instance per user/session
let contextManagerInstance: MessageContextManager | null = null;

export function getMessageContextManager(): MessageContextManager {
  if (!contextManagerInstance) {
    contextManagerInstance = new MessageContextManager();
  }
  return contextManagerInstance;
}

export function resetMessageContextManager(): void {
  contextManagerInstance = null;
}
