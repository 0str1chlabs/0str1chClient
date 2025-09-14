import React, { useState, useMemo } from 'react';
import { ChevronDown, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateSmartStatistics, getEnhancedStatOptions, getDataTypeIcon, getDataTypeDescription } from '../lib/smartStatistics';

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

  // If not all numeric, show only count and disable dropdown
  if (!stats.allNumeric) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Count: {stats.count}
            </span>
            {stats.dataType && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {getDataTypeIcon(stats.dataType)} {getDataTypeDescription(stats.dataType)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative">
        {/* Main button */}
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

        {/* Data type indicator */}
        {stats.dataType && (
          <div className="absolute -top-8 right-0 bg-gray-100 dark:bg-gray-700 text-xs px-2 py-1 rounded">
            {getDataTypeIcon(stats.dataType)} {getDataTypeDescription(stats.dataType)}
          </div>
        )}

        {/* Dropdown */}
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

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};