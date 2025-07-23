import React, { useMemo } from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import type { SheetData } from '@/types/spreadsheet';

interface SelectionSummaryDropdownProps {
  selectedCells: string[];
  sheet: SheetData;
}

function isNumeric(val: any) {
  if (typeof val === 'number') return true;
  if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) return true;
  return false;
}

export const SelectionSummaryDropdown: React.FC<SelectionSummaryDropdownProps> = ({ selectedCells, sheet }) => {
  const summary = useMemo(() => {
    const values = selectedCells.map(cellId => sheet.cells[cellId]?.value).filter(v => v !== undefined && v !== null);
    const numericValues = values.filter(isNumeric).map(Number);
    const nonNumericValues = values.filter(v => !isNumeric(v));
    const count = values.length;
    const countNumbers = numericValues.length;
    const allNonNumeric = count > 0 && countNumbers === 0;
    const mixed = countNumbers > 0 && countNumbers < count;
    const allNumeric = count > 0 && countNumbers === count;
    const sum = numericValues.reduce((a, b) => a + b, 0);
    const avg = countNumbers > 0 ? sum / countNumbers : 0;
    const min = countNumbers > 0 ? Math.min(...numericValues) : undefined;
    const max = countNumbers > 0 ? Math.max(...numericValues) : undefined;
    return {
      allNonNumeric,
      mixed,
      allNumeric,
      count,
      countNumbers,
      sum,
      avg,
      min,
      max,
    };
  }, [selectedCells, sheet]);

  if (selectedCells.length === 0) return null;

  // Dropdown items
  let items: { label: string; value: string | number }[] = [];
  if (summary.allNonNumeric) {
    items = [
      { label: 'Count', value: summary.count },
    ];
  } else {
    items = [
      { label: 'Sum', value: summary.sum },
      { label: 'Average', value: summary.avg },
      { label: 'Minimum', value: summary.min },
      { label: 'Maximum', value: summary.max },
      { label: 'Count', value: summary.count },
    ];
    if (summary.mixed) {
      items.push({ label: 'Count Numbers', value: summary.countNumbers });
    }
  }

  // The first value to show on the button
  const mainItem = items[0];

  return (
    <div className="absolute bottom-4 right-4 z-50" style={{ pointerEvents: 'auto' }}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg shadow bg-white dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-900 dark:text-green-100 font-medium min-w-[160px] justify-between hover:bg-green-50 dark:hover:bg-green-800 transition-colors">
            <span className="flex-1 text-left">{mainItem.label}</span>
            <span className="font-bold">{mainItem.value}</span>
            <ChevronDown className="ml-2 w-4 h-4 text-green-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          {items.map((item, idx) => (
            <DropdownMenuItem key={item.label} className="flex justify-between items-center">
              <span>{item.label}</span>
              <span className="font-bold">{item.value}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default SelectionSummaryDropdown; 