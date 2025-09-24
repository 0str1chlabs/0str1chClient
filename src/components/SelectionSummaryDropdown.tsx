import React, { useMemo, useState } from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ChevronDown, BarChart3 } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SheetData } from '@/types/spreadsheet';
import { calculateSmartStatistics, getEnhancedStatOptions } from '../lib/smartStatistics';

interface SelectionSummaryDropdownProps {
  selectedCells: string[];
  sheet: SheetData;
  aiSchema?: any; // AI-generated schema for smart data type detection
}

function isNumeric(val: any) {
  if (typeof val === 'number') return true;
  if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) return true;
  return false;
}

export const SelectionSummaryDropdown: React.FC<SelectionSummaryDropdownProps> = ({ selectedCells, sheet, aiSchema }) => {
  const [showOccurrences, setShowOccurrences] = useState(false);
  
  const summary = useMemo(() => {
    return calculateSmartStatistics(selectedCells, sheet, aiSchema);
  }, [selectedCells, sheet, aiSchema]);

  if (selectedCells.length === 0 || !summary) return null;

  // Get enhanced stat options with data type awareness
  const items = getEnhancedStatOptions(summary);

  // The first value to show on the button
  const mainItem = items[0];

  return (
    <div className="absolute bottom-4 right-4 z-50" style={{ pointerEvents: 'auto' }}>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg shadow bg-white dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-900 dark:text-green-100 font-medium min-w-[160px] justify-between hover:bg-green-50 dark:hover:bg-green-800 transition-colors">
              <span className="flex-1 text-left">{mainItem.label}</span>
              <span className="font-bold">{mainItem.display}</span>
              <ChevronDown className="ml-2 w-4 h-4 text-green-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            {items.map((item, idx) => (
              <DropdownMenuItem key={item.label} className="flex justify-between items-center">
                <span>{item.label}</span>
                <span className="font-bold">{item.display}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Occurrences button */}
        {summary.occurrences && summary.occurrences.length > 0 && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOccurrences(!showOccurrences)}
              className="bg-white dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-900 dark:text-green-100 hover:bg-green-50 dark:hover:bg-green-800 shadow"
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">
                Occurrences ({summary.occurrences.length})
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
                    {summary.occurrences.map((item, index) => (
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

      {/* Click outside to close occurrences dropdown */}
      {showOccurrences && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowOccurrences(false)}
        />
      )}
    </div>
  );
};

export default SelectionSummaryDropdown; 