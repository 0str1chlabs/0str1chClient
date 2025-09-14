/**
 * AI-Powered Schema Generator
 * Analyzes sample data to determine appropriate DuckDB data types
 */

export interface ColumnSchema {
  name: string;
  type: 'VARCHAR' | 'INTEGER' | 'DOUBLE' | 'DATE' | 'BOOLEAN';
  nullable: boolean;
  sampleValues: any[];
  displayFormat?: string; // For mixed data like "$141" -> INTEGER with "$" prefix
  originalValues: any[]; // Keep original values for display
}

export interface AISchemaResponse {
  columns: ColumnSchema[];
  tableName: string;
  totalRows: number;
}

/**
 * Generate DuckDB schema using AI analysis of sample data
 */
export async function generateAISchema(
  tableName: string,
  data: string[][],
  sampleSize: number = 10
): Promise<AISchemaResponse> {
  if (!data || data.length === 0) {
    throw new Error('No data provided for schema generation');
  }

  const headers = data[0];
  const sampleRows = data.slice(1, Math.min(sampleSize + 1, data.length));
  
  // Prepare sample data for AI analysis
  const columnSamples: { [key: string]: any[] } = {};
  
  headers.forEach((header, index) => {
    columnSamples[header] = [];
    sampleRows.forEach(row => {
      if (row[index] !== undefined && row[index] !== null && row[index] !== '') {
        columnSamples[header].push(row[index]);
      }
    });
  });

  // Use fallback schema generation (AI schema moved to backend)
  console.log('Using fallback schema generation (AI schema handled by backend)');
  return generateFallbackSchema(tableName, headers, columnSamples, data.length - 1);
}




/**
 * Generate fallback schema when AI fails
 */
function generateFallbackSchema(
  tableName: string,
  headers: string[],
  columnSamples: { [key: string]: any[] },
  totalRows: number
): AISchemaResponse {
  const columns: ColumnSchema[] = headers.map(header => {
    const samples = columnSamples[header] || [];
    const type = inferDataTypeFallback(samples);
    
    return {
      name: header,
      type,
      nullable: true,
      sampleValues: samples,
      originalValues: samples
    };
  });

  return {
    columns,
    tableName,
    totalRows
  };
}

/**
 * Fallback data type inference
 */
function inferDataTypeFallback(samples: any[]): 'VARCHAR' | 'INTEGER' | 'DOUBLE' | 'DATE' | 'BOOLEAN' {
  if (samples.length === 0) return 'VARCHAR';

  // Check for boolean patterns
  const booleanPatterns = /^(true|false|yes|no|y|n|1|0)$/i;
  if (samples.every(s => booleanPatterns.test(String(s)))) {
    return 'BOOLEAN';
  }

  // Check for date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/ // M/D/YYYY
  ];
  if (samples.some(s => datePatterns.some(pattern => pattern.test(String(s))))) {
    return 'DATE';
  }

  // Check for numeric patterns
  const numericSamples = samples.filter(s => {
    const str = String(s).replace(/[,$%]/g, ''); // Remove common formatting
    return !isNaN(Number(str)) && str !== '';
  });

  if (numericSamples.length > 0) {
    // Check if all numbers are integers
    const allIntegers = numericSamples.every(s => {
      const str = String(s).replace(/[,$%]/g, '');
      return Number.isInteger(Number(str));
    });

    return allIntegers ? 'INTEGER' : 'DOUBLE';
  }

  return 'VARCHAR';
}

/**
 * Generate DuckDB CREATE TABLE SQL from schema
 */
export function generateDuckDBSQL(schema: AISchemaResponse): string {
  const columnDefs = schema.columns.map(col => {
    const nullable = col.nullable ? '' : ' NOT NULL';
    return `"${col.name}" ${col.type}${nullable}`;
  }).join(', ');

  return `CREATE TABLE "${schema.tableName}" (${columnDefs});`;
}

/**
 * Clean and convert data based on schema
 */
export function cleanDataForSchema(data: string[][], schema: AISchemaResponse): any[][] {
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    return row.map((cell, index) => {
      const header = headers[index];
      const columnSchema = schema.columns.find(col => col.name === header);
      
      if (!columnSchema || cell === null || cell === undefined || cell === '') {
        return null;
      }

      return convertValueForSchema(cell, columnSchema);
    });
  });
}

/**
 * Convert individual value based on column schema
 */
function convertValueForSchema(value: any, schema: ColumnSchema): any {
  const str = String(value).trim();
  
  if (str === '') return null;

  switch (schema.type) {
    case 'INTEGER':
      // Remove formatting characters and convert to integer
      const cleanInt = str.replace(/[,$%]/g, '');
      const intVal = parseInt(cleanInt, 10);
      return isNaN(intVal) ? null : intVal;

    case 'DOUBLE':
      // Remove formatting characters and convert to double
      const cleanDouble = str.replace(/[,$%]/g, '');
      const doubleVal = parseFloat(cleanDouble);
      return isNaN(doubleVal) ? null : doubleVal;

    case 'BOOLEAN':
      const boolStr = str.toLowerCase();
      if (['true', 'yes', 'y', '1'].includes(boolStr)) return true;
      if (['false', 'no', 'n', '0'].includes(boolStr)) return false;
      return null;

    case 'DATE':
      // Try to parse various date formats
      const dateVal = new Date(str);
      return isNaN(dateVal.getTime()) ? null : dateVal.toISOString().split('T')[0];

    case 'VARCHAR':
    default:
      return str;
  }
}

/**
 * Get display value for UI (preserves original formatting)
 */
export function getDisplayValue(value: any, schema: ColumnSchema): string {
  if (value === null || value === undefined) return '';

  switch (schema.type) {
    case 'INTEGER':
    case 'DOUBLE':
      if (schema.displayFormat) {
        return `${schema.displayFormat}${value}`;
      }
      return String(value);

    case 'DATE':
      return new Date(value).toLocaleDateString();

    case 'BOOLEAN':
      return value ? 'Yes' : 'No';

    case 'VARCHAR':
    default:
      return String(value);
  }
}
