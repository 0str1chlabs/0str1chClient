import React, { useState, useMemo } from 'react';
import { ChevronDown, Calculator, BarChart3 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateSmartStatistics, getEnhancedStatOptions } from '../lib/smartStatistics';

interface StatisticalSummaryProps {
  selectedCells: string[];
  activeSheet: any;
  isVisible: boolean;
  aiSchema?: any; // AI-generated schema for smart data type detection
}

type StatType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'countNumbers';

export const StatisticalSummary: React.FC<StatisticalSummaryProps> = ({
  selectedCells,
  activeSheet,
  isVisible,
  aiSchema
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedStat, setSelectedStat] = useState<StatType>('sum');
  const [showOccurrences, setShowOccurrences] = useState(false);

  // Calculate smart statistics using AI schema
  const stats = useMemo(() => {
    return calculateSmartStatistics(selectedCells, activeSheet, aiSchema);
  }, [selectedCells, activeSheet, aiSchema]);

  // Don't render if not visible or no stats
  if (!isVisible || !stats) {
    return null;
  }

  // Get enhanced stat options with data type awareness
  const statOptions = getEnhancedStatOptions(stats);

  // If not all numeric, show only count and occurrences
  if (!stats.allNumeric) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Count: {stats.count}
              </span>
            </div>
            {stats.occurrences && stats.occurrences.length > 0 && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOccurrences(!showOccurrences)}
                  className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-800/30"
                >
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Occurrences ({stats.occurrences.length})
                </Button>
                
                {/* Occurrences Dropdown */}
                {showOccurrences && (
                  <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[250px] max-h-48 overflow-y-auto">
                    <div className="p-3">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        📊 Similar Values Found:
                      </div>
                      <div className="space-y-2">
                        {stats.occurrences.map((item, index) => (
                          <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                {String(item.value).length > 15 ? `${String(item.value).substring(0, 15)}...` : String(item.value)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {item.count} occurrence{item.count !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.cells.slice(0, 6).map((cellId, cellIndex) => (
                                <span 
                                  key={cellIndex}
                                  className="inline-flex items-center px-1 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                >
                                  {cellId}
                                </span>
                              ))}
                              {item.cells.length > 6 && (
                                <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-400">
                                  +{item.cells.length - 6}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex items-center gap-3">
        <div className="relative">
          {/* Main statistics button */}
          <Button
            variant="outline"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-lg"
          >
            <Calculator className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">
              {statOptions.find(opt => opt.value === selectedStat)?.label}: {statOptions.find(opt => opt.value === selectedStat)?.display}
            </span>
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>


          {/* Statistics Dropdown */}
          {isDropdownOpen && (
            <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[200px]">
              {statOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedStat(option.value);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                    selectedStat === option.value 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-gray-500 dark:text-gray-400">{option.display}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Occurrences button */}
        {stats.occurrences && stats.occurrences.length > 0 && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOccurrences(!showOccurrences)}
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-lg"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                Occurrences ({stats.occurrences.length})
              </span>
            </Button>
            
            {/* Occurrences Dropdown */}
            {showOccurrences && (
              <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[250px] max-h-48 overflow-y-auto">
                <div className="p-3">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📊 Similar Values Found:
                  </div>
                  <div className="space-y-2">
                    {stats.occurrences.map((item, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                            {String(item.value).length > 15 ? `${String(item.value).substring(0, 15)}...` : String(item.value)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {item.count} occurrence{item.count !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.cells.slice(0, 6).map((cellId, cellIndex) => (
                            <span 
                              key={cellIndex}
                              className="inline-flex items-center px-1 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            >
                              {cellId}
                            </span>
                          ))}
                          {item.cells.length > 6 && (
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-400">
                              +{item.cells.length - 6}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close dropdowns */}
      {(isDropdownOpen || showOccurrences) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsDropdownOpen(false);
            setShowOccurrences(false);
          }}
        />
      )}
    </div>
  );
};