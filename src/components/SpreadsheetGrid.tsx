import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { SheetData, Cell } from '@/types/spreadsheet';

interface SpreadsheetGridProps {
  sheet: SheetData;
  updateCell: (cellId: string, value: string | number) => void;
  onSelectionChange?: (selectedCells: string[]) => void;
  selectedCells?: string[];
}

export const SpreadsheetGrid = ({ sheet, updateCell, onSelectionChange, selectedCells = [] }: SpreadsheetGridProps) => {
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Memoize cell ID generation functions
  const getCellId = useCallback((row: number, col: number) => {
    const colLetter = String.fromCharCode(65 + col);
    return `${colLetter}${row + 1}`;
  }, []);

  const getColHeader = useCallback((col: number) => {
    return String.fromCharCode(65 + col);
  }, []);

  const parseCellId = useCallback((cellId: string) => {
    const col = cellId.charCodeAt(0) - 65;
    const row = parseInt(cellId.slice(1)) - 1;
    return { row, col };
  }, []);

  const getCellsInRange = useCallback((start: string, end: string) => {
    const startPos = parseCellId(start);
    const endPos = parseCellId(end);
    
    const minRow = Math.min(startPos.row, endPos.row);
    const maxRow = Math.max(startPos.row, endPos.row);
    const minCol = Math.min(startPos.col, endPos.col);
    const maxCol = Math.max(startPos.col, endPos.col);
    
    const cells = [];
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        cells.push(getCellId(row, col));
      }
    }
    return cells;
  }, [getCellId, parseCellId]);

  // Memoize selectedRange as a Set for O(1) lookup
  const selectedRangeSet = useMemo(() => new Set(selectedRange), [selectedRange]);

  // Update selectedRange when selectedCells prop changes (debounced)
  useEffect(() => {
    if (selectedCells.length > 0 && JSON.stringify(selectedCells) !== JSON.stringify(selectedRange)) {
      setSelectedRange(selectedCells);
      setSelectedCell(selectedCells[0]);
    }
  }, [selectedCells]);

  const handleCellClick = useCallback((cellId: string, event: React.MouseEvent) => {
    event.preventDefault();
    
    // If we were editing a cell, save its value first
    if (editingCell && editingCell !== cellId) {
      updateCell(editingCell, editValue);
      setEditingCell(null);
    }
    
    if (selectedCell !== cellId) {
      setSelectedCell(cellId);
      setSelectedRange([cellId]);
      onSelectionChange?.([cellId]);
    }
  }, [editingCell, editValue, updateCell, selectedCell, onSelectionChange]);

  const handleCellMouseDown = useCallback((cellId: string, event: React.MouseEvent) => {
    event.preventDefault();
    setDragStart(cellId);
    setSelectedCell(cellId);
    setSelectedRange([cellId]);
    setIsDragging(true);
    onSelectionChange?.([cellId]);
  }, [onSelectionChange]);

  const handleCellMouseEnter = useCallback((cellId: string) => {
    if (isDragging && dragStart) {
      const range = getCellsInRange(dragStart, cellId);
      setSelectedRange(range);
      onSelectionChange?.(range);
    }
  }, [isDragging, dragStart, getCellsInRange, onSelectionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleCellDoubleClick = useCallback((cellId: string, event: React.MouseEvent) => {
    event.preventDefault();
    const cell = sheet.cells[cellId];
    setEditingCell(cellId);
    setEditValue(cell?.value?.toString() || '');
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
      }
    }, 0);
  }, [sheet.cells]);

  const handleKeyDown = useCallback((cellId: string, event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (editingCell) {
        updateCell(editingCell, editValue);
        setEditingCell(null);
        setEditValue('');
      } else {
        // Start editing the selected cell
        const cell = sheet.cells[cellId];
        setEditingCell(cellId);
        setEditValue(cell?.value?.toString() || '');
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
          }
        }, 0);
      }
    } else if (event.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    } else if (event.key === 'F2') {
      event.preventDefault();
      const cell = sheet.cells[cellId];
      setEditingCell(cellId);
      setEditValue(cell?.value?.toString() || '');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
        }
      }, 0);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !editingCell) {
      // Start typing directly in the cell
      event.preventDefault();
      setEditingCell(cellId);
      setEditValue(event.key);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
        }
      }, 0);
    }
  }, [editingCell, editValue, updateCell, sheet.cells]);

  const handleEditSubmit = useCallback(() => {
    if (editingCell) {
      updateCell(editingCell, editValue);
      setEditingCell(null);
      setEditValue('');
    }
  }, [editingCell, editValue, updateCell]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  }, [handleEditSubmit]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // Handle keyboard events at the container level - optimized
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (selectedCell && !editingCell) {
        handleKeyDown(selectedCell, event as any);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedCell, editingCell, handleKeyDown]);

  // Memoize column headers
  const columnHeaders = useMemo(() => 
    Array.from({ length: sheet.colCount }, (_, col) => ({
      col,
      header: getColHeader(col)
    }))
  , [sheet.colCount, getColHeader]);

  // Memoize row data
  const rowData = useMemo(() => 
    Array.from({ length: sheet.rowCount }, (_, row) => ({
      row,
      cells: Array.from({ length: sheet.colCount }, (_, col) => ({
        cellId: getCellId(row, col),
        cell: sheet.cells[getCellId(row, col)]
      }))
    }))
  , [sheet.rowCount, sheet.colCount, sheet.cells, getCellId]);

  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 select-none">
      <div className="min-w-fit">
        {/* Column Headers */}
        <div className="sticky top-0 z-20 flex bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 border-b border-slate-300 dark:border-slate-600">
          <div className="w-16 h-12 bg-slate-200 dark:bg-slate-600 border-r border-slate-300 dark:border-slate-500 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-300">
          </div>
          {columnHeaders.map(({ col, header }) => (
            <div
              key={col}
              className="w-32 h-12 border-r border-slate-300 dark:border-slate-500 bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
            >
              {header}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rowData.map(({ row, cells }) => (
          <div key={row} className="flex hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
            {/* Row Header */}
            <div className="w-16 h-12 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 border-r border-b border-slate-300 dark:border-slate-500 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300 sticky left-0 z-10 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer">
              {row + 1}
            </div>
            
            {/* Cells */}
            {cells.map(({ cellId, cell }) => {
              const isSelected = selectedCell === cellId;
              const isInRange = selectedRangeSet.has(cellId);
              const isEditing = editingCell === cellId;

              return (
                <div
                  key={cellId}
                  className={`
                    w-32 h-12 border-r border-b border-slate-200 dark:border-slate-600 relative cursor-cell transition-all duration-100 text-sm
                    ${isSelected 
                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/50 z-10' 
                      : isInRange
                      ? 'bg-blue-100/70 dark:bg-blue-900/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }
                    ${cell?.value ? 'bg-white dark:bg-slate-900' : ''}
                  `}
                  onClick={(e) => handleCellClick(cellId, e)}
                  onDoubleClick={(e) => handleCellDoubleClick(cellId, e)}
                  onMouseDown={(e) => handleCellMouseDown(cellId, e)}
                  onMouseEnter={() => handleCellMouseEnter(cellId)}
                  style={{ userSelect: 'none' }}
                  tabIndex={0}
                >
                  {isEditing ? (
                    <Input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleEditSubmit}
                      onKeyDown={handleEditKeyDown}
                      className="w-full h-full border-0 rounded-none p-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div 
                      className={`w-full h-full flex items-center px-3 text-slate-900 dark:text-slate-100 font-normal truncate ${
                        cell?.style?.bold ? 'font-bold' : ''
                      } ${
                        cell?.style?.italic ? 'italic' : ''
                      } ${
                        cell?.style?.textAlign === 'center' ? 'justify-center' :
                        cell?.style?.textAlign === 'right' ? 'justify-end' : 'justify-start'
                      }`}
                      style={{
                        textDecoration: cell?.style?.underline ? 'underline' : 'none',
                        color: cell?.style?.textColor || undefined,
                        backgroundColor: cell?.style?.backgroundColor || undefined,
                        fontSize: cell?.style?.fontSize ? `${cell.style.fontSize}px` : undefined,
                        fontFamily: cell?.style?.fontFamily || undefined,
                        textAlign: cell?.style?.textAlign || 'left',
                      }}
                    >
                      {cell?.value || ''}
                    </div>
                  )}
                  {isSelected && !isEditing && (
                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 cursor-se-resize"></div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
