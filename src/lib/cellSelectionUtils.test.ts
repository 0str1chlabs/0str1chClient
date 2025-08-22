import { 
  createCellSelectionContext, 
  getSelectionRange, 
  getColumnsForSelection,
  getSampleValues,
  analyzeColumnTypes,
  parseCellId,
  columnLetterToIndex,
  indexToColumnLetter
} from './cellSelectionUtils';
import { SheetData } from '@/types/spreadsheet';

// Mock sheet data for testing
const mockSheet: SheetData = {
  id: 'test-sheet',
  name: 'Test Sheet',
  rowCount: 10,
  colCount: 5,
  cells: {
    // Headers (row 1)
    'A1': { value: 'Name' },
    'B1': { value: 'Age' },
    'C1': { value: 'Department' },
    'D1': { value: 'Salary' },
    'E1': { value: 'Start Date' },
    
    // Data rows
    'A2': { value: 'Alice' },
    'B2': { value: 25 },
    'C2': { value: 'Engineering' },
    'D2': { value: 75000 },
    'E2': { value: '2023-01-15' },
    
    'A3': { value: 'Bob' },
    'B3': { value: 30 },
    'C3': { value: 'Marketing' },
    'D3': { value: 65000 },
    'E3': { value: '2022-06-20' },
    
    'A4': { value: 'Charlie' },
    'B4': { value: 28 },
    'C4': { value: 'Engineering' },
    'D4': { value: 80000 },
    'E4': { value: '2023-03-10' },
  }
};

describe('Cell Selection Utils', () => {
  describe('parseCellId', () => {
    test('should parse single letter column correctly', () => {
      const result = parseCellId('A1');
      expect(result).toEqual({ column: 'A', row: 1, colIndex: 0 });
    });

    test('should parse multi-digit row correctly', () => {
      const result = parseCellId('C15');
      expect(result).toEqual({ column: 'C', row: 15, colIndex: 2 });
    });
  });

  describe('columnLetterToIndex and indexToColumnLetter', () => {
    test('should convert column letters to indices', () => {
      expect(columnLetterToIndex('A')).toBe(0);
      expect(columnLetterToIndex('B')).toBe(1);
      expect(columnLetterToIndex('Z')).toBe(25);
    });

    test('should convert indices to column letters', () => {
      expect(indexToColumnLetter(0)).toBe('A');
      expect(indexToColumnLetter(1)).toBe('B');
      expect(indexToColumnLetter(25)).toBe('Z');
    });
  });

  describe('getSelectionRange', () => {
    test('should return single cell for single selection', () => {
      expect(getSelectionRange(['A1'])).toBe('A1');
    });

    test('should return range for contiguous selection', () => {
      expect(getSelectionRange(['A1', 'A2', 'B1', 'B2'])).toBe('A1:B2');
    });

    test('should return count for non-contiguous selection', () => {
      expect(getSelectionRange(['A1', 'C3', 'E5'])).toBe('3 selected cells');
    });
  });

  describe('getColumnsForSelection', () => {
    test('should get column headers for selection', () => {
      const columns = getColumnsForSelection(['A2', 'B2', 'C2'], mockSheet);
      expect(columns).toEqual(['Name', 'Age', 'Department']);
    });

    test('should use column letters when no headers available', () => {
      const emptySheet: SheetData = { ...mockSheet, cells: {} };
      const columns = getColumnsForSelection(['A1', 'B1'], emptySheet);
      expect(columns).toEqual(['A', 'B']);
    });
  });

  describe('getSampleValues', () => {
    test('should get sample values from selected cells', () => {
      const samples = getSampleValues(['A2', 'B2', 'C2', 'A3', 'B3', 'C3'], mockSheet, 2);
      expect(samples).toHaveLength(2);
      expect(samples[0]).toEqual({
        'Name': 'Alice',
        'Age': 25,
        'Department': 'Engineering'
      });
      expect(samples[1]).toEqual({
        'Name': 'Bob',
        'Age': 30,
        'Department': 'Marketing'
      });
    });

    test('should skip header row in samples', () => {
      const samples = getSampleValues(['A1', 'A2', 'A3'], mockSheet, 3);
      expect(samples).toHaveLength(2); // Should exclude row 1 (header)
      expect(samples[0]).toEqual({ 'Name': 'Alice' });
      expect(samples[1]).toEqual({ 'Name': 'Bob' });
    });
  });

  describe('analyzeColumnTypes', () => {
    test('should classify numeric and text columns', () => {
      const { numeric_columns, text_columns } = analyzeColumnTypes(['A2', 'B2', 'C2', 'D2'], mockSheet);
      expect(numeric_columns).toContain('Age');
      expect(numeric_columns).toContain('Salary');
      expect(text_columns).toContain('Name');
      expect(text_columns).toContain('Department');
    });
  });

  describe('createCellSelectionContext', () => {
    test('should create complete selection context for single cell', () => {
      const context = createCellSelectionContext(['B2'], mockSheet);
      expect(context).toEqual({
        selected_range: 'B2',
        columns: ['Age'],
        row_count: 1,
        sample_values: [{ 'Age': 25 }],
        selection_type: 'single',
        has_headers: false,
        numeric_columns: ['Age'],
        text_columns: []
      });
    });

    test('should create complete selection context for range', () => {
      const context = createCellSelectionContext(['A2', 'B2', 'A3', 'B3'], mockSheet);
      expect(context).toEqual({
        selected_range: 'A2:B3',
        columns: ['Name', 'Age'],
        row_count: 2,
        sample_values: [
          { 'Name': 'Alice', 'Age': 25 },
          { 'Name': 'Bob', 'Age': 30 }
        ],
        selection_type: 'range',
        has_headers: false,
        numeric_columns: ['Age'],
        text_columns: ['Name']
      });
    });

    test('should detect headers when row 1 is selected', () => {
      const context = createCellSelectionContext(['A1', 'A2', 'A3'], mockSheet);
      expect(context?.has_headers).toBe(true);
      expect(context?.row_count).toBe(2); // Should exclude header row from count
    });

    test('should return null for empty selection', () => {
      const context = createCellSelectionContext([], mockSheet);
      expect(context).toBeNull();
    });
  });
});
