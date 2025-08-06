import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import * as XLSX from 'xlsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parses a spreadsheet file (Excel/CSV) using xlsx and logs the resulting JSON.
 * @param file - File or ArrayBuffer
 */
export async function parseAndLogSheet(file: File | ArrayBuffer) {
  let data: ArrayBuffer;
  if (file instanceof File) {
    data = await file.arrayBuffer();
  } else {
    data = file;
  }
  const workbook = XLSX.read(data, { type: 'array' });
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`Sheet: ${sheetName}`, json);
  });
}

/**
 * Loads a 2D array (sheet data) into DuckDB-WASM as a table.
 * @param tableName - Name of the table to create
 * @param data - 2D array (first row is header)
 */

/**
 * Runs a SQL query on the DuckDB instance and returns the results as an array.
 * @param sql - SQL query string
 */
export async function queryDuckDB(sql: string) {
  if (!window.duckDB) throw new Error('DuckDB is not initialized.');
  const conn = await window.duckDB.connect();
  const result = await conn.query(sql);
  await conn.close();
  return result.toArray();
}

/**
 * Returns metadata for a parsed sheet: rowCount, colCount, headers
 * @param data - 2D array (first row is header)
 */
export function getSheetMeta(data: string[][]) {
  const rowCount = data.length > 1 ? data.length - 1 : 0; // minus header
  const colCount = data[0]?.length || 0;
  const headers = data[0] || [];
  return { rowCount, colCount, headers };
}

/**
 * Profiles each column of a parsed sheet (2D array) and returns metadata for each column.
 * @param data - 2D array (first row is header)
 * @returns Array of column profiles
 */
export function profileColumns(data: string[][]) {
  if (!data || data.length < 2) return [];
  const headers = data[0];
  const columns = headers.map((header, i) => {
    const colValues = data.slice(1).map(row => row[i]);
    const sample = colValues.slice(0, 10);
    const numeric = colValues.every(v => v !== undefined && v !== null && v !== '' && !isNaN(parseFloat(String(v))));
    const distinct = [...new Set(colValues)].slice(0, 5);
    return {
      name: header,
      type: numeric ? 'number' : 'string',
      sample,
      uniqueSample: distinct,
    };
  });
  return columns;
}

/**
 * Generates a summary string for a sheet using its meta and column profiles.
 * @param meta - { rowCount, colCount, headers }
 * @param profiles - output of profileColumns
 * @returns summary string
 */
export function sheetProfileSummary(meta: { rowCount: number, colCount: number, headers: string[] }, profiles: ReturnType<typeof profileColumns>) {
  const base = `This sheet has ${meta.rowCount} rows and ${meta.colCount} columns.`;
  const colDescriptions = profiles.map(p => {
    return `Column '${p.name}' is of type ${p.type}, sample values: ${p.sample.slice(0, 3).join(", ")}`;
  });
  return `${base} ${colDescriptions.join(" ")}`;
}

// Sample usage (in a React component or elsewhere):
// import { parseAndLogSheet } from './utils';
// parseAndLogSheet(fileInput.files[0]);


import * as duckdb from '@duckdb/duckdb-wasm';

