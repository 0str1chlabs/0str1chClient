import { SheetData } from '@/types/spreadsheet';

export interface CellSelectionContext {
  selected_range: string;
  columns: string[];
  row_count: number;
  sample_values: Array<Record<string, any>>;
  selection_type: 'single' | 'range' | 'multiple';
  has_headers: boolean;
  numeric_columns: string[];
  text_columns: string[];
}

/**
 * Converts Excel-style column letter to index (A=0, B=1, etc.)
 */
export const columnLetterToIndex = (letter: string): number => {
  return letter.charCodeAt(0) - 65;
};

/**
 * Converts index to Excel-style column letter (0=A, 1=B, etc.)
 */
export const indexToColumnLetter = (index: number): string => {
  return String.fromCharCode(65 + index);
};

/**
 * Parses cell ID to get row and column info
 */
export const parseCellId = (cellId: string): { column: string; row: number; colIndex: number } => {
  const match = cellId.match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error(`Invalid cell ID: ${cellId}`);
  
  const column = match[1];
  const row = parseInt(match[2]);
  const colIndex = columnLetterToIndex(column);
  
  return { column, row, colIndex };
};

/**
 * Determines if selected cells form a contiguous range
 */
export const getSelectionRange = (selectedCells: string[]): string => {
  if (selectedCells.length === 0) return '';
  if (selectedCells.length === 1) return selectedCells[0];

  // Parse all cell positions
  const positions = selectedCells.map(cellId => {
    const { column, row, colIndex } = parseCellId(cellId);
    return { cellId, column, row, colIndex };
  });

  // Sort by row then column
  positions.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.colIndex - b.colIndex;
  });

  // Check if it's a contiguous range
  const minRow = Math.min(...positions.map(p => p.row));
  const maxRow = Math.max(...positions.map(p => p.row));
  const minCol = Math.min(...positions.map(p => p.colIndex));
  const maxCol = Math.max(...positions.map(p => p.colIndex));

  const expectedCells = (maxRow - minRow + 1) * (maxCol - minCol + 1);
  const isContiguous = selectedCells.length === expectedCells;

  if (isContiguous) {
    const startCell = `${indexToColumnLetter(minCol)}${minRow}`;
    const endCell = `${indexToColumnLetter(maxCol)}${maxRow}`;
    return startCell === endCell ? startCell : `${startCell}:${endCell}`;
  } else {
    // Multiple non-contiguous selections
    return `${selectedCells.length} selected cells`;
  }
};

/**
 * Gets column headers for the selected range
 */
export const getColumnsForSelection = (selectedCells: string[], activeSheet: SheetData): string[] => {
  if (!selectedCells.length || !activeSheet) return [];

  // Get unique columns from selected cells
  const uniqueColumns = new Set<string>();
  selectedCells.forEach(cellId => {
    const { column } = parseCellId(cellId);
    uniqueColumns.add(column);
  });

  // Get column headers (from row 1) or use column letters as fallback
  const columns = Array.from(uniqueColumns).sort().map(column => {
    const headerCell = activeSheet.cells[`${column}1`];
    return headerCell?.value ? String(headerCell.value) : column;
  });

  return columns;
};

/**
 * Gets sample values from selected cells
 */
