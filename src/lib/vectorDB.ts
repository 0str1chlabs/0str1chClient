// Vector Database utilities for spreadsheet data

export interface CellDocument {
  sheet: string;
  cellId: string;
  row: number;
  col: string;
  value: string;
  rowValues: string[];
  colHeader: string;
  sheetId?: string;
  timestamp?: number;
  dataType?: 'header' | 'data' | 'formula';
}

export interface VectorDBConfig {
  collectionName: string;
  embeddingModel?: string;
  dimensions?: number;
}

/**
 * Transforms CSV data into cell documents suitable for vector database storage
 * Each cell becomes a document with rich context for AI operations
 */
export function transformCsvToCellDocs(
  csvData: string[][], 
  sheetName: string, 
  sheetId?: string
): CellDocument[] {
  if (!csvData || csvData.length === 0) {
    return [];
  }

  const headers = csvData[0] || [];
  const timestamp = Date.now();
  
  return csvData.flatMap((row, rowIndex) =>
    row.map((value, colIndex) => {
      const colLetter = String.fromCharCode(65 + colIndex);
      const cellId = `${colLetter}${rowIndex + 1}`;
      const colHeader = headers[colIndex] || colLetter;
      
      // Determine data type
      let dataType: 'header' | 'data' | 'formula' = 'data';
      if (rowIndex === 0) {
        dataType = 'header';
      } else if (value.startsWith('=')) {
        dataType = 'formula';
      }

      return {
        sheet: sheetName,
        cellId,
        row: rowIndex + 1,
        col: colLetter,
        value: value.trim(),
        rowValues: row,
        colHeader,
        sheetId,
        timestamp,
        dataType,
      };
    })
  );
}

/**
 * Creates a searchable text representation of a cell for embedding
 * This combines the cell value with its context for better AI understanding
 */
export function createCellSearchText(cell: CellDocument): string {
  const parts = [
    `Cell ${cell.cellId}`,
    `Column: ${cell.colHeader}`,
    `Row: ${cell.row}`,
    `Value: ${cell.value}`,
    `Sheet: ${cell.sheet}`,
  ];

  // Add row context if available
  if (cell.rowValues && cell.rowValues.length > 0) {
    const rowContext = cell.rowValues
      .map((val, idx) => `${String.fromCharCode(65 + idx)}${cell.row}: ${val}`)
      .join(', ');
    parts.push(`Row data: ${rowContext}`);
  }

  return parts.join(' | ');
}

/**
 * Groups cells by row for row-level operations
 */
export function groupCellsByRow(cells: CellDocument[]): Record<number, CellDocument[]> {
  return cells.reduce((groups, cell) => {
    if (!groups[cell.row]) {
      groups[cell.row] = [];
    }
    groups[cell.row].push(cell);
    return groups;
  }, {} as Record<number, CellDocument[]>);
}

/**
 * Groups cells by column for column-level operations
 */
export function groupCellsByColumn(cells: CellDocument[]): Record<string, CellDocument[]> {
  return cells.reduce((groups, cell) => {
    if (!groups[cell.col]) {
      groups[cell.col] = [];
    }
    groups[cell.col].push(cell);
    return groups;
  }, {} as Record<string, CellDocument[]>);
}

/**
 * Filters cells by data type
 */
export function filterCellsByType(cells: CellDocument[], type: 'header' | 'data' | 'formula'): CellDocument[] {
  return cells.filter(cell => cell.dataType === type);
}

/**
 * Gets all headers from the cell documents
 */
export function getHeaders(cells: CellDocument[]): CellDocument[] {
  return filterCellsByType(cells, 'header');
}

/**
 * Gets all data cells (excluding headers)
 */
export function getDataCells(cells: CellDocument[]): CellDocument[] {
  return filterCellsByType(cells, 'data');
}

/**
 * Gets all formula cells
 */
export function getFormulaCells(cells: CellDocument[]): CellDocument[] {
  return filterCellsByType(cells, 'formula');
}

/**
 * Creates a summary of the sheet data for AI context
 */
export function createSheetSummary(cells: CellDocument[]): {
  totalCells: number;
  headers: string[];
  dataRows: number;
  columns: string[];
  formulas: number;
  sheetName: string;
} {
  const headers = getHeaders(cells);
  const dataCells = getDataCells(cells);
  const formulaCells = getFormulaCells(cells);
  
  const uniqueRows = new Set(dataCells.map(cell => cell.row));
  const uniqueCols = new Set(cells.map(cell => cell.col));
  
  return {
    totalCells: cells.length,
    headers: headers.map(cell => cell.value),
    dataRows: uniqueRows.size,
    columns: Array.from(uniqueCols).sort(),
    formulas: formulaCells.length,
    sheetName: cells[0]?.sheet || 'Unknown',
  };
} 