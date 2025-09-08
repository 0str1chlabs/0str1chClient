// Schema utilities for extracting and analyzing spreadsheet structure
import { SheetData } from '@/types/spreadsheet';

export interface ColumnSchema {
  name: string;
  letter: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'mixed' | 'empty';
  sampleValues: string[];
  nullCount: number;
  uniqueCount: number;
  totalCount: number;
  hasFormulas: boolean;
  businessRelevance: 'high' | 'medium' | 'low' | 'unknown';
}

export interface SheetSchema {
  sheetName: string;
  totalRows: number;
  totalColumns: number;
  columns: ColumnSchema[];
  dataQuality: {
    completeness: number;
    consistency: number;
    accuracy: number;
  };
  summary: {
    numericColumns: number;
    dateColumns: number;
    textColumns: number;
    formulaColumns: number;
    emptyColumns: number;
  };
}

/**
 * Extract schema information from a spreadsheet
 */
export function extractSheetSchema(sheet: SheetData): SheetSchema {
  if (!sheet || !sheet.cells) {
    throw new Error('Invalid sheet data provided');
  }

  const { rowCount, colCount, cells } = sheet;
  const columns: ColumnSchema[] = [];

  // Analyze each column
  for (let colIndex = 0; colIndex < colCount; colIndex++) {
    const colLetter = String.fromCharCode(65 + colIndex);
    const columnData = extractColumnData(cells, colLetter, rowCount);
    
    columns.push(columnData);
  }

  // Calculate data quality metrics
  const dataQuality = calculateDataQuality(columns, rowCount);
  
  // Generate summary
  const summary = generateSummary(columns);

  return {
    sheetName: sheet.name || 'Sheet',
    totalRows: rowCount,
    totalColumns: colCount,
    columns,
    dataQuality,
    summary
  };
}

/**
 * Extract data for a specific column
 */
function extractColumnData(cells: any, colLetter: string, rowCount: number): ColumnSchema {
  const values: string[] = [];
  let nullCount = 0;
  let hasFormulas = false;
  const uniqueValues = new Set<string>();

  // Collect all values for this column
  for (let row = 1; row <= rowCount; row++) {
    const cellId = `${colLetter}${row}`;
    const cell = cells[cellId];
    
    if (cell && cell.value !== undefined && cell.value !== '') {
      const value = String(cell.value);
      values.push(value);
      uniqueValues.add(value);
      
      // Check for formulas
      if (value.startsWith('=')) {
        hasFormulas = true;
      }
    } else {
      nullCount++;
    }
  }

  // Determine data type
  const dataType = determineDataType(values);
  
  // Assess business relevance
  const businessRelevance = assessBusinessRelevance(colLetter, values, dataType);

  return {
    name: getColumnName(colLetter, values),
    letter: colLetter,
    dataType,
    sampleValues: values.slice(0, 5), // First 5 non-empty values
    nullCount,
    uniqueCount: uniqueValues.size,
    totalCount: rowCount,
    hasFormulas,
    businessRelevance
  };
}

/**
 * Determine the data type of a column based on its values
 */
function determineDataType(values: string[]): ColumnSchema['dataType'] {
  if (values.length === 0) return 'empty';
  
  let hasNumbers = false;
  let hasDates = false;
  let hasBooleans = false;
  let hasText = false;

  for (const value of values) {
    if (value === '') continue;
    
    // Check for numbers
    if (!isNaN(Number(value)) && value.trim() !== '') {
      hasNumbers = true;
    }
    
    // Check for dates
    if (!isNaN(Date.parse(value)) && value.trim() !== '') {
      hasDates = true;
    }
    
    // Check for booleans
    if (['true', 'false', 'yes', 'no', '1', '0'].includes(value.toLowerCase())) {
      hasBooleans = true;
    }
    
    // Check for text
    if (value.trim() !== '' && isNaN(Number(value)) && isNaN(Date.parse(value))) {
      hasText = true;
    }
  }

  // Determine primary type
  if (hasDates && !hasNumbers && !hasText) return 'date';
  if (hasNumbers && !hasDates && !hasText) return 'number';
  if (hasBooleans && !hasNumbers && !hasDates && !hasText) return 'boolean';
  if (hasText) return 'string';
  if (hasNumbers || hasDates) return 'mixed';
  
  return 'empty';
}

/**
 * Get a meaningful column name
 */
