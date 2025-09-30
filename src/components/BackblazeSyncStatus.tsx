/**
 * Backblaze Sync Status Component
 * 
 * Displays the current sync status and allows manual sync trigger
 */

import React, { useState, useEffect } from 'react';
import { backblazeSyncManager } from '@/lib/backblazeSyncManager';
import { Cloud, CloudOff, RefreshCw, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';

export const BackblazeSyncStatus: React.FC = () => {
  const [stats, setStats] = useState(backblazeSyncManager.getSyncStats());
  const [isSyncing, setIsSyncing] = useState(false);
  const [, forceUpdate] = useState(0);

  // Update stats every second
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(backblazeSyncManager.getSyncStats());
      forceUpdate(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleForceSyncClick = async () => {
    setIsSyncing(true);
    try {
      const success = await backblazeSyncManager.forceSyncNow();
      if (success) {
        // Update stats immediately
        setStats(backblazeSyncManager.getSyncStats());
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const formatTime = (ms: number): string => {
    if (ms < 0) return 'Never';
    if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
    return `${Math.floor(ms / 86400000)}d ago`;
  };

  const formatTimeUntil = (ms: number | null): string => {
    if (ms === null || ms < 0) return 'Not scheduled';
    if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  // Check both 'token' and 'auth_token' for compatibility
  const isAuthenticated = !!(localStorage.getItem('token') || localStorage.getItem('auth_token'));

  const getSyncIcon = () => {
    if (!isAuthenticated && stats.hasUnsyncedChanges) return <CloudOff className="h-4 w-4 text-gray-400" />;
    if (isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (stats.hasUnsyncedChanges) return <CloudOff className="h-4 w-4" />;
    if (stats.lastSyncStatus === 'success') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (stats.lastSyncStatus === 'failed') return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Cloud className="h-4 w-4" />;
  };

  const getSyncStatusColor = () => {
    if (isSyncing) return 'text-blue-500';
    if (stats.hasUnsyncedChanges) return 'text-orange-500';
    if (stats.lastSyncStatus === 'success') return 'text-green-500';
    if (stats.lastSyncStatus === 'failed') return 'text-red-500';
    return 'text-gray-500';
  };

  const getSyncProgress = (): number => {
    if (!stats.timeUntilNextSync) return 0;
    const totalTime = 5 * 60 * 1000; // 5 minutes
    const remaining = stats.timeUntilNextSync;
    return ((totalTime - remaining) / totalTime) * 100;
  };

  const getBreakdown = () => {
    return backblazeSyncManager.getChangeBreakdownBySheet();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 ${getSyncStatusColor()}`}
        >
          {getSyncIcon()}
          <span className="text-xs">
            {stats.hasUnsyncedChanges 
              ? `${stats.pendingChanges} unsaved` 
              : 'Synced'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Backblaze Sync Status
            </h3>
            {stats.hasUnsyncedChanges && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleForceSyncClick}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  'Sync Now'
                )}
              </Button>
            )}
          </div>

          <div className="space-y-2 text-xs">
            {/* Pending Changes */}
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-gray-600">Pending Changes</span>
              <span className="font-medium">{stats.pendingChanges}</span>
            </div>

            {/* AI vs Manual Breakdown */}
            {stats.pendingChanges > 0 && (
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                <div className="flex gap-3">
                  <span className="text-blue-600">
                    🤖 AI: {stats.aiChanges}
                  </span>
                  <span className="text-green-600">
                    ✏️ Manual: {stats.manualChanges}
                  </span>
                </div>
              </div>
            )}

            {/* Last Sync Time */}
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-gray-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last Sync
              </span>
              <span className="font-medium">{formatTime(stats.timeSinceLastSync)}</span>
            </div>

            {/* Next Sync Time */}
            {stats.hasUnsyncedChanges && stats.timeUntilNextSync !== null && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Next Sync
                  </span>
                  <span className="font-medium">{formatTimeUntil(stats.timeUntilNextSync)}</span>
                </div>
                <Progress value={getSyncProgress()} className="h-1" />
              </div>
            )}

            {/* Total Syncs */}
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-gray-600">Total Syncs</span>
              <span className="font-medium">{stats.totalSyncs}</span>
            </div>

            {/* Change Breakdown by Sheet */}
            {stats.pendingChanges > 0 && (
              <div className="mt-3 pt-3 border-t">
                <h4 className="text-xs font-semibold mb-2 text-gray-700">Changes by Sheet</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {Array.from(getBreakdown().entries()).map(([sheetId, breakdown]) => (
                    <div key={sheetId} className="flex justify-between items-center p-1.5 bg-gray-50 rounded text-xs">
                      <span className="truncate flex-1 text-gray-700">{breakdown.sheetName}</span>
                      <div className="flex gap-2 text-xs">
                        {breakdown.aiChanges > 0 && (
                          <span className="text-blue-600">🤖 {breakdown.aiChanges}</span>
                        )}
                        {breakdown.manualChanges > 0 && (
                          <span className="text-green-600">✏️ {breakdown.manualChanges}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sync Status Message */}
            {stats.lastSyncStatus === 'failed' && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <strong>Sync Failed:</strong> Last sync encountered an error. Changes will retry in 5 minutes.
              </div>
            )}

            {!stats.hasUnsyncedChanges && stats.lastSyncStatus === 'success' && (
              <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                <strong>All synced!</strong> Your changes are safely backed up to Backblaze.
              </div>
            )}

            {!stats.hasUnsyncedChanges && stats.lastSyncStatus === 'never' && (
              <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                No changes to sync yet. Changes will automatically sync 5 minutes after your last edit.
              </div>
            )}

            {!isAuthenticated && stats.hasUnsyncedChanges && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                <strong>Not logged in:</strong> Your changes are saved locally and will sync to Backblaze after you log in.
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
