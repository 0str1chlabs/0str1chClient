/**
 * Smart Statistics Calculator using AI Schema
 * Handles data type detection and proper aggregation
 */

import { getDisplayValue } from './aiSchemaGenerator';

export interface SmartStats {
  sum: string;
  avg: string;
  min: string;
  max: string;
  count: number;
  countNumbers: number;
  allNumeric: boolean;
  mixed: boolean;
  dataType: 'INTEGER' | 'DOUBLE' | 'VARCHAR' | 'DATE' | 'BOOLEAN';
  displayFormat?: string;
  occurrences?: { value: any; count: number; cells: string[] }[];
}

/**
 * Calculate smart statistics for selected cells using AI schema
 */
export function calculateSmartStatistics(
  selectedCells: string[],
  activeSheet: any,
  aiSchema?: any
): SmartStats | null {
  if (!selectedCells || selectedCells.length === 0 || !activeSheet) {
    return null;
  }

  console.log('🔍 Smart Statistics called with:', {
    selectedCellsCount: selectedCells.length,
    hasAiSchema: !!aiSchema,
    aiSchemaColumns: aiSchema?.columns?.length || 0
  });

  try {
    // Extract cell values and filter out undefined/empty values
    const cellValues = selectedCells.map(cellId => {
      const cell = activeSheet.cells[cellId];
      return cell?.value;
    }).filter(value => value !== undefined && value !== '');

    if (cellValues.length === 0) return null;

    // Try to determine data type from AI schema or infer from data
    let dataType: 'INTEGER' | 'DOUBLE' | 'VARCHAR' | 'DATE' | 'BOOLEAN' = 'VARCHAR';
    let displayFormat: string | undefined;
    let cleanedValues: number[] = [];

    if (aiSchema) {
      // Use AI schema to determine data type
      const columnName = getColumnNameFromCells(selectedCells, activeSheet);
      console.log('🔍 Smart Statistics Debug:', {
        columnName,
        aiSchemaColumns: aiSchema.columns?.map((col: any) => col.name),
        selectedCells: selectedCells.slice(0, 3)
      });
      
      const columnSchema = aiSchema.columns.find((col: any) => col.name === columnName);
      
      if (columnSchema) {
        console.log('✅ Found column schema:', columnSchema);
        dataType = columnSchema.type;
        displayFormat = columnSchema.displayFormat;
        
        // Clean values based on schema
        cleanedValues = cellValues.map(val => {
          if (val === null || val === undefined || val === '') return NaN;
          
          switch (dataType) {
            case 'INTEGER':
            case 'DOUBLE':
              // Remove formatting characters (currency symbols, commas, percentages)
              const cleanVal = String(val).replace(/[,$%]/g, '');
              return parseFloat(cleanVal);
            default:
              return NaN;
          }
        }).filter(val => !isNaN(val));
      } else {
        console.log('❌ No column schema found, falling back to inference');
      }
    } else {
      // Fallback: infer data type from values
      const numericValues = cellValues.filter(value => {
        const cleanVal = String(value).replace(/[,$%]/g, '');
        return !isNaN(Number(cleanVal)) && cleanVal !== '';
      });
      
      if (numericValues.length === cellValues.length) {
        // All values are numeric
        const hasDecimals = numericValues.some(val => {
          const cleanVal = String(val).replace(/[,$%]/g, '');
          return cleanVal.includes('.');
        });
        
        dataType = hasDecimals ? 'DOUBLE' : 'INTEGER';
        
        // Check for display format
        const firstVal = cellValues[0];
        if (typeof firstVal === 'string') {
          if (firstVal.startsWith('$')) displayFormat = '$';
          else if (firstVal.startsWith('€')) displayFormat = '€';
          else if (firstVal.startsWith('£')) displayFormat = '£';
          else if (firstVal.endsWith('%')) displayFormat = '%';
        }
        
        cleanedValues = numericValues.map(val => {
          const cleanVal = String(val).replace(/[,$%]/g, '');
          return parseFloat(cleanVal);
        });
      }
    }

    const allNumeric = cleanedValues.length === cellValues.length && cleanedValues.length > 0;

    // Calculate occurrences for all values (not just numeric)
    const occurrences = calculateOccurrences(selectedCells, activeSheet);

    if (allNumeric && cleanedValues.length > 0) {
      // Calculate statistics
      const sum = cleanedValues.reduce((a, b) => a + b, 0);
      const avg = sum / cleanedValues.length;
      const min = Math.min(...cleanedValues);
      const max = Math.max(...cleanedValues);
      const count = cellValues.length;
      const countNumbers = cleanedValues.length;

      // Format results with display format
      const formatValue = (value: number) => {
        if (displayFormat) {
          return `${displayFormat}${value.toFixed(dataType === 'INTEGER' ? 0 : 2)}`;
        }
        return value.toFixed(dataType === 'INTEGER' ? 0 : 2);
      };

      return {
        sum: formatValue(sum),
        avg: formatValue(avg),
        min: formatValue(min),
        max: formatValue(max),
        count,
        countNumbers,
        allNumeric: true,
        mixed: false,
        dataType,
        displayFormat,
        occurrences
      };
    } else {
      // Mixed content - only show count
      return {
        sum: displayFormat ? `${displayFormat}0` : '0',
        avg: displayFormat ? `${displayFormat}0` : '0',
        min: displayFormat ? `${displayFormat}0` : '0',
        max: displayFormat ? `${displayFormat}0` : '0',
        count: cellValues.length,
        countNumbers: cleanedValues.length,
        allNumeric: false,
        mixed: cleanedValues.length > 0 && cleanedValues.length < cellValues.length,
        dataType,
        displayFormat,
        occurrences
      };
    }
  } catch (error) {
    console.error('Error calculating smart statistics:', error);
    return null;
  }
}

