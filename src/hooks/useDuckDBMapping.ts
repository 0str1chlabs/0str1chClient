import { useState, useEffect, useCallback, useRef } from 'react';
import { loadSheetToDuckDB, extractDuckDBSchemaSummary, getAISchema } from '../lib/utils';

interface UseDuckDBMappingProps {
  activeSheet: any;
  csvUploaded: boolean;
  resetCsvUploadFlag?: () => void;
}

export const useDuckDBMapping = ({ activeSheet, csvUploaded, resetCsvUploadFlag }: UseDuckDBMappingProps) => {
  const [isDuckDBProcessing, setIsDuckDBProcessing] = useState(false);
  const [isSchemaReady, setIsSchemaReady] = useState(false);
  const [currentSchema, setCurrentSchema] = useState<string | null>(null);
  const processingRef = useRef(false);

  // Helper function to ensure sheet data is loaded into DuckDB
  const ensureSheetLoadedInDuckDB = useCallback(async () => {
    if (!activeSheet || !activeSheet.cells) {
      throw new Error('No active sheet data available');
    }

    console.log('=== ENSURING SHEET LOADED IN DUCKDB ===');
    console.log('Active sheet:', {
      name: activeSheet.name,
      id: activeSheet.id,
      rowCount: activeSheet.rowCount,
      colCount: activeSheet.colCount,
      cellsCount: Object.keys(activeSheet.cells).length
    });

    // Import the DuckDB utilities
    const { loadSheetToDuckDB, extractDuckDBSchemaSummary } = await import('../lib/utils');

    // Create sheet-specific table name (avoid double "sheet_" prefix)
    const cleanId = activeSheet.id.replace(/[^a-zA-Z0-9]/g, '_');
    const tableName = cleanId.startsWith('sheet_') ? cleanId : `sheet_${cleanId}`;
    console.log(`Using table name: ${tableName} for sheet: ${activeSheet.name} (original ID: ${activeSheet.id})`);

    // Check if this sheet's table already exists in DuckDB
    if (window.duckDB) {
      try {
        const conn = await window.duckDB.connect();
        try {
          const tablesResult = await conn.query('SHOW TABLES');
          const existingTables = tablesResult.toArray().map(row => row[0]);
          console.log('Existing tables:', existingTables);

          if (existingTables.includes(tableName)) {
            console.log(`✅ Table ${tableName} already exists for sheet ${activeSheet.name} - using existing table`);

            // Generate schema from existing table (efficient - no recreation needed)
            const schema = await extractDuckDBSchemaSummary(window.duckDB, tableName, 3);
            setCurrentSchema(schema);

            return { headerRow: [], schema };
          } else {
            console.log(`📝 Table ${tableName} doesn't exist for sheet ${activeSheet.name} - creating new table`);
          }
        } finally {
          await conn.close();
        }
      } catch (error) {
        console.error('Error checking existing tables:', error);
      }
    }

    // Convert sheet data to array format for DuckDB
    const { colCount, rowCount } = activeSheet;
    const sheetData: string[][] = [];

    // Create header row
    const headerRow: string[] = [];
    for (let col = 0; col < colCount; col++) {
      const colLetter = String.fromCharCode(65 + col);
      const headerCell = activeSheet.cells[`${colLetter}1`];
      headerRow.push(headerCell?.value || `Column ${colLetter}`);
    }
    sheetData.push(headerRow);

    // Create data rows
    for (let row = 2; row <= rowCount; row++) {
      const rowData: string[] = [];
      for (let col = 0; col < colCount; col++) {
        const colLetter = String.fromCharCode(65 + col);
        const cellId = `${colLetter}${row}`;
        const cell = activeSheet.cells[cellId];
        rowData.push(cell?.value || '');
      }
      sheetData.push(rowData);
    }

    console.log('Sheet data for DuckDB (first 3 rows):', sheetData.slice(0, 3));

    if (!sheetData.some(row => row.some(cell => cell !== ''))) {
      console.error('ERROR: No actual data found in sheet cells!');
      throw new Error('No data found in sheet cells');
    }

    // Load data into DuckDB with sheet-specific table name
    console.log(`🎯 Loading data for ACTIVE SHEET: ${activeSheet.name} (${activeSheet.id}) into table: ${tableName}`);
    await loadSheetToDuckDB(tableName, sheetData);
    console.log(`✅ Successfully loaded data for sheet: ${activeSheet.name} into DuckDB table: ${tableName}`);

    // Generate and log schema immediately after loading
    try {
      console.log(`🔍 Generating schema for ACTIVE SHEET: ${activeSheet.name} (${activeSheet.id})`);
      const schema = await extractDuckDBSchemaSummary(window.duckDB, tableName, 3);
      console.log(`=== DUCKDB SCHEMA GENERATED FOR: ${activeSheet.name} ===`);
      console.log(schema);
      console.log('=== END SCHEMA ===');

      // Store schema in component state for AI processing
      setCurrentSchema(schema);

      // Set final states
      setIsDuckDBProcessing(false);
      if (schema) {
        setIsSchemaReady(true);
        console.log(`🎉 Schema ready for ACTIVE SHEET: ${activeSheet.name} - AI can now process queries`);
      }

      return { headerRow, schema };
    } catch (error) {
      console.error('Error generating schema:', error);
      setIsDuckDBProcessing(false);
      setIsSchemaReady(false);
      return { headerRow, schema: null };
    }
  }, [activeSheet]);

  // Auto-load sheet into DuckDB when activeSheet changes or CSV is uploaded
  useEffect(() => {
    // Prevent multiple simultaneous processing
    if (processingRef.current) {
      console.log('DuckDB already processing, skipping...');
      return;
    }

    // Only regenerate schema if we have actual data and this is truly a new sheet or data change
    if (activeSheet && activeSheet.cells && Object.keys(activeSheet.cells).length > 0) {
      // Check if we have actual data (not just empty cells)
      const hasActualData = Object.values(activeSheet.cells).some(cell => {
        if (cell && typeof cell === 'object' && cell !== null && 'value' in cell) {
          return cell.value !== undefined && cell.value !== '';
        }
        return false;
      });

      if (hasActualData) {
        // Only process if this is a new sheet or if schema doesn't exist yet
        const shouldProcess = !currentSchema || csvUploaded;

        if (shouldProcess) {
          console.log(`🔄 Processing new sheet data for: ${activeSheet.name} (${activeSheet.id})`);

          // Set DuckDB processing state
          processingRef.current = true;
          setIsDuckDBProcessing(true);
          setIsSchemaReady(false);

          // Dispatch event to show loading overlay
          window.dispatchEvent(new CustomEvent('duckdbProcessing', {
            detail: { processing: true }
          }));

          // Process immediately without delay
          (async () => {
            try {
              // First, load data into DuckDB
              const { headerRow, schema } = await ensureSheetLoadedInDuckDB();

              // Only verify if we have a schema (meaning the table was created successfully)
              if (schema) {
                try {
                  // Use the same DuckDB instance and connection pattern as loadSheetToDuckDB
                  console.log('=== CHECKING WHAT TABLES EXIST ===');
                  if (!window.duckDB) {
                    throw new Error('DuckDB not initialized for verification');
                  }

                  const conn = await window.duckDB.connect();
                  try {
                    // First, let's see what tables actually exist
                    const tablesResult = await conn.query('SHOW TABLES');
                    console.log('Available tables:', tablesResult.toArray());

                    // Now try to verify the specific table using dynamic table name
                    const cleanId = activeSheet.id.replace(/[^a-zA-Z0-9]/g, '_');
                    const tableName = cleanId.startsWith('sheet_') ? cleanId : `sheet_${cleanId}`;
                    console.log(`=== VERIFYING "${tableName}" TABLE ===`);
                    const verifyResult = await conn.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
                    console.log('Table verification successful:', verifyResult.toArray());

                    // Also try to get a sample of data
                    const sampleResult = await conn.query(`SELECT * FROM "${tableName}" LIMIT 3`);
                    console.log('Sample data retrieved successfully:', sampleResult.toArray());
                  } finally {
                    await conn.close();
                  }
                } catch (verifyError) {
                  console.error('Error verifying table (but schema exists):', verifyError);
                  // Don't fail completely if verification fails but schema exists
                }

                setIsSchemaReady(true);

                // Dispatch event to update loading overlay
                window.dispatchEvent(new CustomEvent('schemaProcessing', {
                  detail: { processing: false, ready: true }
                }));

                if (csvUploaded) {
                  // Reset the CSV upload flag and processing state
                  resetCsvUploadFlag?.();
                }
              } else {
                console.warn('No schema generated, this might cause issues with AI processing');
              }
            } catch (error) {
              console.error('Error loading sheet into DuckDB:', error);
            } finally {
              processingRef.current = false;
              setIsDuckDBProcessing(false);

              // Dispatch event to hide loading overlay
              window.dispatchEvent(new CustomEvent('schemaProcessing', {
                detail: { processing: false, ready: false }
              }));
            }
          })();
        } else {
          // Sheet already has schema, just mark as ready
          console.log(`✅ Using existing schema for: ${activeSheet.name} (${activeSheet.id})`);
          setIsDuckDBProcessing(false);
          setIsSchemaReady(true);
        }
      } else {
        setIsDuckDBProcessing(false);
        setIsSchemaReady(false);
      }
    } else if (activeSheet && !currentSchema) {
      // Sheet exists but no schema - this might be a new empty sheet
      setIsDuckDBProcessing(false);
      setIsSchemaReady(false);
    } else if (!activeSheet) {
      // No active sheet
      setIsDuckDBProcessing(false);
      setIsSchemaReady(false);
    }
  }, [activeSheet?.id, activeSheet?.name, csvUploaded, resetCsvUploadFlag]);

  return {
    isDuckDBProcessing,
    isSchemaReady,
    currentSchema,
    ensureSheetLoadedInDuckDB
  };
};