function getColumnName(colLetter: string, values: string[]): string {
  // Try to get header from first row
  if (values.length > 0) {
    const header = values[0];
    if (header && header.trim() !== '' && !header.startsWith('=')) {
      return header.trim();
    }
  }
  
  // Fallback to column letter
  return colLetter;
}

/**
 * Assess business relevance of a column
 */
function assessBusinessRelevance(colLetter: string, values: string[], dataType: ColumnSchema['dataType']): ColumnSchema['businessRelevance'] {
  const firstValue = values[0] || '';
  const lowerFirstValue = firstValue.toLowerCase();
  
  // High relevance indicators
  const highRelevanceKeywords = [
    'revenue', 'sales', 'profit', 'income', 'cost', 'expense', 'budget',
    'customer', 'client', 'user', 'employee', 'staff', 'team',
    'date', 'time', 'period', 'month', 'year', 'quarter',
    'region', 'country', 'city', 'location', 'area',
    'product', 'service', 'item', 'sku', 'category',
    'performance', 'kpi', 'metric', 'score', 'rating',
    'status', 'priority', 'level', 'grade', 'rank'
  ];
  
  // Medium relevance indicators
  const mediumRelevanceKeywords = [
    'id', 'reference', 'code', 'number', 'amount', 'quantity',
    'description', 'notes', 'comments', 'details',
    'type', 'category', 'group', 'class', 'division'
  ];
  
  // Low relevance indicators
  const lowRelevanceKeywords = [
    'temp', 'temp_', 'tmp', 'debug', 'test', 'sample',
    'created', 'modified', 'updated', 'timestamp',
    'version', 'revision', 'draft', 'final'
  ];

  // Check for high relevance
  for (const keyword of highRelevanceKeywords) {
    if (lowerFirstValue.includes(keyword) || colLetter === 'A' || colLetter === 'B') {
      return 'high';
    }
  }
  
  // Check for medium relevance
  for (const keyword of mediumRelevanceKeywords) {
    if (lowerFirstValue.includes(keyword)) {
      return 'medium';
    }
  }
  
  // Check for low relevance
  for (const keyword of lowRelevanceKeywords) {
    if (lowerFirstValue.includes(keyword)) {
      return 'low';
    }
  }
  
  // Default based on data type
  if (dataType === 'date' || dataType === 'number') {
    return 'medium';
  }
  
  return 'unknown';
}

/**
 * Calculate data quality metrics
 */
function calculateDataQuality(columns: ColumnSchema[], totalRows: number) {
  let totalCompleteness = 0;
  let totalConsistency = 0;
  let totalAccuracy = 0;
  
  for (const column of columns) {
    // Completeness: percentage of non-null values
    const completeness = ((totalRows - column.nullCount) / totalRows) * 100;
    totalCompleteness += completeness;
    
    // Consistency: percentage of unique values (lower is more consistent for categorical data)
    const consistency = column.dataType === 'string' ? 
      Math.max(0, 100 - (column.uniqueCount / totalRows) * 100) : 
      Math.min(100, (column.uniqueCount / totalRows) * 100);
    totalConsistency += consistency;
    
    // Accuracy: based on data type consistency
    const accuracy = column.dataType !== 'mixed' ? 100 : 70;
    totalAccuracy += accuracy;
  }
  
  const columnCount = columns.length;
  
  return {
    completeness: Math.round(totalCompleteness / columnCount),
    consistency: Math.round(totalConsistency / columnCount),
    accuracy: Math.round(totalAccuracy / columnCount)
  };
}

/**
 * Generate summary statistics
 */
function generateSummary(columns: ColumnSchema[]) {
  return {
    numericColumns: columns.filter(col => col.dataType === 'number').length,
    dateColumns: columns.filter(col => col.dataType === 'date').length,
    textColumns: columns.filter(col => col.dataType === 'string').length,
    formulaColumns: columns.filter(col => col.hasFormulas).length,
    emptyColumns: columns.filter(col => col.dataType === 'empty').length
  };
}

/**
 * Create a simplified schema for AI processing
 */
