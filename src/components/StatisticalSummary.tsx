import React, { useState, useMemo } from 'react';
import { ChevronDown, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as dfd from 'danfojs';

interface StatisticalSummaryProps {
  selectedCells: string[];
  activeSheet: any;
  isVisible: boolean;
}

type StatType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'countNumbers';

export const StatisticalSummary: React.FC<StatisticalSummaryProps> = ({
  selectedCells,
  activeSheet,
  isVisible
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedStat, setSelectedStat] = useState<StatType>('sum');

  // Calculate statistics for selected cells using danfojs
  const stats = useMemo(() => {
    if (!selectedCells || selectedCells.length === 0 || !activeSheet) {
      return null;
    }

    try {
      // Extract cell values and filter out undefined/empty values
      const cellValues = selectedCells.map(cellId => {
        const cell = activeSheet.cells[cellId];
        return cell?.value;
      }).filter(value => value !== undefined && value !== '');

      if (cellValues.length === 0) return null;

      // Check if all values are numbers
      const numericValues = cellValues.filter(value => !isNaN(Number(value)) && value !== '');
      const allNumeric = numericValues.length === cellValues.length;

      if (allNumeric && numericValues.length > 0) {
        // Use danfojs for accurate statistical calculations
        const series = new dfd.Series(numericValues.map(v => Number(v)));
        
        const sum = series.sum();
        const avg = series.mean();
        const min = series.min();
        const max = series.max();
        const count = cellValues.length;
        const countNumbers = numericValues.length;

        return {
          sum: sum.toFixed(2),
          avg: avg.toFixed(2),
          min: min.toFixed(2),
          max: max.toFixed(2),
          count,
          countNumbers,
          allNumeric
        };
      } else {
        // Mixed content - only show count
        return {
          sum: '0.00',
          avg: '0.00',
          min: '0.00',
          max: '0.00',
          count: cellValues.length,
          countNumbers: numericValues.length,
          allNumeric: false
        };
      }
    } catch (error) {
      console.error('Error calculating statistics:', error);
      // Fallback to basic calculations if danfojs fails
      const cellValues = selectedCells.map(cellId => {
        const cell = activeSheet.cells[cellId];
        return cell?.value;
      }).filter(value => value !== undefined && value !== '');

      const numericValues = cellValues.filter(value => !isNaN(Number(value)) && value !== '');
      const allNumeric = numericValues.length === cellValues.length;

      if (allNumeric && numericValues.length > 0) {
        const sum = numericValues.reduce((acc, val) => acc + Number(val), 0);
        const avg = sum / numericValues.length;
        const min = Math.min(...numericValues.map(v => Number(v)));
        const max = Math.max(...numericValues.map(v => Number(v)));

        return {
          sum: sum.toFixed(2),
          avg: avg.toFixed(2),
          min: min.toFixed(2),
          max: max.toFixed(2),
          count: cellValues.length,
          countNumbers: numericValues.length,
          allNumeric
        };
      } else {
        return {
          sum: '0.00',
          avg: '0.00',
          min: '0.00',
          max: '0.00',
          count: cellValues.length,
          countNumbers: numericValues.length,
          allNumeric: false
        };
      }
    }
  }, [selectedCells, activeSheet]);

  // Don't render if not visible or no stats
  if (!isVisible || !stats) {
    return null;
  }

  const statOptions: { value: StatType; label: string; display: string }[] = [
    { value: 'sum', label: 'Sum', display: stats.sum },
    { value: 'avg', label: 'Avg', display: stats.avg },
    { value: 'min', label: 'Min', display: stats.min },
    { value: 'max', label: 'Max', display: stats.max },
    { value: 'count', label: 'Count', display: stats.count.toString() },
    { value: 'countNumbers', label: 'Count Numbers', display: stats.countNumbers.toString() }
  ];

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