export const getSampleValues = (selectedCells: string[], activeSheet: SheetData, maxSamples: number = 3): Array<Record<string, any>> => {
  if (!selectedCells.length || !activeSheet) return [];

  // Group cells by row
  const cellsByRow = new Map<number, Array<{ column: string; value: any }>>();
  
  selectedCells.forEach(cellId => {
    const { column, row } = parseCellId(cellId);
    const cell = activeSheet.cells[cellId];
    
    if (!cellsByRow.has(row)) {
      cellsByRow.set(row, []);
    }
    
    cellsByRow.get(row)!.push({
      column,
      value: cell?.value || ''
    });
  });

  // Get column headers
  const columns = getColumnsForSelection(selectedCells, activeSheet);
  const columnMapping = new Map<string, string>();
  columns.forEach(header => {
    // Find the column letter that corresponds to this header
    for (let i = 0; i < activeSheet.colCount; i++) {
      const colLetter = indexToColumnLetter(i);
      const headerCell = activeSheet.cells[`${colLetter}1`];
      if (headerCell?.value === header || (!headerCell?.value && colLetter === header)) {
        columnMapping.set(colLetter, header);
        break;
      }
    }
  });

  // Convert to sample objects, skipping header row (row 1)
  const samples: Array<Record<string, any>> = [];
  const sortedRows = Array.from(cellsByRow.keys()).sort((a, b) => a - b);
  
  for (const row of sortedRows) {
    if (row === 1) continue; // Skip header row
    if (samples.length >= maxSamples) break;
    
    const rowCells = cellsByRow.get(row)!;
    const sampleRow: Record<string, any> = {};
    
    rowCells.forEach(({ column, value }) => {
      const headerName = columnMapping.get(column) || column;
      sampleRow[headerName] = value;
    });
    
    // Only add if the row has some data
    if (Object.values(sampleRow).some(v => v !== '' && v !== null && v !== undefined)) {
      samples.push(sampleRow);
    }
  }

  return samples;
};

/**
 * Analyzes column types in the selection
 */
export const analyzeColumnTypes = (selectedCells: string[], activeSheet: SheetData): { numeric_columns: string[]; text_columns: string[] } => {
  if (!selectedCells.length || !activeSheet) return { numeric_columns: [], text_columns: [] };

  const columns = getColumnsForSelection(selectedCells, activeSheet);
  const columnMapping = new Map<string, string>();
  
  // Create mapping from column letter to header name
  columns.forEach(header => {
    for (let i = 0; i < activeSheet.colCount; i++) {
      const colLetter = indexToColumnLetter(i);
      const headerCell = activeSheet.cells[`${colLetter}1`];
      if (headerCell?.value === header || (!headerCell?.value && colLetter === header)) {
        columnMapping.set(colLetter, header);
        break;
      }
    }
  });

  const columnAnalysis = new Map<string, { numeric: number; text: number }>();
  
  // Initialize analysis for each column
  columns.forEach(column => {
    columnAnalysis.set(column, { numeric: 0, text: 0 });
  });

  // Analyze values in selected cells (skip header row)
  selectedCells.forEach(cellId => {
    const { column, row } = parseCellId(cellId);
    if (row === 1) return; // Skip header row
    
    const headerName = columnMapping.get(column);
    if (!headerName) return;
    
    const cell = activeSheet.cells[cellId];
    const value = cell?.value;
    
    if (value !== null && value !== undefined && value !== '') {
      const analysis = columnAnalysis.get(headerName)!;
      
      if (typeof value === 'number' || (!isNaN(Number(value)) && !isNaN(parseFloat(String(value))))) {
        analysis.numeric++;
      } else {
        analysis.text++;
      }
    }
  });

  // Classify columns based on majority type
  const numeric_columns: string[] = [];
  const text_columns: string[] = [];

  columnAnalysis.forEach((analysis, column) => {
    const total = analysis.numeric + analysis.text;
    if (total === 0) {
      text_columns.push(column); // Default to text if no data
    } else if (analysis.numeric > analysis.text) {
      numeric_columns.push(column);
    } else {
      text_columns.push(column);
    }
  });

  return { numeric_columns, text_columns };
};

/**
 * Creates comprehensive cell selection context for AI processing
 */
export const createCellSelectionContext = (selectedCells: string[], activeSheet: SheetData): CellSelectionContext | null => {
  if (!selectedCells.length || !activeSheet) return null;

  const selected_range = getSelectionRange(selectedCells);
  const columns = getColumnsForSelection(selectedCells, activeSheet);
  const sample_values = getSampleValues(selectedCells, activeSheet);
  const { numeric_columns, text_columns } = analyzeColumnTypes(selectedCells, activeSheet);

  // Determine selection type
  let selection_type: 'single' | 'range' | 'multiple';
  if (selectedCells.length === 1) {
    selection_type = 'single';
  } else if (selected_range.includes(':')) {
    selection_type = 'range';
  } else {
    selection_type = 'multiple';
  }

  // Check if selection includes headers (row 1)
  const has_headers = selectedCells.some(cellId => parseCellId(cellId).row === 1);

  // Count data rows (exclude header row if present)
  const uniqueRows = new Set(selectedCells.map(cellId => parseCellId(cellId).row));
  const row_count = has_headers ? uniqueRows.size - 1 : uniqueRows.size;

  return {
    selected_range,
    columns,
    row_count,
    sample_values,
    selection_type,
    has_headers,
    numeric_columns,
    text_columns
  };
};

