
export interface Cell {
  value: string | number;
  formula?: string;
  style?: CellStyle;
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
}
