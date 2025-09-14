import React, { useMemo } from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import type { SheetData } from '@/types/spreadsheet';
import { calculateSmartStatistics, getEnhancedStatOptions, getDataTypeIcon, getDataTypeDescription } from '../lib/smartStatistics';

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg shadow bg-white dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-900 dark:text-green-100 font-medium min-w-[160px] justify-between hover:bg-green-50 dark:hover:bg-green-800 transition-colors">
            <span className="flex-1 text-left">{mainItem.label}</span>
            <span className="font-bold">{mainItem.display}</span>
            <ChevronDown className="ml-2 w-4 h-4 text-green-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          {summary.dataType && (
            <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 border-b">
              {getDataTypeIcon(summary.dataType)} {getDataTypeDescription(summary.dataType)}
            </div>
          )}
          {items.map((item, idx) => (
            <DropdownMenuItem key={item.label} className="flex justify-between items-center">
              <span>{item.label}</span>
              <span className="font-bold">{item.display}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default SelectionSummaryDropdown; 