/**
 * Get column name from selected cells
 */
function getColumnNameFromCells(selectedCells: string[], activeSheet: any): string | null {
  if (!selectedCells || selectedCells.length === 0) return null;
  
  // Get the first cell to determine column
  const firstCellId = selectedCells[0];
  const cell = activeSheet.cells[firstCellId];
  
  // Try to get column header from cell object first
  if (cell && cell.colHeader) {
    return cell.colHeader;
  }
  
  // Fallback: extract column letter from cell ID (e.g., "J451" -> "J")
  const columnMatch = firstCellId.match(/^([A-Z]+)/);
  if (columnMatch) {
    const columnLetter = columnMatch[1];
    console.log('🔍 Extracted column letter:', columnLetter, 'from cell ID:', firstCellId);
    
    // Convert column letter to column index (A=0, B=1, ..., J=9, etc.)
    const columnIndex = columnLetter.split('').reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 65 + 1), 0) - 1;
    console.log('🔍 Column index:', columnIndex);
    
    // Get the header from the first row
    if (activeSheet.cells && activeSheet.cells[`${columnLetter}1`]) {
      const headerCell = activeSheet.cells[`${columnLetter}1`];
      const headerValue = headerCell.value || `Column ${columnLetter}`;
      console.log('🔍 Found header value:', headerValue);
      return headerValue;
    } else {
      console.log('🔍 No header cell found for:', `${columnLetter}1`);
    }
  }
  
  return null;
}

/**
 * Enhanced statistics with data type awareness
 */
export function getEnhancedStatOptions(stats: SmartStats) {
  const baseOptions: Array<{ value: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'countNumbers'; label: string; display: string }> = [
    { value: 'sum' as const, label: 'Sum', display: stats.sum },
    { value: 'avg' as const, label: 'Average', display: stats.avg },
    { value: 'min' as const, label: 'Min', display: stats.min },
    { value: 'max' as const, label: 'Max', display: stats.max },
    { value: 'count' as const, label: 'Count', display: stats.count.toString() }
  ];

  if (stats.mixed) {
    baseOptions.push({ value: 'countNumbers' as const, label: 'Count Numbers', display: stats.countNumbers.toString() });
  }

  return baseOptions;
}

/**
 * Get data type icon for UI
 */
export function getDataTypeIcon(dataType: string) {
  switch (dataType) {
    case 'INTEGER':
    case 'DOUBLE':
      return '🔢';
    case 'DATE':
      return '📅';
    case 'BOOLEAN':
      return '✅';
    case 'VARCHAR':
    default:
      return '📝';
  }
}

/**
 * Get data type description for UI
 */
export function getDataTypeDescription(dataType: string) {
  switch (dataType) {
    case 'INTEGER':
      return 'Whole numbers';
    case 'DOUBLE':
      return 'Decimal numbers';
    case 'DATE':
      return 'Dates';
    case 'BOOLEAN':
      return 'True/False values';
    case 'VARCHAR':
    default:
      return 'Text values';
  }
}

/**
 * Calculate occurrences of similar values across the sheet
 */
function calculateOccurrences(selectedCells: string[], activeSheet: any): { value: any; count: number; cells: string[] }[] {
  if (!selectedCells.length || !activeSheet) {
    return [];
  }

  // Get values from selected cells
  const selectedValues = selectedCells.map(cellId => {
    const cell = activeSheet.cells[cellId];
    return cell?.value;
  }).filter(value => value !== undefined && value !== null && value !== '');

  if (selectedValues.length === 0) {
    return [];
  }

  // Count similar values across the entire sheet
  const valueCounts = new Map<any, { count: number; cells: string[] }>();
  
  // Iterate through all cells in the sheet
  Object.entries(activeSheet.cells).forEach(([cellId, cell]: [string, any]) => {
    const value = cell?.value;
    if (value !== undefined && value !== null && value !== '') {
      // Check if this value matches any of the selected values
      const matchingSelectedValue = selectedValues.find(selectedValue => 
        String(value) === String(selectedValue)
      );
      
      if (matchingSelectedValue !== undefined) {
        if (!valueCounts.has(matchingSelectedValue)) {
          valueCounts.set(matchingSelectedValue, { count: 0, cells: [] });
        }
        const data = valueCounts.get(matchingSelectedValue)!;
        data.count++;
        data.cells.push(cellId);
      }
    }
  });

  // Convert to array and sort by count (descending)
  const occurrences = Array.from(valueCounts.entries())
    .map(([value, data]) => ({ value, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Limit to top 10

  return occurrences;
}
