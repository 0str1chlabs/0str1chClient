import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { tokenUsageService, TokenUsageResponse } from '@/services/tokenUsageService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export const TokenUsage = () => {
  const { user } = useAuth();
  const [usage, setUsage] = useState<TokenUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchUsage = async () => {
    if (!user?.email) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await tokenUsageService.getUsage(user.email);
      setUsage(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch token usage:', err);
      setError(err instanceof Error ? err.message : 'Failed to load token usage');
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

  if (!user) {
    return null;
  }

  if (loading && !usage) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading usage...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !usage) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) {
    return null;
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
          <Card className="w-full max-w-sm cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Token Usage</CardTitle>
                </div>
                <Badge variant={usage.tier === 'paid' ? 'default' : 'secondary'}>
                  {usage.tier === 'paid' ? 'Pro' : 'Free'}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {usage.user.remaining.toLocaleString()} tokens remaining
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {tokenUsageService.formatTokens(usage.user.tokensUsed)} / {tokenUsageService.formatTokens(usage.user.limit)}
                    </span>
                    <span className={isCritical ? 'text-destructive font-semibold' : isLow ? 'text-yellow-600' : 'text-muted-foreground'}>
                      {usagePercentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={usagePercentage} 
                    className={`h-2 ${isCritical ? 'bg-destructive' : isLow ? 'bg-yellow-500' : ''}`}
                  />
                </div>

                {/* Messages Remaining */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Estimated messages:</span>
                  <span className={remainingMessages <= 2 ? 'text-destructive font-semibold' : remainingMessages <= 5 ? 'text-yellow-600' : 'font-medium'}>
                    ~{remainingMessages} remaining
                  </span>
                </div>

                {/* Reset Time */}
                <div className="flex items-center justify-between text-xs pt-1 border-t">
                  <span className="text-muted-foreground">Resets in:</span>
                  <span className="text-muted-foreground">
                    {tokenUsageService.getTimeUntilReset(usage.user.resetAt)}
                  </span>
                </div>

                {/* Refresh Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchUsage}
                  disabled={loading}
                  className="w-full text-xs"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-xs">
            <div>
              <strong>Token Costs:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>AI Message: ~2,000 tokens</li>
                <li>Research: ~6,000 tokens</li>
                <li>Pivot Table: ~8,000 tokens</li>
                <li>Enhanced Report: ~10,000 tokens</li>
              </ul>
            </div>
            {lastUpdated && (
              <div className="text-muted-foreground pt-1 border-t">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