export function createSimplifiedSchema(schema: SheetSchema): string {
  const simplified = {
    sheet_name: schema.sheetName,
    total_rows: schema.totalRows,
    total_columns: schema.totalColumns,
    columns: schema.columns.map(col => ({
      name: col.name,
      letter: col.letter,
      data_type: col.dataType,
      business_relevance: col.businessRelevance,
      sample_values: col.sampleValues,
      null_percentage: Math.round((col.nullCount / col.totalCount) * 100),
      unique_percentage: Math.round((col.uniqueCount / col.totalCount) * 100),
      has_formulas: col.hasFormulas
    })),
    data_quality: schema.dataQuality,
    summary: schema.summary
  };

  // Return as formatted string that backend can parse
  return `Sheet: ${schema.sheetName}
Rows: ${schema.totalRows}
Columns:
${schema.columns.map(col =>
  `- ${col.name} (${col.letter}): ${col.dataType} (${col.businessRelevance}) e.g. ${col.sampleValues.slice(0, 3).join(', ')}`
).join('\n')}

Data Quality: ${JSON.stringify(schema.dataQuality)}
Summary: ${JSON.stringify(schema.summary)}`;
}

/**
 * Filter columns by business relevance
 */
export function filterColumnsByRelevance(schema: SheetSchema, relevance: ColumnSchema['businessRelevance'][]): ColumnSchema[] {
  return schema.columns.filter(col => relevance.includes(col.businessRelevance));
}

/**
 * Get columns suitable for specific analysis types
 */
export function getColumnsForAnalysis(schema: SheetSchema, analysisType: 'financial' | 'hr' | 'sales' | 'operations'): ColumnSchema[] {
  const typeKeywords: Record<string, string[]> = {
    financial: ['revenue', 'sales', 'profit', 'income', 'cost', 'expense', 'budget', 'amount', 'price'],
    hr: ['employee', 'staff', 'team', 'salary', 'position', 'department', 'hire', 'termination', 'performance'],
    sales: ['customer', 'client', 'lead', 'opportunity', 'deal', 'conversion', 'campaign', 'region', 'territory'],
    operations: ['product', 'service', 'inventory', 'supply', 'logistics', 'quality', 'efficiency', 'process']
  };

  const keywords = typeKeywords[analysisType] || [];

  return schema.columns.filter(col => {
    const lowerName = col.name.toLowerCase();
    return keywords.some(keyword => lowerName.includes(keyword)) || col.businessRelevance === 'high';
  });
}

/**
 * Create direct column mapping from actual sheet headers
 * Uses the first row of data to get actual header names
 */
export function createDirectColumnMapping(sheetData: any[]): { [key: string]: string } {
  const mapping: { [key: string]: string } = {};

  if (!sheetData || sheetData.length === 0) {
    console.warn('⚠️ No sheet data available for column mapping');
    return mapping;
  }

  // Get the first row (headers)
  const headers = sheetData[0];
  if (!headers) {
    console.warn('⚠️ No header row found in sheet data');
    return mapping;
  }

  // Map each header to its Excel column letter
  // Excel columns: A=0, B=1, C=2, etc.
  const excelColumns = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  Object.keys(headers).forEach((excelCol, index) => {
    const headerValue = headers[excelCol]?.toString()?.trim();

    if (headerValue && headerValue.length > 0) {
      // Map the exact header name to its Excel column
      mapping[headerValue] = excelCol;

      // Also map normalized versions (lowercase, trimmed)
      const normalized = headerValue.toLowerCase().trim();
      if (normalized !== headerValue) {
        mapping[normalized] = excelCol;
      }

      console.log(`📋 Mapped header "${headerValue}" -> "${excelCol}"`);
    }
  });

  console.log('🔗 Direct column mapping created:', mapping);
  return mapping;
}

/**
 * Legacy function - kept for backward compatibility but should not be used
 * @deprecated Use createDirectColumnMapping instead
 */
export function createDynamicColumnMapping(schema: SheetSchema): { [key: string]: string } {
  console.warn('⚠️ createDynamicColumnMapping is deprecated. Use createDirectColumnMapping instead.');
  return {};
}

// Test function to verify direct column mapping
export function testDirectMapping(sheetData: any[]) {
  const mapping = createDirectColumnMapping(sheetData);
  console.log('🧪 Testing direct column mapping:');
  console.log('📋 Sheet headers:', Object.keys(mapping));
  console.log('🔗 Generated mapping:', mapping);

  // Test some common lookups
  const testCases = [
    'Department', 'Gender', 'Salary', 'Age',
    'Scientific Temperament', 'Technical Skills', 'Performance Rating'
  ];

  console.log('🧪 Testing lookups:');
  testCases.forEach(testCase => {
    const result = mapping[testCase] || mapping[testCase.toLowerCase()];
    if (result) {
      console.log(`✅ "${testCase}" -> "${result}"`);
    } else {
      console.log(`❌ "${testCase}" -> not found`);
    }
  });

  return mapping;
}