export async function loadSheetToDuckDB(tableName: string, data: string[][]) {
  console.log('=== LOADING SHEET TO DUCKDB ===');
  console.log('Table name:', tableName);
  console.log('Data length:', data.length);
  console.log('First row (header):', data[0]);
  console.log('Sample data rows:', data.slice(1, 4));

  if (!window.duckDB) {
    console.log('Initializing DuckDB...');
    // Define your custom public paths
    const bundle = {
      mainModule: '/duckdb/duckdb-eh.wasm',
      mainWorker: '/duckdb/duckdb-browser-eh.worker.js',
    };

    // Set up a logger (optional but useful)
    const logger = new duckdb.ConsoleLogger();

    // Create a worker
    const worker = new Worker(bundle.mainWorker, { type: 'module' });

    // Create DuckDB instance and assign to window
    window.duckDB = new duckdb.AsyncDuckDB(logger, worker);
    await window.duckDB.instantiate(bundle.mainModule);
    console.log('DuckDB initialized successfully');
  }

  const conn = await window.duckDB.connect();
  console.log('Connected to DuckDB');

  try {
    // Drop existing table to ensure clean state
    try {
      await conn.query(`DROP TABLE IF EXISTS "${tableName}"`);
      console.log('Dropped existing table');
    } catch (error) {
      console.log('No existing table to drop or error dropping:', error);
    }

    // Prepare SQL table
    const header = data[0];
    
    // Clean and validate header names
    const cleanHeader = header.map((col, index) => {
      // If column name is undefined, null, empty, or just whitespace, use a default name
      if (!col || col === 'undefined' || col.trim() === '') {
        return `Column_${index + 1}`;
      }
      // Clean the column name - only remove truly problematic characters, preserve spaces
      // Keep alphanumeric, spaces, and common punctuation, remove only problematic SQL characters
      return col.toString().replace(/[^a-zA-Z0-9_\s]/g, '_');
    });
    
    console.log('Original header:', header);
    console.log('Clean header:', cleanHeader);
    
    const columns = cleanHeader.map(col => `"${col}" VARCHAR`).join(', ');
    console.log('CREATE TABLE SQL:', `CREATE TABLE "${tableName}" (${columns});`);
    
    await conn.query(`CREATE TABLE "${tableName}" (${columns});`);
    console.log('Table created successfully');

    // Insert data rows
    let insertedRows = 0;
    console.log('Starting data insertion...');
    console.log('Data array length:', data.length);
    console.log('Clean header length:', cleanHeader.length);
    
    for (let i = 1; i < data.length; i++) {
      try {
        // Pad or truncate the row to match the header length
        const row = data[i].slice(0, cleanHeader.length);
        while (row.length < cleanHeader.length) row.push('');
        
        // Clean and escape values
        const values = row.map(val => {
          const cleanVal = String(val ?? '').replace(/'/g, "''");
          return `'${cleanVal}'`;
        }).join(', ');
        
        const insertSQL = `INSERT INTO "${tableName}" VALUES (${values});`;
        
        if (insertedRows < 3) {
          console.log(`Inserting row ${i}:`, insertSQL);
        }
        
        await conn.query(insertSQL);
        insertedRows++;
        
        if (insertedRows % 100 === 0) {
          console.log(`Inserted ${insertedRows} rows so far...`);
        }
      } catch (error) {
        console.error(`Error inserting row ${i}:`, error);
        console.error('Row data:', data[i]);
        console.error('Clean header:', cleanHeader);
        console.error('Row length:', data[i].length);
        throw error;
      }
    }

    console.log(`Successfully inserted ${insertedRows} rows`);
    console.log('Data insertion completed');
    
    // Verify the data was inserted
    try {
      console.log('Verifying data insertion...');
      const countResult = await conn.query(`SELECT COUNT(*) as row_count FROM "${tableName}"`);
      const rowCount = countResult.toArray()[0][0];
      console.log('Final row count in table:', rowCount);
      
      if (rowCount === 0) {
        console.error('WARNING: No rows were inserted into the table!');
        throw new Error('No data was inserted into DuckDB table');
      }
      
      // Also check the first few rows to make sure data is there
      const sampleResult = await conn.query(`SELECT * FROM "${tableName}" LIMIT 3`);
      const sampleRows = sampleResult.toArray();
      console.log('Sample rows from table:', sampleRows);
      
    } catch (countError) {
      console.error('Error getting row count:', countError);
      console.log('Proceeding anyway as data was inserted successfully');
    }

  } catch (error) {
    console.error('Error in loadSheetToDuckDB:', error);
    throw error;
  } finally {
    await conn.close();
    console.log('=== END LOADING SHEET TO DUCKDB ===');
  }
}

/**
 * Introspect a DuckDB table and produce a schema summary string.
 * @param {import('@duckdb/duckdb-wasm').AsyncDuckDB} db - Your DuckDB instance
 * @param {string} tableName - Name of the table in DuckDB
 * @param {number} sampleSize - How many sample values per column
 * @returns {Promise<string>} - A summary block suitable for duckdb-nsql prompts
 */
export async function extractDuckDBSchemaSummary(db: any, tableName: string, sampleSize: number = 5): Promise<string> {
  console.log('=== EXTRACTING DUCKDB SCHEMA ===');
  console.log('Table name:', tableName);
  console.log('Sample size:', sampleSize);
  
  let rowCount = 0; // Declare rowCount at the top
  
  const conn = await db.connect();
  console.log('Connected to DuckDB for schema extraction');

  try {
    // First, check if table exists and has data
    try {
      const tableCheck = await conn.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      console.log('Table check result:', tableCheck);
      
      // Safely extract row count with validation
      const tableArray = tableCheck.toArray();
      console.log('Table check array:', tableArray);
      
      if (!tableArray || tableArray.length === 0) {
        console.warn('Table check returned no rows');
        return `Schema:
Table: ${tableName}
Rows: 0
Columns:
- No data found in table`;
      }
      
      const firstRow = tableArray[0];
      console.log('First row object:', firstRow);
      console.log('First row type:', typeof firstRow);
      console.log('First row keys:', Object.keys(firstRow));
      
      if (!firstRow) {
        console.warn('Table check first row is empty');
        return `Schema:
Table: ${tableName}
Rows: 0
Columns:
- No data found in table`;
      }
      
      // Handle StructRow proxy object - try different access methods
      let extractedRowCount;
      
      // Method 1: Try accessing by index
      if (Array.isArray(firstRow)) {
        extractedRowCount = firstRow[0];
        console.log('Accessed as array, rowCount:', extractedRowCount);
      }
      // Method 2: Try accessing by property name
      else if (typeof firstRow === 'object' && firstRow !== null) {
        // Try common column names for count queries
        extractedRowCount = firstRow.count || firstRow.row_count || firstRow['COUNT(*)'] || firstRow[0];
        console.log('Accessed as object, rowCount:', extractedRowCount);
      }
      // Method 3: Try converting to array and accessing
      else {
        const rowArray = Array.from(firstRow);
        extractedRowCount = rowArray[0];
        console.log('Converted to array, rowCount:', extractedRowCount);
      }
      
      // Handle BigInt values from DuckDB
      if (typeof extractedRowCount === 'bigint') {
        extractedRowCount = Number(extractedRowCount);
        console.log('Converted BigInt row count to number:', extractedRowCount);
      }
      
      console.log('Table row count check:', extractedRowCount, 'Type:', typeof extractedRowCount);
      
      if (extractedRowCount === undefined || extractedRowCount === null) {
        console.warn('Row count is undefined/null');
        return `Schema:
Table: ${tableName}
Rows: 0
Columns:
- No data found in table`;
      }
      
      rowCount = extractedRowCount; // Assign to the top-level variable
      
      if (rowCount === 0) {
        console.warn('Table exists but has no data!');
        return `Schema:
Table: ${tableName}
Rows: 0
Columns:
- No data found in table`;
      }
    } catch (tableError) {
      console.error('Error checking table data:', tableError);
      return `Schema:
Table: ${tableName}
Rows: 0
Columns:
- Table not found or error accessing data`;
    }

    // 1) Get column info using standard SQL instead of PRAGMA
    console.log('Getting column info with DESCRIBE...');
    let columns: any[] = [];
    
    try {
      const infoRes = await conn.query(`DESCRIBE "${tableName}"`);
      console.log('DESCRIBE result:', infoRes);
      
      const infoArray = infoRes.toArray();
      console.log('DESCRIBE array:', infoArray);
      
      columns = infoArray.map((row: any) => {
        console.log('Processing DESCRIBE row:', row);
        console.log('Row type:', typeof row);
        console.log('Row keys:', Object.keys(row));
        
        // Handle Proxy(StructRow) objects - try different access methods
        let columnName, columnType;
        
        // Method 1: Try accessing by index
        if (Array.isArray(row)) {
          columnName = row[0];
          columnType = row[1];
          console.log('Accessed as array:', columnName, columnType);
        }
        // Method 2: Try accessing by property name
        else if (typeof row === 'object' && row !== null) {
          // DESCRIBE returns: [column_name, data_type, null, key, default, extra]
          columnName = row.column_name || row.name || row[0];
          columnType = row.data_type || row.type || row[1];
          console.log('Accessed as object:', columnName, columnType);
        }
        // Method 3: Try converting to array and accessing
        else {
          const rowArray = Array.from(row);
          columnName = rowArray[0];
          columnType = rowArray[1];
          console.log('Converted to array:', columnName, columnType);
        }
        
        // If type is still undefined, provide a fallback type
        if (!columnType || columnType === 'undefined') {
          columnType = 'VARCHAR'; // Default to VARCHAR for unknown types
          console.log('Using fallback type VARCHAR for column:', columnName);
        }
        
        return {
          name: columnName,
          type: columnType,
        };
      });

      console.log('DuckDB table info from DESCRIBE:', columns);
    } catch (describeError) {
      console.warn('DESCRIBE failed, trying alternative method:', describeError);
      
      // Alternative: Get column info by querying a single row
      try {
        const sampleRes = await conn.query(`SELECT * FROM "${tableName}" LIMIT 1`);
        console.log('Sample row result:', sampleRes);
        
        // Extract column names from the result schema
        const schema = sampleRes.schema;
        console.log('Sample row schema:', schema);
        
        columns = schema.fields.map((field: any) => ({
          name: field.name,
          type: field.type.toString(),
        }));
        
        console.log('DuckDB table info from schema:', columns);
      } catch (schemaError) {
        console.error('Both DESCRIBE and schema extraction failed:', schemaError);
        return `Schema:
Table: ${tableName}
Rows: 0
Columns:
- Error extracting column information`;
      }
    }

    // Validate column names and filter out invalid ones
    const validColumns = columns.filter(col => {
      const isValid = col.name && 
                     col.name !== 'undefined' && 
                     col.name.trim() !== '' && 
                     col.type && 
                     col.type !== 'undefined' &&
                     col.type.trim() !== '' &&
                     // Filter out single-letter columns (O, P, Q, etc.)
                     col.name.length > 1;
      
      if (!isValid) {
        console.log('Filtering out invalid column:', col);
      }
      
      return isValid;
    });
    
    console.log('Valid columns after filtering:', validColumns);
    
    if (validColumns.length === 0) {
      console.warn('No valid columns found in DuckDB table, using fallback schema');
      return `Schema:
Table: ${tableName}
Rows: ${rowCount}
Columns:
- No valid columns found`;
    }

    // 2) For each column, grab up to sampleSize non-null values
    const schemaLines = [];
    for (const col of validColumns) {
      try {
        const sampleQuery = `
          SELECT "${col.name}" 
          FROM "${tableName}" 
          WHERE "${col.name}" IS NOT NULL 
          LIMIT ${sampleSize};
        `;
        console.log('Sample query for column', col.name, ':', sampleQuery);
        
        const sampleRes = await conn.query(sampleQuery);
        console.log('Sample result for column', col.name, ':', sampleRes);
        
        const sampleArray = sampleRes.toArray();
        console.log('Sample array for column', col.name, ':', sampleArray);
        
        const samples = sampleArray.map((r: any) => {
          // Handle Proxy(StructRow) objects in sample results
          let sampleValue;
          if (Array.isArray(r)) {
            sampleValue = r[0];
          } else if (typeof r === 'object' && r !== null) {
            sampleValue = r[col.name] || r[0];
          } else {
            sampleValue = r;
          }
          
          // Handle BigInt values
          if (typeof sampleValue === 'bigint') {
            sampleValue = Number(sampleValue);
          }
          
          return sampleValue;
        });
        
        const sampleText = samples.map((v: any) => JSON.stringify(v)).join(', ');
        schemaLines.push(`- ${col.name} (${col.type}) e.g. ${sampleText}`);
        
        console.log(`Column ${col.name} samples:`, samples);
      } catch (error) {
        console.warn(`Error sampling column ${col.name}:`, error);
        // Add column without samples if sampling fails
        schemaLines.push(`- ${col.name} (${col.type})`);
      }
    }

    // 3) Get row count (using the already extracted rowCount from above)
    console.log('Using row count from table check:', rowCount);

    // 4) Build the summary block
    const schema = `Schema:
Table: ${tableName}
Rows: ${rowCount}
Columns:
${schemaLines.join('\n')}`;

    console.log('Generated schema:', schema);
    console.log('=== END EXTRACTING DUCKDB SCHEMA ===');
    return schema;

  } catch (error) {
    console.error('Error in extractDuckDBSchemaSummary:', error);
    throw error;
  } finally {
    await conn.close();
  }
}
