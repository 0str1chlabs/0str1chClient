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
  if (!db) throw new Error('DuckDB is not initialized.');
  const conn = await db.connect();
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

// Optional: define once globally
let db: any = null;

export async function loadSheetToDuckDB(tableName: string, data: string[][]) {
  if (!db) {
    // Define your custom public paths
    const bundle = {
      mainModule: '/duckdb/duckdb-eh.wasm',
      mainWorker: '/duckdb/duckdb-browser-eh.worker.js',
    };

    // Set up a logger (optional but useful)
    const logger = new duckdb.ConsoleLogger();

    // Create a worker
    const worker = new Worker(bundle.mainWorker, { type: 'module' });

    // Create DuckDB instance
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule);
  }

  const conn = await db.connect();

  // Prepare SQL table
  const header = data[0];
  const columns = header.map(col => `"${col}" VARCHAR`).join(', ');
  await conn.query(`CREATE TABLE IF NOT EXISTS "${tableName}" (${columns});`);

  for (let i = 1; i < data.length; i++) {
    // Pad or truncate the row to match the header length
    const row = data[i].slice(0, header.length);
    while (row.length < header.length) row.push('');
    const values = row.map(val => `'${String(val ?? '').replace(/'/g, "''")}'`).join(', ');
    await conn.query(`INSERT INTO "${tableName}" VALUES (${values});`);
  }

  await conn.close();
}
