import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { SheetData, Cell } from '@/types/spreadsheet';

interface ModernSpreadsheetProps {
  sheet: SheetData;
  updateCell: (cellId: string, value: string | number) => void;
  onSelectionChange?: (selectedCells: string[]) => void;
  selectedCells?: string[];
  className?: string;
}

export const ModernSpreadsheet = ({ 
  sheet, 
  updateCell, 
  onSelectionChange, 
  selectedCells = [],
  className = ''
}: ModernSpreadsheetProps) => {
  console.log('[ModernSpreadsheet render] sheet:', sheet);
  console.log('[ModernSpreadsheet render] sheet.cells:', sheet.cells);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [anchorCell, setAnchorCell] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Optimized helper functions with useCallback
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

  // Track shift key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle trackpad scrolling
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent the event from bubbling up to the zoom wrapper
      e.stopPropagation();
      
      // Allow normal scrolling in the sheet area
      scrollArea.scrollLeft += e.deltaX;
      scrollArea.scrollTop += e.deltaY;
    };

    scrollArea.addEventListener('wheel', handleWheel, { passive: true });
    
    return () => {
      scrollArea.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Arrow key navigation for cell selection
  useEffect(() => {
    const handleArrowKey = (event: KeyboardEvent) => {
      if (!selectedCell || editingCell) return;
      const { row, col } = parseCellId(selectedCell);
      let nextRow = row;
      let nextCol = col;
      let handled = false;
      if (event.key === 'ArrowUp') {
        nextRow = Math.max(0, row - 1);
        handled = true;
      } else if (event.key === 'ArrowDown') {
        nextRow = Math.min(sheet.rowCount - 1, row + 1);
        handled = true;
      } else if (event.key === 'ArrowLeft') {
        nextCol = Math.max(0, col - 1);
        handled = true;
      } else if (event.key === 'ArrowRight') {
        nextCol = Math.min(sheet.colCount - 1, col + 1);
        handled = true;
      } else if (event.key === 'Escape' && !editingCell) {
        // Unselect all cells on Escape if not editing
        setSelectedCell(null);
        setSelectedRange([]);
        setAnchorCell(null);
        onSelectionChange?.([]);
        return;
      }
      if (handled) {
        event.preventDefault();
        const nextCellId = getCellId(nextRow, nextCol);
        if (event.shiftKey && selectedCell) {
          // Use anchorCell as the start of the selection
          const anchor = anchorCell || selectedCell;
          const range = getCellsInRange(anchor, nextCellId);
          setSelectedCell(nextCellId);
          setSelectedRange(range);
          onSelectionChange?.(range);
          if (!anchorCell) setAnchorCell(selectedCell);
        } else {
          setSelectedCell(nextCellId);
          setSelectedRange([nextCellId]);
          setAnchorCell(null);
          onSelectionChange?.([nextCellId]);
        }
        // Scroll selected cell into view
        setTimeout(() => {
          const cellElem = document.querySelector(`[data-cell-id="${nextCellId}"]`);
          if (cellElem && cellElem.scrollIntoView) {
            cellElem.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }
        }, 0);
      }
    };
    document.addEventListener('keydown', handleArrowKey);
    return () => document.removeEventListener('keydown', handleArrowKey);
  }, [selectedCell, editingCell, sheet.rowCount, sheet.colCount, getCellId, getCellsInRange, onSelectionChange, parseCellId, anchorCell]);

  // Unselect cells when clicking outside the spreadsheet
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const spreadsheet = scrollAreaRef.current;
      if (spreadsheet && !spreadsheet.contains(event.target as Node)) {
        setSelectedCell(null);
        setSelectedRange([]);
        setAnchorCell(null);
        onSelectionChange?.([]);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [onSelectionChange]);

  // Reset anchorCell when selection changes not via shift
  useEffect(() => {
    setAnchorCell(null);
  }, [editingCell]);

  // Optimized event handlers
  const handleCellClick = useCallback((cellId: string, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (editingCell && editingCell !== cellId) {
      updateCell(editingCell, editValue);
      setEditingCell(null);
    }
    
    // Handle Shift+click for range selection
    if (isShiftPressed && selectedCell) {
      const range = getCellsInRange(selectedCell, cellId);
      setSelectedRange(range);
      onSelectionChange?.(range);
    } else {
      setSelectedCell(cellId);
      setSelectedRange([cellId]);
      onSelectionChange?.([cellId]);
    }
  }, [editingCell, editValue, updateCell, selectedCell, onSelectionChange, isShiftPressed, getCellsInRange]);

  const handleCellMouseDown = useCallback((cellId: string, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (!isShiftPressed) {
      setDragStart(cellId);
      setSelectedCell(cellId);
      setSelectedRange([cellId]);
      setIsDragging(true);
      onSelectionChange?.([cellId]);
    }
  }, [onSelectionChange, isShiftPressed]);

  const handleCellMouseEnter = useCallback((cellId: string) => {
    if (isDragging && dragStart && !isShiftPressed) {
      const range = getCellsInRange(dragStart, cellId);
      setSelectedRange(range);
      onSelectionChange?.(range);
    }
  }, [isDragging, dragStart, getCellsInRange, onSelectionChange, isShiftPressed]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleCellDoubleClick = useCallback((cellId: string, event: React.MouseEvent) => {
    event.preventDefault();
    const cell = sheet.cells[cellId];
    setEditingCell(cellId);
    setEditValue(
      typeof cell?.value === 'object' && cell?.value !== null
        ? ((cell?.value && typeof cell.value === 'object' && cell.value !== null && 'message' in cell.value && (cell.value as any).message)
          || (cell?.value && typeof cell.value === 'object' && cell.value !== null && 'value' in cell.value && (cell.value as any).value)
          || '')
        : cell?.value?.toString() || ''
    );
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 0);
  }, [sheet.cells]);

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

  // Effects
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // Optimized memoized data structures
  const visibleColumns = useMemo(() => 
    Math.min(sheet.colCount, 15), // Limit visible columns for performance
  [sheet.colCount]);

  const visibleRows = useMemo(() => 
    Math.min(sheet.rowCount, 50), // Limit visible rows for performance
  [sheet.rowCount]);

  const columnHeaders = useMemo(() => 
    Array.from({ length: visibleColumns }, (_, col) => ({
      col,
      header: getColHeader(col)
    }))
  , [visibleColumns, getColHeader]);

  const rowData = useMemo(() => {
    const rows = [];
    for (let row = 0; row < visibleRows; row++) {
      const cells = [];
      for (let col = 0; col < visibleColumns; col++) {
        const cellId = getCellId(row, col);
        cells.push({
          cellId,
          cell: sheet.cells[cellId]
        });
      }
      rows.push({ row, cells });
    }
    return rows;
  }, [visibleRows, visibleColumns, sheet.cells, getCellId]);

  return (
    <div className={`bg-green-50 dark:bg-green-900 rounded-2xl shadow-2xl border border-green-200 dark:border-green-700 overflow-hidden spreadsheet-container ml-16 ${className}`} data-scrollable="true">
      {/* Sheet Header */}
      <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-800 dark:to-emerald-800 px-6 py-4 border-b border-green-200 dark:border-green-700">
        <h2 className="text-lg font-semibold text-green-800 dark:text-green-200">{sheet.name}</h2>
      </div>

      {/* Spreadsheet Grid */}
      <div 
        ref={scrollAreaRef}
        className="overflow-auto max-h-[600px] select-none cursor-crosshair relative" 
        data-scrollable="true"
        style={{ cursor: isDragging ? 'crosshair' : 'default' }}
        onMouseDown={e => e.stopPropagation()}
        onMouseMove={e => isDragging && e.stopPropagation()}
      >
        <div className="min-w-fit relative">
          {/* Column Headers */}
          <div className="sticky top-0 z-20 flex bg-gradient-to-b from-green-100 to-green-50 dark:from-green-700 dark:to-green-800">
            <div className="w-16 h-12 bg-green-200 dark:bg-green-600 border-r border-green-300 dark:border-green-500 flex items-center justify-center text-xs font-medium text-green-600 dark:text-green-300">
            </div>
            {columnHeaders.map(({ col, header }) => (
              <div
                key={col}
                className="w-32 h-12 border-r border-green-300 dark:border-green-500 bg-gradient-to-b from-green-100 to-green-50 dark:from-green-700 dark:to-green-800 flex items-center justify-center text-xs font-semibold text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-600 transition-colors cursor-pointer"
              >
                {header}
              </div>
            ))}
          </div>

          {/* Dotted border overlay for selected range */}
          {selectedRange.length > 1 && (() => {
            // Calculate min/max row/col from selectedRange
            const positions = selectedRange.map(parseCellId);
            const minRow = Math.min(...positions.map(p => p.row));
            const maxRow = Math.max(...positions.map(p => p.row));
            const minCol = Math.min(...positions.map(p => p.col));
            const maxCol = Math.max(...positions.map(p => p.col));
            // Cell size constants (must match cell classes)
            const cellWidth = 128; // w-32 = 8*16px
            const cellHeight = 48; // h-12 = 4*12px
            const rowHeaderWidth = 64; // w-16 = 4*16px
            const colHeaderHeight = 48; // h-12 = 4*12px
            return (
              <div
                style={{
                  position: 'absolute',
                  left: rowHeaderWidth + minCol * cellWidth - 2, // -2 for border width
                  top: colHeaderHeight + minRow * cellHeight - 2,
                  width: (maxCol - minCol + 1) * cellWidth + 3, // +3 for border width
                  height: (maxRow - minRow + 1) * cellHeight + 3,
                  pointerEvents: 'none',
                  zIndex: 30,
                  border: '2px dotted #059669', // green-600
                  borderRadius: 4,
                  boxSizing: 'border-box',
                }}
              />
            );
          })()}

          {/* Rows */}
          {rowData.map(({ row, cells }) => (
            <div key={row} className="flex hover:bg-green-100/30 dark:hover:bg-green-800/10 transition-colors">
              {/* Row Header */}
              <div className="w-16 h-12 bg-gradient-to-r from-green-100 to-green-50 dark:from-green-700 dark:to-green-800 border-r border-b border-green-300 dark:border-green-500 flex items-center justify-center text-xs font-semibold text-green-600 dark:text-green-300 sticky left-0 z-10">
                {row + 1}
              </div>
              
              {/* Cells */}
              {cells.map(({ cellId, cell }) => {
                const isSelected = selectedCell === cellId;
                const isInRange = selectedRange.includes(cellId);
                const isEditing = editingCell === cellId;

                return (
                  <div
                    key={cellId}
                    className={`
                      w-32 h-12 border-r border-b border-green-200 dark:border-green-600 relative cursor-crosshair transition-all duration-75 text-sm
                      ${isSelected 
                        ? 'ring-2 ring-green-500 bg-green-100 dark:bg-green-800/50 z-10' 
                        : isInRange
                        ? 'bg-green-100/70 dark:bg-green-800/30'
                        : 'hover:bg-green-50 dark:hover:bg-green-700/50'
                      }
                      ${cell?.value ? 'bg-white dark:bg-green-900' : ''}
                    `}
                    onClick={(e) => handleCellClick(cellId, e)}
                    onDoubleClick={(e) => handleCellDoubleClick(cellId, e)}
                    onMouseDown={(e) => handleCellMouseDown(cellId, e)}
                    onMouseEnter={() => handleCellMouseEnter(cellId)}
                    style={{ 
                      userSelect: 'none',
                      border: isInRange ? '2px dotted #059669' : undefined,
                      boxSizing: 'border-box',
                    }}
                    data-cell-id={cellId}
                  >
                    {isEditing ? (
                      <Input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleEditSubmit}
                        onKeyDown={handleEditKeyDown}
                        className="w-full h-full border-0 rounded-none p-2 text-sm bg-white dark:bg-green-900 text-green-900 dark:text-green-100 focus:ring-2 focus:ring-green-500"
                      />
                    ) : (
                      <div 
                        className={`w-full h-full flex items-center px-3 text-green-900 dark:text-green-100 font-normal truncate ${
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
                        {typeof cell?.value === 'object' && cell?.value !== null
                          ? cell?.value.message || cell?.value.value || JSON.stringify(cell.value)
                          : cell?.value || ''}
                      </div>
                    )}
                    
                    {/* Selection corners for selected cell */}
                    {isSelected && !isEditing && (
                      <>
                        {/* Top-left corner */}
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-green-500 border border-white rounded-full z-20"></div>
                        {/* Top-right corner */}
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 border border-white rounded-full z-20"></div>
                        {/* Bottom-left corner */}
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-green-500 border border-white rounded-full z-20"></div>
                        {/* Bottom-right corner */}
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 border border-white rounded-full z-20"></div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
