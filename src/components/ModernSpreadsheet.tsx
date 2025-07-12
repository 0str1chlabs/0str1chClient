import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import type { SheetData, Cell } from '@/types/spreadsheet';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { spreadsheetFunctions } from '../../../AIServer/formulation';
import Skeleton from '@mui/material/Skeleton';

interface ModernSpreadsheetProps {
  sheet: SheetData;
  updateCell: (cellId: string, value: string | number) => void;
  bulkUpdateCells?: (updates: { cellId: string, value: any }[]) => void;
  onSelectionChange?: (selectedCells: string[]) => void;
  selectedCells?: string[];
  onAddMoreRows?: () => void;
  className?: string;
  isSheetLoading?: boolean;
  setSheetLoading?: (loading: boolean) => void;
}

// Memoized Cell component
const SpreadsheetCell = React.memo(({
  cellId,
  cell,
  isSelected,
  isInRange,
  isEditing,
  onClick,
  onDoubleClick,
  onMouseDown,
  onMouseEnter,
  inputRef,
  editValue,
  setEditValue,
  handleEditSubmit,
  handleEditKeyDown,
  style,
  isSheetLoading
}: any) => {
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
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      style={style}
      data-cell-id={cellId}
    >
      {isSheetLoading ? (
        <Skeleton variant="rectangular" width="100%" height="100%" animation="wave" />
      ) : isEditing ? (
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
            cell?.style?.textAlign === 'center' ? 'justify-center' :
            cell?.style?.textAlign === 'right' ? 'justify-end' : 'justify-start'
          }`}
          style={{
            fontWeight: cell?.style?.bold ? 'bold' : 'normal',
            fontStyle: cell?.style?.italic ? 'italic' : 'normal',
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
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-green-500 border border-white rounded-full z-20"></div>
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 border border-white rounded-full z-20"></div>
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-green-500 border border-white rounded-full z-20"></div>
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 border border-white rounded-full z-20"></div>
        </>
      )}
    </div>
  );
});

export const ModernSpreadsheet = ({ 
  sheet, 
  updateCell, 
  bulkUpdateCells,
  onSelectionChange, 
  selectedCells = [],
  onAddMoreRows,
  className = '',
  isSheetLoading,
  setSheetLoading
}: ModernSpreadsheetProps) => {
  
  // Use the external selectedCells prop as the source of truth
  const selectedCell = selectedCells.length > 0 ? selectedCells[0] : null;
  const selectedRange = selectedCells;
  
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [anchorCell, setAnchorCell] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [showAddRowsButton, setShowAddRowsButton] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuCol, setMenuCol] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [sortedCol, setSortedCol] = useState<string | null>(null);

  // Virtual scrolling constants
  const ROW_HEIGHT = 48; // h-12 = 48px
  const COLUMN_HEADER_HEIGHT = 48; // h-12 = 48px
  const VISIBLE_ROWS_BUFFER = 5; // Extra rows to render above/below visible area

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

  // Handle scrolling and track scroll position for virtual scrolling
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea;
      setScrollTop(scrollTop);
      
      // Show button when we're at the bottom (within 50px)
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
      setShowAddRowsButton(isAtBottom);
    };

    const handleWheel = (e: WheelEvent) => {
      // Prevent the event from bubbling up to the zoom wrapper
      e.stopPropagation();
      
      // Allow normal scrolling in the sheet area
      scrollArea.scrollLeft += e.deltaX;
      scrollArea.scrollTop += e.deltaY;
    };

    scrollArea.addEventListener('scroll', handleScroll, { passive: true });
    scrollArea.addEventListener('wheel', handleWheel, { passive: true });
    
    return () => {
      scrollArea.removeEventListener('scroll', handleScroll);
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
          onSelectionChange?.(range);
          if (!anchorCell) setAnchorCell(selectedCell);
        } else {
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
      const target = event.target as HTMLElement;
      // Check if click is on toolbar or its children
      const isOnToolbar = target.closest('.toolbar') || 
                         target.closest('[data-toolbar]') ||
                         target.closest('[data-toolbar-handle]') ||
                         target.closest('.color-palette') ||
                         target.closest('[data-color-palette]');
      // Check if click is on AI chatbox
      const isOnChatbox = target.closest('#ai-chatbox') || target.closest('[data-ai-chatbox]');
      if (spreadsheet && !spreadsheet.contains(target) && !isOnToolbar && !isOnChatbox) {
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
      onSelectionChange?.(range);
    } else {
      onSelectionChange?.([cellId]);
    }
  }, [editingCell, editValue, updateCell, selectedCell, onSelectionChange, isShiftPressed, getCellsInRange]);

  const handleCellMouseDown = useCallback((cellId: string, event: React.MouseEvent) => {
    event.preventDefault();
    
    // Only start dragging if it's a left click and not on a scrollbar
    if (!isShiftPressed && event.button === 0) {
      // Check if we're clicking on a scrollbar
      const target = event.target as HTMLElement;
      const isScrollbar = target.closest('::-webkit-scrollbar') || 
                         target.classList.contains('scrollbar-thumb') ||
                         target.classList.contains('scrollbar-track');
      
      if (!isScrollbar) {
      setDragStart(cellId);
      setIsDragging(true);
      onSelectionChange?.([cellId]);
      }
    }
  }, [onSelectionChange, isShiftPressed]);

  const handleCellMouseEnter = useCallback((cellId: string) => {
    if (isDragging && dragStart && !isShiftPressed) {
      const range = getCellsInRange(dragStart, cellId);
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

  // Virtual scrolling calculations
  const scrollAreaHeight = 600; // max-h-[600px]
  const visibleRowCount = Math.ceil(scrollAreaHeight / ROW_HEIGHT) + VISIBLE_ROWS_BUFFER * 2;
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VISIBLE_ROWS_BUFFER);
  const endRow = Math.min(sheet.rowCount - 1, startRow + visibleRowCount);

  // Optimized memoized data structures
  const visibleColumns = useMemo(() => 
    sheet.colCount, // Show all available columns
  [sheet.colCount]);

  const columnHeaders = useMemo(() => 
    Array.from({ length: visibleColumns }, (_, col) => ({
      col,
      header: getColHeader(col)
    }))
  , [visibleColumns, getColHeader]);

  const rowData = useMemo(() => {
    const rows = [];
    for (let row = startRow; row <= endRow; row++) {
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
  }, [startRow, endRow, visibleColumns, sheet.cells, getCellId]);

  // Use a Set for selectedCells for fast lookup
  const selectedCellsSet = useMemo(() => new Set(selectedCells), [selectedCells]);

  // Memoize event handlers for each cell
  const getCellHandlers = (cellId: string) => ({
    onClick: (e: React.MouseEvent) => handleCellClick(cellId, e),
    onDoubleClick: (e: React.MouseEvent) => handleCellDoubleClick(cellId, e),
    onMouseDown: (e: React.MouseEvent) => handleCellMouseDown(cellId, e),
    onMouseEnter: () => handleCellMouseEnter(cellId),
  });

  return (
    <div className={`bg-green-50 dark:bg-green-900 rounded-2xl border border-green-200 dark:border-green-700 overflow-hidden spreadsheet-container ${className}`} data-scrollable="true">
      {/* Sheet Header */}
      <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-800 dark:to-emerald-800 px-6 py-4 border-b border-green-200 dark:border-green-700">
        <h2 className="text-lg font-semibold text-green-800 dark:text-green-200">{sheet.name}</h2>
      </div>

      {/* Spreadsheet Grid */}
      <div 
        ref={scrollAreaRef}
        className="overflow-auto max-h-[600px] select-none relative scrollbar-thin scrollbar-thumb-green-300 scrollbar-track-green-100" 
        data-scrollable="true"
        style={{ 
          cursor: isDragging ? 'crosshair' : 'default',
          scrollbarWidth: 'thin',
          scrollbarColor: '#86efac #dcfce7'
        }}
        onMouseDown={e => {
          // Check if click is on scrollbar area
          const rect = e.currentTarget.getBoundingClientRect();
          const isOnScrollbar = e.clientX > rect.right - 20 || e.clientY > rect.bottom - 20;
          
          if (!isOnScrollbar) {
            e.stopPropagation();
          }
        }}
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
                className={`w-32 h-12 border-r border-green-300 dark:border-green-500 bg-gradient-to-b from-green-100 to-green-50 dark:from-green-700 dark:to-green-800 flex items-center justify-center text-xs font-semibold text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-600 transition-colors cursor-pointer relative ${sortedCol === header ? 'animate-flash' : ''}`}
                onClick={e => {
                  // Select all cells in this column
                  const cellIds = [];
                  for (let row = 1; row < sheet.rowCount; row++) {
                    cellIds.push(`${header}${row + 1}`);
                  }
                  onSelectionChange?.(cellIds);
                  setMenuAnchor(e.currentTarget);
                  setMenuCol(header);
                }}
                onMouseEnter={() => setHoveredCol(col)}
                onMouseLeave={() => setHoveredCol(null)}
              >
                <span>{header}</span>
                {hoveredCol === col && (
                  <ArrowDropDownIcon style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#059669' }} fontSize="small" />
                )}
              </div>
            ))}
          </div>

          {/* Virtual scrolling container */}
          <div style={{ height: sheet.rowCount * ROW_HEIGHT, position: 'relative' }}>
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

            {/* Visible Rows */}
            <div style={{ position: 'absolute', top: startRow * ROW_HEIGHT, left: 0, right: 0 }}>
          {rowData.map(({ row, cells }) => (
            <div key={row} className="flex hover:bg-green-100/30 dark:hover:bg-green-800/10 transition-colors">
              {/* Row Header */}
              <div className="w-16 h-12 bg-gradient-to-r from-green-100 to-green-50 dark:from-green-700 dark:to-green-800 border-r border-b border-green-300 dark:border-green-500 flex items-center justify-center text-xs font-semibold text-green-600 dark:text-green-300 sticky left-0 z-10">
                {row + 1}
              </div>
              
              {/* Cells */}
              {cells.map(({ cellId, cell }, cellIdx) => {
                const isSelected = selectedCell === cellId;
                const isInRange = selectedCellsSet.has(cellId);
                const isEditing = editingCell === cellId;
                const colLetter = cellId[0];
                return (
                  <SpreadsheetCell
                    key={cellId}
                    cellId={cellId}
                    cell={cell}
                    isSelected={isSelected}
                    isInRange={isInRange}
                    isEditing={isEditing}
                    {...getCellHandlers(cellId)}
                    inputRef={inputRef}
                    editValue={editValue}
                    setEditValue={setEditValue}
                    handleEditSubmit={handleEditSubmit}
                    handleEditKeyDown={handleEditKeyDown}
                    style={{ 
                      userSelect: 'none',
                      border: isInRange ? '2px dotted #059669' : undefined,
                      boxSizing: 'border-box',
                      ...(sortedCol === colLetter ? { animation: 'flash 0.5s' } : {})
                    }}
                    isSheetLoading={isSheetLoading}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
          
        </div>
      </div>
      
      {/* Add More Rows Button - Only show when at bottom */}
      {showAddRowsButton && onAddMoreRows && sheet.rowCount < 100000 && (
        <div className="flex justify-center py-4 bg-green-50 dark:bg-green-900 border-t border-green-200 dark:border-green-700">
          <button
            onClick={onAddMoreRows}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl flex items-center gap-2"
            title={`Add 1,000 more rows (${sheet.rowCount.toLocaleString()} / 100,000 total rows)`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add 1,000 More Rows
            <span className="text-sm opacity-80">
              ({sheet.rowCount.toLocaleString()} / 100,000)
            </span>
          </button>
        </div>
      )}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MenuItem onClick={() => { /* Cut logic */ setMenuAnchor(null); }}>
          <ListItemIcon><ContentCutIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Cut</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { /* Copy logic */ setMenuAnchor(null); }}>
          <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Copy</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { /* Paste logic */ setMenuAnchor(null); }}>
          <ListItemIcon><ContentPasteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Paste</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { /* Insert left logic */ setMenuAnchor(null); }}>
          <ListItemIcon><AddIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Insert 1 column to the left</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { /* Insert right logic */ setMenuAnchor(null); }}>
          <ListItemIcon><AddIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Insert 1 column to the right</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { /* Delete column logic */ setMenuAnchor(null); }}>
          <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Delete column</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { /* Clear column logic */ setMenuAnchor(null); }}>
          <ListItemIcon><RemoveIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Clear column</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { /* Hide column logic */ setMenuAnchor(null); }}>
          <ListItemIcon><VisibilityOffIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Hide column</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={async () => {
          if (menuCol && bulkUpdateCells && setSheetLoading) {
            setSheetLoading(true);
            const values = [];
            for (let row = 1; row < sheet.rowCount; row++) {
              const cellId = `${menuCol}${row + 1}`;
              values.push(sheet.cells[cellId]?.value);
            }
            const sortedValues = [...values].sort((a, b) => {
              if (a == null) return 1;
              if (b == null) return -1;
              return a - b;
            });
            const updates = [];
            for (let row = 1; row < sheet.rowCount; row++) {
              const cellId = `${menuCol}${row + 1}`;
              updates.push({ cellId, value: sortedValues[row - 1] });
            }
            await bulkUpdateCells(updates);
            setSortedCol(menuCol);
            setTimeout(() => {
              setSortedCol(null);
              setSheetLoading(false);
            }, 500);
          }
          setMenuAnchor(null);
        }}>
          <ListItemIcon><ArrowDownwardIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Sort sheet A to Z</ListItemText>
        </MenuItem>
        <MenuItem onClick={async () => {
          if (menuCol && bulkUpdateCells && setSheetLoading) {
            setSheetLoading(true);
            const values = [];
            for (let row = 1; row < sheet.rowCount; row++) {
              const cellId = `${menuCol}${row + 1}`;
              values.push(sheet.cells[cellId]?.value);
            }
            const sortedValues = [...values].sort((a, b) => {
              if (a == null) return 1;
              if (b == null) return -1;
              return b - a;
            });
            const updates = [];
            for (let row = 1; row < sheet.rowCount; row++) {
              const cellId = `${menuCol}${row + 1}`;
              updates.push({ cellId, value: sortedValues[row - 1] });
            }
            await bulkUpdateCells(updates);
            setSortedCol(menuCol);
            setTimeout(() => {
              setSortedCol(null);
              setSheetLoading(false);
            }, 500);
          }
          setMenuAnchor(null);
        }}>
          <ListItemIcon><ArrowUpwardIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Sort sheet Z to A</ListItemText>
        </MenuItem>
        {/* Add more menu items as needed */}
      </Menu>
    </div>
  );
};
