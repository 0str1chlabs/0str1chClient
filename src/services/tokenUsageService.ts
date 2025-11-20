/**
 * Service for fetching and managing token usage information
 */

export interface TokenUsage {
  user: {
    tokensUsed: number;
    limit: number;
    remaining: number;
    resetAt: Date;
    estimatedMessagesRemaining: number;
    operations: number;
  };
  global: {
    tokensUsed: number;
    limit: number;
    remaining: number;
    resetAt: Date;
  };
  tier: 'free' | 'paid';
  tokenCosts: {
    aiMessage: { inputTokens: number; outputTokens: number };
    tavilyResearch: { inputTokens: number; outputTokens: number };
    pivotTable: { inputTokens: number; outputTokens: number };
    enhancedReport: { inputTokens: number; outputTokens: number };
  };
}

export interface TokenUsageResponse {
  success: boolean;
  user: TokenUsage['user'];
  global: TokenUsage['global'];
  tier: TokenUsage['tier'];
  tokenCosts: TokenUsage['tokenCosts'];
}

class TokenUsageService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090';
  }

  /**
   * Fetch current token usage for the authenticated user
   */
  async getUsage(userEmail?: string): Promise<TokenUsageResponse> {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      
      const url = userEmail 
        ? `${this.baseUrl}/api/ai/usage?userEmail=${encodeURIComponent(userEmail)}`
        : `${this.baseUrl}/api/ai/usage`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token usage API error response:', response.status, errorText);
        throw new Error(`Failed to fetch token usage: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Raw token usage API response:', data);
      
      // Validate response structure
      if (!data || !data.success) {
        console.warn('⚠️ Token usage API returned unsuccessful response:', data);
      }
      
      // Convert date strings to Date objects
      if (data.user?.resetAt) {
        data.user.resetAt = new Date(data.user.resetAt);
      }
      if (data.global?.resetAt) {
        data.global.resetAt = new Date(data.global.resetAt);
      }

      return data;
    } catch (error) {
      console.error('Error fetching token usage:', error);
      throw error;
    }
  }

  /**
   * Format token count for display
   */
  formatTokens(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(2)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toLocaleString();
  }

  /**
   * Calculate percentage used
   */
  getUsagePercentage(used: number, limit: number): number {
    if (limit === 0) return 0;
    return Math.min(100, Math.max(0, (used / limit) * 100));
  }

  /**
   * Get time until reset (formatted string)
   */
  getTimeUntilReset(resetAt: Date): string {
    const now = new Date();
    const diff = resetAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Reset now';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

export const tokenUsageService = new TokenUsageService();

