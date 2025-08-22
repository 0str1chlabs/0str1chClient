import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Rnd } from 'react-rnd';
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
import { Move, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModernSpreadsheetProps {
  sheet: SheetData;
  updateCell: (cellId: string, value: string | number) => void;
  bulkUpdateCells?: (updates: { cellId: string, value: any }[]) => void;
  onSelectionChange?: (selectedCells: string[]) => void;
  selectedCells?: string[];
  onAddMoreRows?: () => void;
  onSheetNameChange?: (newName: string) => void;
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
        spreadsheet-cell w-32 h-12 border-r border-b border-green-200 dark:border-green-600 relative cursor-pointer transition-all duration-150 text-sm
        ${isSelected 
          ? 'ring-2 ring-green-500 bg-green-100 dark:bg-green-800/50 z-10 shadow-sm' 
          : isInRange
          ? 'bg-green-100/70 dark:bg-green-800/30'
          : 'hover:bg-green-50 dark:hover:bg-green-700/50'
        }
      `}
      style={{
        backgroundColor: cell?.style?.backgroundColor || (cell?.value ? 'white' : 'white'),
        ...style
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      data-cell-id={cellId}
      title={isSelected ? "Double-click to edit or start typing" : "Click to select, double-click to edit"}
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
          onFocus={(e) => e.target.select()}
          className="cell-input w-full h-full border-0 rounded-none p-2 text-sm bg-white dark:bg-green-900 text-green-900 dark:text-green-100 focus:ring-2 focus:ring-green-500 focus:outline-none shadow-inner"
          autoComplete="off"
          spellCheck="false"
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
      
      {/* Edit indicator on hover and for selected cells */}
      <div className={`absolute top-1 right-1 transition-opacity duration-200 pointer-events-none ${
        isSelected ? 'opacity-100' : 'opacity-0 hover:opacity-100'
      }`}>
        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
      </div>
      
      {/* Edit hint for selected cells */}
      {isSelected && !isEditing && (
        <div className="absolute bottom-1 right-1 opacity-60 pointer-events-none">
          <div className="text-xs text-green-600 dark:text-green-400 font-mono">✏️</div>
        </div>
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
  onSheetNameChange,
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuCol, setMenuCol] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [sortedCol, setSortedCol] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth * 0.75,
    height: window.innerHeight * 0.8
  });

  // Set initial dimensions and handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      const newWidth = window.innerWidth * 0.75;
      const newHeight = window.innerHeight * 0.8;
      console.log('Updating dimensions:', { newWidth, newHeight, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight });
      setDimensions({
        width: newWidth,
        height: newHeight
      });
    };

    // Set initial dimensions immediately
    updateDimensions();

    // Add resize listener
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

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

  // Track shift key state and handle keyboard events for the entire spreadsheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
      
      // Check if focus is on an input element (like AI chat input)
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.closest('.no-drag') || // AI assistant inputs
        activeElement.closest('.ai-assistant input') ||
        activeElement.closest('[contenteditable="true"]')
      );
      
      // If an input is focused (but not a cell input), don't handle spreadsheet keyboard shortcuts
      if (isInputFocused && !activeElement.closest('.cell-input')) {
        return; // Let the input handle the keyboard event
      }
      
      // F2 key to start editing (common spreadsheet shortcut)
      if (e.key === 'F2' && selectedCell && !editingCell && !isInputFocused) {
        e.preventDefault();
        setEditingCell(selectedCell);
        // F2 preserves existing content (unlike typing which replaces)
        setEditValue(sheet.cells[selectedCell]?.value?.toString() || '');
        setTimeout(() => inputRef.current?.focus(), 0);
        return;
      }
      
      // Auto-start editing when typing on a selected cell (only if no other input is focused)
      if (selectedCell && !editingCell && !isInputFocused && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Only start editing for actual printable characters, not navigation keys
        if (e.key.length === 1 && e.key !== ' ' && e.key !== 'Tab' && e.key !== 'Enter' && e.key !== 'Escape') {
          e.preventDefault();
          setEditingCell(selectedCell);
          // Start with the typed character (replace existing content)
          setEditValue(e.key);
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      }
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
  }, [selectedCell, editingCell, sheet.cells]);

  // Cell handling functions
  const handleCellClick = useCallback((cellId: string, event: React.MouseEvent) => {
    event.preventDefault();
    
    // If we were editing a cell, save its value first
    if (editingCell && editingCell !== cellId) {
      updateCell(editingCell, editValue);
      setEditingCell(null);
    }
    
    if (selectedCell !== cellId) {
      onSelectionChange?.([cellId]);
    }
    
    // Only select the cell, don't start editing
    // Editing will be triggered by double-click or typing
  }, [editingCell, editValue, updateCell, selectedCell, onSelectionChange]);

  const handleCellDoubleClick = useCallback((cellId: string, event: React.MouseEvent) => {
    event.preventDefault();
    // Double-click starts editing
    setEditingCell(cellId);
    setEditValue(sheet.cells[cellId]?.value?.toString() || '');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [sheet.cells]);

  const handleCellMouseDown = useCallback((cellId: string, event: React.MouseEvent) => {
    event.preventDefault();
    setDragStart(cellId);
    onSelectionChange?.([cellId]);
    setIsDragging(true);
  }, [onSelectionChange]);

  const handleCellMouseEnter = useCallback((cellId: string) => {
    if (isDragging && dragStart) {
      const range = getCellsInRange(dragStart, cellId);
      onSelectionChange?.(range);
    }
  }, [isDragging, dragStart, getCellsInRange, onSelectionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleEditSubmit = useCallback((cellId: string) => {
    if (editingCell) {
      updateCell(editingCell, editValue);
      setEditingCell(null);
      setEditValue('');
      
      // Keep the cell selected after editing
      // Don't change selection - maintain current selection
    }
  }, [editingCell, editValue, updateCell]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingCell) {
        handleEditSubmit(editingCell);
        
        // If we have multiple selected cells, just finish editing and maintain selection
        if (selectedRange.length > 1) {
          // Keep current selection, don't move to next cell
          return;
        }
        
        // For single cell, move to next row, same column (traditional behavior)
        const { row, col } = parseCellId(editingCell);
        const nextCellId = getCellId(row + 1, col);
        onSelectionChange?.([nextCellId]);
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
      // Keep current selection when escaping edit mode
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (editingCell) {
        handleEditSubmit(editingCell);
        
        // If we have multiple selected cells, just finish editing and maintain selection
        if (selectedRange.length > 1) {
          // Keep current selection, don't move to next cell
          return;
        }
        
        // For single cell, move to next column, same row (traditional behavior)
        const { row, col } = parseCellId(editingCell);
        const nextCellId = getCellId(row, col + 1);
        onSelectionChange?.([nextCellId]);
      }
    } else if (e.key === 'ArrowUp' && e.ctrlKey) {
      e.preventDefault();
      if (editingCell) {
        handleEditSubmit(editingCell);
        
        // Move to previous row, same column
        const { row, col } = parseCellId(editingCell);
        const prevCellId = getCellId(Math.max(0, row - 1), col);
        onSelectionChange?.([prevCellId]);
        setEditingCell(prevCellId);
        setEditValue(sheet.cells[prevCellId]?.value?.toString() || '');
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    } else if (e.key === 'ArrowDown' && e.ctrlKey) {
      e.preventDefault();
      if (editingCell) {
        handleEditSubmit(editingCell);
        
        // Move to next row, same column
        const { row, col } = parseCellId(editingCell);
        const nextCellId = getCellId(row + 1, col);
        onSelectionChange?.([nextCellId]);
        setEditingCell(nextCellId);
        setEditValue(sheet.cells[nextCellId]?.value?.toString() || '');
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  }, [editingCell, handleEditSubmit, parseCellId, getCellId, onSelectionChange, sheet.cells]);

  // Zoom functionality
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 25, 400));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 25, 25));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(100);
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

  // Global mouse up handler for drag operations
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  // Calculate visible rows for virtual scrolling
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VISIBLE_ROWS_BUFFER);
  const endRow = Math.min(sheet.rowCount, Math.ceil((scrollTop + 800) / ROW_HEIGHT) + VISIBLE_ROWS_BUFFER);

  // Generate row data for virtual scrolling
  const rowData = useMemo(() => {
    const rows = [];
    for (let row = startRow; row < endRow; row++) {
      const cells = [];
      for (let col = 0; col < sheet.colCount; col++) {
        const cellId = getCellId(row, col);
        cells.push({ cellId, cell: sheet.cells[cellId] });
      }
      rows.push({ row, cells });
    }
    return rows;
  }, [startRow, endRow, sheet.rowCount, sheet.colCount, sheet.cells, getCellId]);

  // Generate column headers for virtual scrolling
  const columnHeaders = useMemo(() => {
    const headers = [];
    for (let col = 0; col < sheet.colCount; col++) {
      headers.push({ col, header: getColHeader(col) });
    }
    return headers;
  }, [sheet.colCount, getColHeader]);

  // Create a set for faster lookups
  const selectedCellsSet = useMemo(() => new Set(selectedRange), [selectedRange]);

  // Optimized event handlers
  const getCellHandlers = useCallback((cellId: string) => ({
    onClick: (e: React.MouseEvent) => handleCellClick(cellId, e),
    onDoubleClick: (e: React.MouseEvent) => handleCellDoubleClick(cellId, e),
    onMouseDown: (e: React.MouseEvent) => handleCellMouseDown(cellId, e),
    onMouseEnter: () => handleCellMouseEnter(cellId),
  }), [handleCellClick, handleCellDoubleClick, handleCellMouseDown, handleCellMouseEnter]);

  // Handle cell selection when editing is done
  useEffect(() => {
    if (!editingCell) {
      setAnchorCell(null);
    }
  }, [editingCell]);

  return (
    <Rnd
      default={{
        x: 50,
        y: 100,
        width: dimensions.width,
        height: dimensions.height,
      }}
      size={{
        width: dimensions.width,
        height: dimensions.height,
      }}
      minWidth={400}
      minHeight={300}
      maxWidth={dimensions.width * 1.3}
      maxHeight={dimensions.height * 1.3}
      dragAxis="both"
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }}
      className="z-10"
      style={{
        background: 'transparent',
        boxShadow: 'none'
      }}
    >
      <div className="bg-green-50 dark:bg-green-900 rounded-2xl border border-green-200 dark:border-green-700 overflow-hidden spreadsheet-container modern-spreadsheet" style={{ backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        {/* Control Bar */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 flex items-center justify-between cursor-move">
          <div className="flex items-center gap-2">
            <Move className="h-4 w-4" />
            <span className="font-medium text-sm">Sheet: {sheet.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-green-600 rounded px-2 py-1">
              <button
                onClick={handleZoomOut}
                className="text-white hover:bg-green-700 rounded px-1 py-0.5 transition-colors"
                title="Zoom Out"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-xs text-white min-w-[40px] text-center">{zoomLevel}%</span>
              <button
                onClick={handleZoomIn}
                className="text-white hover:bg-green-700 rounded px-1 py-0.5 transition-colors"
                title="Zoom In"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={handleZoomReset}
                className="text-white hover:bg-green-700 rounded px-1 py-0.5 transition-colors text-xs"
                title="Reset Zoom"
              >
                Reset
              </button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0 hover:bg-green-600 text-white"
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Spreadsheet Content */}
        {!isMinimized && (
          <div className="overflow-auto" style={{ height: 'calc(100% - 40px)' }}>
            {/* Sheet Name Header - Editable */}
            <div className="bg-gradient-to-r from-green-100 to-green-200 dark:from-green-800 dark:to-green-700 border-b border-green-300 dark:border-green-600 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-green-800 dark:text-green-200">
                    {sheet.name}
                  </h2>
                  {onSheetNameChange && (
                    <button
                      onClick={() => {
                        const newName = prompt('Enter new sheet name:', sheet.name);
                        if (newName && newName.trim() && newName !== sheet.name) {
                          onSheetNameChange(newName.trim());
                        }
                      }}
                      className="p-1 rounded-full hover:bg-green-300 dark:hover:bg-green-600 text-green-700 dark:text-green-300 transition-colors"
                      title="Edit sheet name"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2v11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  {sheet.rowCount} rows × {sheet.colCount} columns
                </div>
              </div>
              
              {/* Add Rows Button */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => onAddMoreRows && onAddMoreRows()}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:scale-105"
                >
                  + Add 1000 Rows
                </button>
                <span className="text-xs text-green-600 dark:text-green-400">
                  Current: {sheet.rowCount} rows
                </span>
              </div>
      </div>

      {/* Spreadsheet Grid */}
      <div 
        ref={scrollAreaRef}
              className="overflow-auto select-none relative" 
        style={{ 
          cursor: isDragging ? 'crosshair' : 'default',
          scrollbarWidth: 'auto',
                scrollbarGutter: 'stable',
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top left',
                height: 'calc(100vh - 300px)', // Fixed height for proper scrolling
                minHeight: '400px'
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
        </div>
      )}

        {/* Context Menu */}
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

      {/* CSS for dotted background and animations */}
      <style>{`
        .spreadsheet-container {
          background-image: radial-gradient(circle, #10b981 1px, transparent 1px);
          background-size: 20px 20px;
        }
        
        @keyframes flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .animate-flash {
          animation: flash 0.5s ease-in-out;
        }
      `}</style>
    </Rnd>
  );
};