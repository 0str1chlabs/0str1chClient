
export interface Cell {
  value: string | number;
  formula?: string;
  style?: CellStyle;
  // Dual-state system for AI updates
  originalValue?: string | number;
  aiValue?: string | number;
  hasAIUpdate?: boolean;
  aiUpdateTimestamp?: number;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface SheetData {
  id: string;
  name: string;
  cells: Record<string, Cell>;
  rowCount: number;
  colCount: number;
}

export interface Chart {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'area';
  title: string;
  data: any[];
  range: string;
  minimized: boolean;
}

export interface SpreadsheetState {
  sheets: SheetData[];
  activeSheetId: string;
  charts: Chart[];
  isAIMode: boolean;
  isDarkMode: boolean;
  // Dual-state system
  originalSheets?: SheetData[]; // Backup of original state before AI updates
  hasAIUpdates?: boolean; // Flag to indicate if there are pending AI updates
}

// Pivot Table Types
export interface PivotField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date';
  column: string; // e.g., 'A', 'B', 'C'
}

export interface PivotZone {
  type: 'rows' | 'columns' | 'values' | 'filters';
  fields: PivotField[];
}

export interface PivotTable {
  id: string;
  name: string;
  zones: PivotZone[];
  data: any[][];
  headers: string[];
  isVisible: boolean;
}

export interface PivotTableState {
  rows: string[];
  cols: string[];
  vals: string[];
  aggregatorName: string;
  rendererName: string;
}

// AI Update Types
export interface AIUpdate {
  cellId: string;
  originalValue: string | number;
  aiValue: string | number;
  timestamp: number;
  reasoning?: string;
}

export interface AIUpdateBatch {
  updates: AIUpdate[];
  timestamp: number;
  description?: string;
}
