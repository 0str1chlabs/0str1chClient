import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { tokenUsageService, TokenUsageResponse } from '@/services/tokenUsageService';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TokenUsageCompactProps {
  onRefresh?: () => void;
  className?: string;
}

export const TokenUsageCompact = ({ onRefresh, className = '' }: TokenUsageCompactProps) => {
  const { user } = useAuth();
  const [usage, setUsage] = useState<TokenUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Fetching token usage for:', user.email);
      const data = await tokenUsageService.getUsage(user.email);
      console.log('✅ Token usage data received:', data);
      
      // Validate the response structure
      if (!data || !data.user) {
        console.error('❌ Invalid token usage response:', data);
        // Set default values if response is invalid
        if (!usage) {
          setUsage({
            success: true,
            user: {
              tokensUsed: 0,
              limit: 14000,
              remaining: 14000,
              resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              estimatedMessagesRemaining: 7,
              operations: 0
            },
            global: {
              tokensUsed: 0,
              limit: 150000,
              remaining: 150000,
              resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            },
            tier: 'free',
            tokenCosts: {}
          });
        }
      } else {
        setUsage(data);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('❌ Failed to fetch token usage:', err);
      console.error('Error details:', err instanceof Error ? err.message : String(err));
      // Set default values on error if no previous data exists
      if (!usage) {
        console.warn('⚠️ No previous usage data available, showing default values');
        setUsage({
          success: true,
          user: {
            tokensUsed: 0,
            limit: 14000,
            remaining: 14000,
            resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            estimatedMessagesRemaining: 7,
            operations: 0
          },
          global: {
            tokensUsed: 0,
            limit: 150000,
            remaining: 150000,
            resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          },
          tier: 'free',
          tokenCosts: {}
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch on mount
    fetchUsage();
    
    // Listen for refresh events (after AI operations complete)
    const handleRefresh = () => {
      fetchUsage();
    };
    window.addEventListener('refreshTokenUsage', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshTokenUsage', handleRefresh);
    };
  }, [user?.email]);

  // Show loading state while fetching
  if (!user) {
    return null; // Don't show if user is not authenticated
  }

  if (loading && !usage) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card ${className}`}>
        <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!usage) {
    // Show placeholder if usage data is not available (after loading)
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card ${className}`}>
        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">-- / --</span>
          <Progress value={0} className="h-1" />
        </div>
      </div>
    );
  }

  const usagePercentage = tokenUsageService.getUsagePercentage(
    usage.user.tokensUsed,
    usage.user.limit
  );
  const isLow = usagePercentage >= 80;
  const isCritical = usagePercentage >= 95;
  const remainingMessages = usage.user.estimatedMessagesRemaining;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card hover:bg-accent transition-colors cursor-pointer shadow-sm ${className}`}>
            <Zap className={`h-3.5 w-3.5 flex-shrink-0 ${isCritical ? 'text-destructive' : isLow ? 'text-yellow-600' : 'text-primary'}`} />
            <div className="flex flex-col min-w-[100px]">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium whitespace-nowrap">
                  {tokenUsageService.formatTokens(usage.user.remaining)} / {tokenUsageService.formatTokens(usage.user.limit)}
                </span>
                <Badge variant="outline" className="h-4 px-1 text-[10px] flex-shrink-0">
                  {usage.tier === 'paid' ? 'Pro' : 'Free'}
                </Badge>
              </div>
              <Progress 
                value={usagePercentage} 
                className={`h-1 mt-0.5 ${isCritical ? 'bg-destructive' : isLow ? 'bg-yellow-500' : ''}`}
              />
            </div>
            {loading && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-xs">
            <div className="font-semibold">Token Usage</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Used:</span>
                <span>{tokenUsageService.formatTokens(usage.user.tokensUsed)} / {tokenUsageService.formatTokens(usage.user.limit)}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className={isCritical ? 'text-destructive font-semibold' : ''}>
                  {tokenUsageService.formatTokens(usage.user.remaining)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Messages:</span>
                <span className={remainingMessages <= 2 ? 'text-destructive' : ''}>
                  ~{remainingMessages} remaining
                </span>
              </div>
              <div className="flex justify-between">
                <span>Resets in:</span>
                <span>{tokenUsageService.getTimeUntilReset(usage.user.resetAt)}</span>
              </div>
            </div>
            <div className="pt-1 border-t text-[10px] text-muted-foreground">
              <div>Costs: Message ~2K, Research ~6K, Pivot ~8K, Report ~10K tokens</div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