/**
 * Formats selection context for AI prompt with SQL targeting guidance
 */
export const formatSelectionContextForAI = (context: CellSelectionContext): string => {
  const lines = [
    `Selected Range: ${context.selected_range}`,
    `Selection Type: ${context.selection_type}`,
    `Columns: [${context.columns.join(', ')}]`,
    `Data Rows: ${context.row_count}`,
    `Has Headers: ${context.has_headers ? 'Yes' : 'No'}`
  ];

  if (context.numeric_columns.length > 0) {
    lines.push(`Numeric Columns: [${context.numeric_columns.join(', ')}]`);
  }

  if (context.text_columns.length > 0) {
    lines.push(`Text Columns: [${context.text_columns.join(', ')}]`);
  }

  // Add SQL targeting instructions
  lines.push(`\nSQL Targeting Instructions:`);
  if (context.selection_type === 'single') {
    lines.push(`- Focus on column "${context.columns[0]}" only`);
  } else {
    lines.push(`- SELECT only these columns: ${context.columns.map(col => `"${col}"`).join(', ')}`);
  }
  
  if (context.has_headers) {
    lines.push(`- The selection includes headers, focus on data rows only`);
  }
  
  lines.push(`- Limit results to approximately ${context.row_count} rows from the selected range`);
  lines.push(`- Treat this selection as the complete dataset - do not query beyond these ${context.columns.length} column(s)`);

  if (context.sample_values.length > 0) {
    lines.push(`\nSample Data from Selection:`);
    context.sample_values.forEach((sample, index) => {
      const sampleStr = Object.entries(sample)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ');
      lines.push(`  Row ${index + 1}: {${sampleStr}}`);
    });
  }

  return lines.join('\n');
};

/**
 * Performance-optimized selection utilities
 */

// Cache for parsed cell positions to avoid repeated parsing
const cellPositionCache = new Map<string, { row: number; col: number; colIndex: number }>();

/**
 * Optimized cell position parsing with caching
 */
export const parseCellIdOptimized = (cellId: string): { row: number; col: number; colIndex: number } => {
  if (cellPositionCache.has(cellId)) {
    return cellPositionCache.get(cellId)!;
  }
  
  const result = parseCellId(cellId);
  const parsed = { row: result.row, col: result.colIndex, colIndex: result.colIndex };
  cellPositionCache.set(cellId, parsed);
  return parsed;
};

/**
 * Dirty tracking for efficient updates
 */
export class SelectionDirtyTracker {
  private dirtyCells = new Set<string>();
  private lastSelection: string[] = [];
  
  /**
   * Mark cells as dirty when selection changes
   */
  markDirty(previousSelection: string[], newSelection: string[]): string[] {
    const dirty = new Set<string>();
    
    // Mark previously selected cells as dirty (to remove selection styling)
    previousSelection.forEach(cellId => dirty.add(cellId));
    
    // Mark newly selected cells as dirty (to add selection styling)
    newSelection.forEach(cellId => dirty.add(cellId));
    
    this.dirtyCells = dirty;
    this.lastSelection = [...newSelection];
    
    return Array.from(dirty);
  }
  
  /**
   * Get only the cells that need to be re-rendered
   */
  getDirtyCells(): string[] {
    return Array.from(this.dirtyCells);
  }
  
  /**
   * Clear dirty state after rendering
   */
  clearDirty(): void {
    this.dirtyCells.clear();
  }
  
  /**
   * Check if a cell needs re-rendering
   */
  isDirty(cellId: string): boolean {
    return this.dirtyCells.has(cellId);
  }
}

