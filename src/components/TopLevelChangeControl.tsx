/**
 * Top-Level Change Control Component
 * Shows accept/reject buttons for all changes (manual + AI) at the top of the page
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { changeDetector, ChangeEntry } from '@/lib/changeDetector';
import { motion, AnimatePresence } from 'framer-motion';

interface TopLevelChangeControlProps {
  currentSheetFileName: string;
  onAcceptAll: (changes: ChangeEntry[]) => Promise<void>;
  onRejectAll: (changes: ChangeEntry[]) => Promise<void>;
  onAcceptChange: (change: ChangeEntry) => Promise<void>;
  onRejectChange: (change: ChangeEntry) => Promise<void>;
  className?: string;
}

export const TopLevelChangeControl: React.FC<TopLevelChangeControlProps> = ({
  currentSheetFileName,
  onAcceptAll,
  onRejectAll,
  onAcceptChange,
  onRejectChange,
  className = ''
}) => {
  const [changes, setChanges] = useState<ChangeEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load changes on mount and when sheet changes
  useEffect(() => {
    if (currentSheetFileName) {
      const currentChanges = changeDetector.getSheetChanges(currentSheetFileName);
      setChanges(currentChanges);
    }
  }, [currentSheetFileName]);

  // Listen for real-time changes
  useEffect(() => {
    const handleChangesUpdated = (event: CustomEvent) => {
      const { sheetFileName, changes: updatedChanges } = event.detail;
      if (sheetFileName === currentSheetFileName) {
        setChanges(updatedChanges);
      }
    };

    const handleChangesCleared = (event: CustomEvent) => {
      const { sheetFileName } = event.detail;
      if (sheetFileName === currentSheetFileName) {
        setChanges([]);
      }
    };

    window.addEventListener('sheetChangesUpdated', handleChangesUpdated as EventListener);
    window.addEventListener('sheetChangesCleared', handleChangesCleared as EventListener);

    return () => {
      window.removeEventListener('sheetChangesUpdated', handleChangesUpdated as EventListener);
      window.removeEventListener('sheetChangesCleared', handleChangesCleared as EventListener);
    };
  }, [currentSheetFileName]);

  // Don't render if no changes
  if (changes.length === 0) {
    return null;
  }

  const manualChanges = changes.filter(c => c.source === 'manual');
  const aiChanges = changes.filter(c => c.source === 'ai');

  const handleAcceptAll = async () => {
    setIsProcessing(true);
    try {
      await onAcceptAll(changes);
    } catch (error) {
      console.error('❌ Error accepting all changes:', error);
    }
    setIsProcessing(false);
  };

  const handleRejectAll = async () => {
    setIsProcessing(true);
    try {
      await onRejectAll(changes);
    } catch (error) {
      console.error('❌ Error rejecting all changes:', error);
    }
    setIsProcessing(false);
  };

  const handleAcceptChange = async (change: ChangeEntry) => {
    setIsProcessing(true);
    try {
      await onAcceptChange(change);
    } catch (error) {
      console.error('❌ Error accepting change:', error);
    }
    setIsProcessing(false);
  };

  const handleRejectChange = async (change: ChangeEntry) => {
    setIsProcessing(true);
    try {
      await onRejectChange(change);
    } catch (error) {
      console.error('❌ Error rejecting change:', error);
    }
    setIsProcessing(false);
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'empty';
    if (typeof value === 'string' && value.length > 20) {
      return value.substring(0, 20) + '...';
    }
    return String(value);
  };

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}
    >
      <Card className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-2 border-blue-200 dark:border-blue-800 shadow-lg">
        <div className="p-4">
          {/* Summary Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {changes.length} Pending Change{changes.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="flex gap-2">
                {manualChanges.length > 0 && (
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                    {manualChanges.length} Manual
                  </Badge>
                )}
                {aiChanges.length > 0 && (
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">
                    {aiChanges.length} AI
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle Details */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-600 hover:text-gray-900"
              >
                {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>

              {/* Action Buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAcceptAll}
                disabled={isProcessing}
                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-800"
              >
                <Check className="w-4 h-4 mr-1" />
                Accept All
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectAll}
                disabled={isProcessing}
                className="bg-red-50 hover:bg-red-100 border-red-200 text-red-800"
              >
                <X className="w-4 h-4 mr-1" />
                Reject All
              </Button>
            </div>
          </div>

          {/* Detailed View */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
              >
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {changes.map((change, index) => (
                    <div
                      key={`${change.cellId}-${change.timestamp}`}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={change.source === 'manual' ? 'default' : 'secondary'}
                          className={change.source === 'manual' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                        >
                          {change.source === 'manual' ? '✋' : '🤖'} {change.source}
                        </Badge>
                        
                        <div className="text-sm">
                          <span className="font-mono font-semibold">{change.cellId}</span>
                          <span className="text-gray-500 mx-2">:</span>
                          <span className="text-red-600 line-through">{formatValue(change.previousValue)}</span>
                          <span className="text-gray-500 mx-2">→</span>
                          <span className="text-green-600 font-semibold">{formatValue(change.newValue)}</span>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAcceptChange(change)}
                          disabled={isProcessing}
                          className="text-green-600 hover:bg-green-50 p-1"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRejectChange(change)}
                          disabled={isProcessing}
                          className="text-red-600 hover:bg-red-50 p-1"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
};