/**
 * Virtual rendering helpers for large grids
 */
export const getVisibleRange = (
  scrollTop: number,
  scrollLeft: number,
  viewportHeight: number,
  viewportWidth: number,
  rowHeight: number,
  colWidth: number,
  totalRows: number,
  totalCols: number,
  buffer: number = 5
): { startRow: number; endRow: number; startCol: number; endCol: number } => {
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / rowHeight) + buffer);
  const startCol = Math.max(0, Math.floor(scrollLeft / colWidth) - buffer);
  const endCol = Math.min(totalCols, Math.ceil((scrollLeft + viewportWidth) / colWidth) + buffer);
  
  return { startRow, endRow, startCol, endCol };
};

/**
 * Optimized range calculation using cached positions
 */
export const getCellsInRangeOptimized = (start: string, end: string): string[] => {
  const startPos = parseCellIdOptimized(start);
  const endPos = parseCellIdOptimized(end);
  
  const minRow = Math.min(startPos.row, endPos.row);
  const maxRow = Math.max(startPos.row, endPos.row);
  const minCol = Math.min(startPos.col, endPos.col);
  const maxCol = Math.max(startPos.col, endPos.col);
  
  const cells: string[] = [];
  const capacity = (maxRow - minRow + 1) * (maxCol - minCol + 1);
  
  // Pre-allocate array for better performance
  cells.length = capacity;
  let index = 0;
  
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const colLetter = String.fromCharCode(65 + col);
      cells[index++] = `${colLetter}${row}`;
    }
  }
  
  return cells;
};

/**
 * Debounced selection update to prevent excessive re-renders
 */
export const createDebouncedSelectionUpdater = (
  callback: (selection: string[]) => void,
  delay: number = 16 // ~60fps
) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastSelection: string[] = [];
  
  return (selection: string[]) => {
    // Cancel previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Check if selection actually changed
    if (JSON.stringify(selection) === JSON.stringify(lastSelection)) {
      return;
    }
    
    // Use requestAnimationFrame for smooth updates
    timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        callback(selection);
        lastSelection = [...selection];
      });
    }, delay);
  };
};

/**
 * Optimized cell style calculation with memoization
 */
export const createCellStyleCalculator = () => {
  const styleCache = new Map<string, React.CSSProperties>();
  
  return (cell: any, isSelected: boolean, isInRange: boolean): React.CSSProperties => {
    const cacheKey = `${JSON.stringify(cell?.style)}-${isSelected}-${isInRange}`;
    
    if (styleCache.has(cacheKey)) {
      return styleCache.get(cacheKey)!;
    }
    
    const style: React.CSSProperties = {
      fontWeight: cell?.style?.bold ? 'bold' : 'normal',
      fontStyle: cell?.style?.italic ? 'italic' : 'normal',
      textDecoration: cell?.style?.underline ? 'underline' : 'none',
      color: cell?.style?.textColor || undefined,
      backgroundColor: cell?.style?.backgroundColor || undefined,
      fontSize: cell?.style?.fontSize ? `${cell.style.fontSize}px` : undefined,
      fontFamily: cell?.style?.fontFamily || undefined,
      textAlign: cell?.style?.textAlign || 'left',
    };
    
    styleCache.set(cacheKey, style);
    return style;
  };
};

/**
 * Performance monitoring for selection operations
 */
export class SelectionPerformanceMonitor {
  private timings: { [key: string]: number[] } = {};
  
  startTimer(operation: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (!this.timings[operation]) {
        this.timings[operation] = [];
      }
      this.timings[operation].push(duration);
      
      // Keep only last 100 measurements
      if (this.timings[operation].length > 100) {
        this.timings[operation] = this.timings[operation].slice(-100);
      }
      
      // Log slow operations
      if (duration > 16) { // > 60fps threshold
        console.warn(`Slow selection operation: ${operation} took ${duration.toFixed(2)}ms`);
      }
    };
  }
  
  getAverageTime(operation: string): number {
    const times = this.timings[operation];
    if (!times || times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }
  
  reset(): void {
    this.timings = {};
  }
}
