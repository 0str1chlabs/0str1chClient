import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, BarChart3, Lightbulb, Calculator, TrendingUp, ChevronRight, ChevronLeft, Upload, Sparkles, Move, X, Wand2, FileUp, Pin, PinOff, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoaderCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Resizable } from './Resizable';
import { useAuth } from '@/components/auth/AuthContext';
import { Chart } from '@/components/ui/chart';
import { createCellSelectionContext, formatSelectionContextForAI, CellSelectionContext } from '@/lib/cellSelectionUtils';
import axios from 'axios'; // Added axios import

interface Message {
  type: 'ai' | 'user';
  content: string;
  chartData?: {
    data: any[];
    chartSpec: any;
  };
}

interface AIAssistantProps {
  onGenerateChart: (type: 'bar' | 'line' | 'pie' | 'area') => void;
  onCalculate: (operation: string) => void;
  activeSheet: any;
  selectedCells: string[];
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onUploadCSV: () => void;
  onCreateCustom: () => void;
  updateCell: (cellId: string, value: string | number) => void;
  bulkUpdateCells?: (updates: { cellId: string, value: any }[]) => void;
  onEmbedChart?: (chartData: any, chartSpec: any) => void;
  csvUploaded?: boolean;
  resetCsvUploadFlag?: () => void;
  setIsProcessingCSV?: (processing: boolean) => void;
  // AI Update method for simple updates
  createAIUpdates?: (updates: any[]) => void;
  // Cell selection management
  onDeselectCells?: () => void;
}

// 🔒 Chatbot integration — do not modify. Has access to sheet data for AI actions and summaries.
export const AIAssistant = ({ 
  onGenerateChart, 
  onCalculate, 
  activeSheet, 
  selectedCells, 
  isMinimized, 
  onToggleMinimize,
  onUploadCSV,
  onCreateCustom,
  updateCell,
  bulkUpdateCells,
  onEmbedChart,
  csvUploaded,
  resetCsvUploadFlag,
  setIsProcessingCSV,
  createAIUpdates,
  onDeselectCells
}: AIAssistantProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'ai',
      content: "✨ Welcome to your AI-powered infinite canvas! Upload some data and I'll help you analyze it, create stunning visualizations, and perform complex calculations."
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDuckDBProcessing, setIsDuckDBProcessing] = useState(false);
  const [isSchemaReady, setIsSchemaReady] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [position, setPosition] = useState({ x: 200, y: 100 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [selectedModel, setSelectedModel] = useState('0str1ch 1.0');
  const [minimized, setMinimized] = useState(isMinimized);
  const [isFixed, setIsFixed] = useState(true); // New state for fixed/movable mode
  const { user } = useAuth();
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [pendingReasoning, setPendingReasoning] = useState<string[]>([]);
  const [pendingType, setPendingType] = useState<'function' | 'sql' | null>(null);
  const [pendingRaw, setPendingRaw] = useState<any>(null);
  const [pendingActionType, setPendingActionType] = useState<'update' | 'reply' | null>(null);
  const [pendingActionReason, setPendingActionReason] = useState<string | null>(null);
  const [pendingReplyResult, setPendingReplyResult] = useState<string | null>(null);
  const [currentSchema, setCurrentSchema] = useState<string | null>(null);
  const [selectionContext, setSelectionContext] = useState<CellSelectionContext | null>(null);
  const [lastProcessedSheetId, setLastProcessedSheetId] = useState<string | null>(null);

  // Update selection context when selectedCells changes
  useEffect(() => {
    if (selectedCells.length > 0 && activeSheet) {
      const context = createCellSelectionContext(selectedCells, activeSheet);
      setSelectionContext(context);
      
      // Disabled automatic selection message to reduce chat clutter
      // Show helpful message when cells are first selected (only if schema is ready)
      // if (isSchemaReady && !isDuckDBProcessing && context && messages.length > 0) {
      //   const lastMessage = messages[messages.length - 1];
      //   // Only add message if the last message isn't already about selection
      //   if (!lastMessage.content.includes('selected') && !lastMessage.content.includes('selection')) {
      //     setTimeout(() => {
      //       addMessage('ai', `🎯 I see you've selected ${context.selection_type === 'single' ? 'a cell' : context.selection_type === 'range' ? 'a range' : 'multiple cells'} (${context.selected_range}). I can help you analyze, update, or create charts from your selected data. Try asking: "What's the average?" or "Create a chart".`);
      //     }, 1000);
      //   }
      // }
    } else {
      setSelectionContext(null);
    }
  }, [selectedCells, activeSheet, isSchemaReady, isDuckDBProcessing]);

  // Track sheet changes for UI feedback only (no schema regeneration)
  useEffect(() => {
    if (activeSheet && activeSheet.id !== lastProcessedSheetId) {
      console.log(`📋 Sheet changed to: ${activeSheet.name} (${activeSheet.id})`);

      // Update tracking state
      setLastProcessedSheetId(activeSheet.id);

      // Only show message if we have a cached schema for this sheet
      if (lastProcessedSheetId && currentSchema) {
        console.log(`✅ Using cached schema for: ${activeSheet.name}`);
      }
    }
  }, [activeSheet?.id, activeSheet?.name, lastProcessedSheetId, currentSchema]);

  // Debug chart data changes
  useEffect(() => {
    const chartMessages = messages.filter(msg => msg.chartData);
    if (chartMessages.length > 0) {
      const lastChartMessage = chartMessages[chartMessages.length - 1];
      console.log('Chart message detected:', lastChartMessage);
      console.log('Chart data:', lastChartMessage.chartData?.data);
      console.log('Chart spec:', lastChartMessage.chartData?.chartSpec);
    }
  }, [messages]);

  const mainPrompts = [
    {
      icon: Upload,
      label: '📥 Upload CSV or Start New Sheet',
      description: 'Import your data or create a fresh spreadsheet',
      action: onUploadCSV,
      bg: 'bg-yellow-500 text-black'
    },
    {
      icon: Sparkles,
      label: '✨ Create Something Custom',
      description: 'Let me help you build exactly what you need',
      action: onCreateCustom,
      bg: 'bg-black text-yellow-400'
    }
  ];

  const quickActions = useMemo(() => {
    return [
      {
        icon: Calculator,
        label: 'Calculate',
        action: () => handleCalculationSuggestion('sum-selected'),
        color: 'bg-yellow-500 text-black',
        disabled: isDuckDBProcessing || !isSchemaReady
      },
      {
        icon: TrendingUp,
        label: 'Average',
        action: () => handleCalculationSuggestion('average-selected'),
        color: 'bg-black text-yellow-400',
        disabled: isDuckDBProcessing || !isSchemaReady
      },
      {
        icon: BarChart3,
        label: 'Chart',
        action: () => onGenerateChart('bar'),
        color: 'bg-yellow-400 text-black',
        disabled: isDuckDBProcessing || !isSchemaReady
      },
      {
        icon: Lightbulb,
        label: 'Analyze',
        action: () => handleSuggestion('analyze data'),
        color: 'bg-black text-yellow-400',
        disabled: isDuckDBProcessing || !isSchemaReady
      },
    ];
  }, [isDuckDBProcessing, isSchemaReady]);

  const handleCalculationSuggestion = async (operation: string) => {
    // Check if DuckDB is still processing or schema is not ready
    if (isDuckDBProcessing) {
      addMessage('ai', '⏳ Please wait while I process your data and generate the schema...');
      return;
    }

    if (!isSchemaReady) {
      addMessage('ai', '⚠️ Data processing is not complete yet. Please wait for the schema to be generated before performing calculations.');
      return;
    }

    if (selectedCells.length > 0 && activeSheet) {
      setIsLoading(true);
      addMessage('user', `${operation === 'sum-selected' ? 'Sum' : 'Average'} Selected`);
      addMessage('ai', `⏳ Calculating ${operation === 'sum-selected' ? 'sum' : 'average'} of selected cells...`);
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:8090/api/ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ 
            message: operation === 'sum-selected' ? 'Calculate the sum of the selected cells' : 'Calculate the average of the selected cells',
            userEmail: user?.email || ''
          }),
        });
        const data = await response.json();
        const fnString = data.function;
        let fn, result;
        try {
          // Remove code block markers if present
          let cleanFnString = fnString.trim();
          if (cleanFnString.startsWith('```')) {
            cleanFnString = cleanFnString.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
          }
          // Try to match a named function, but fallback to eval if it fails
          let match = cleanFnString.match(/^function\s+\w+\s*\(([^)]*)\)\s*{([\s\S]*)}\s*$/m);
          if (match) {
            const arg = match[1].trim();
            const body = match[2].trim();
            fn = new Function(arg, body);
          } else {
            // Fallback: try eval (may be an arrow function, anonymous, or just a function body)
            try {
              fn = eval('(' + cleanFnString + ')');
            } catch (e) {
              // As a last resort, wrap as a function body
              fn = new Function('cells', cleanFnString + '; return cells;');
            }
          }
          if (typeof fn !== 'function') throw new Error('AI did not return a function');
          // Build input array from all cells in the sheet
          const allCells = Object.keys(activeSheet.cells).map(cellId => ({
            cellId,
            value: activeSheet.cells[cellId]?.value
          }));
          result = fn(allCells);
        } catch (e) {
          addMessage('ai', `❌ Error executing AI function: ${e}`);
          setIsLoading(false);
          return;
        }
        // Show result
        if (Array.isArray(result)) {
          addMessage('ai', `Result: ${JSON.stringify(result)}`);
        } else {
          addMessage('ai', `Result: ${result}`);
        }
      } catch (err) {
        addMessage('ai', `❌ Error calculating ${operation === 'sum-selected' ? 'sum' : 'average'}`);
        console.error(err);
      }
      setIsLoading(false);
      return;
    }
    onCalculate(operation);
    addMessage('user', `Calculate ${operation}`);
  };

  const addMessage = (type: 'ai' | 'user', content: string, chartData?: { data: any[]; chartSpec: any }) => {
    setMessages(prev => [...prev, { type, content, chartData }]);
  };

  const createSheetSummary = async () => {
    if (!activeSheet) {
      console.error('No active sheet available');
      return 'No active sheet';
    }



    // Check if cells data is available
    if (!activeSheet.cells || Object.keys(activeSheet.cells).length === 0) {
      console.error('Active sheet has no cells data');
      return 'Sheet data not yet loaded';
    }

    // Check if we have meaningful data
    const cellKeys = Object.keys(activeSheet.cells);
    const nonEmptyCells = cellKeys.filter(key => {
      const cell = activeSheet.cells[key] as any;
      return cell && cell.value !== undefined && cell.value !== null && cell.value !== '';
    });



    if (nonEmptyCells.length === 0) {
      console.error('No meaningful data found in active sheet');
      return 'No data found in sheet';
    }

    

    try {
      // Ensure sheet is loaded in DuckDB and get schema
      const { schema } = await ensureSheetLoadedInDuckDB();
      
      if (schema) {

        return schema;
      }
      
      // Fallback to manual schema generation if DuckDB schema fails
      return createSheetSummaryFallback();
      
    } catch (error) {
      console.error('Error in createSheetSummary:', error);
      return createSheetSummaryFallback();
    }
  };

  const createSheetSummaryFallback = () => {
    if (!activeSheet) return 'No active sheet';

    const { colCount, rowCount } = activeSheet;
    const columnAnalysis: { [key: string]: any } = {};
    
    // Analyze each column
    for (let col = 0; col < colCount; col++) {
      const colLetter = String.fromCharCode(65 + col);
      const columnData: any[] = [];
      
      // Collect data for this column
      for (let row = 2; row <= Math.min(rowCount, 10); row++) {
        const cellId = `${colLetter}${row}`;
        const cell = activeSheet.cells[cellId];
        if (cell && cell.value !== undefined) {
          columnData.push(cell.value);
        }
      }
      
      // Determine column type and sample values
      const hasNumbers = columnData.some(val => typeof val === 'number' || !isNaN(Number(val)));
      const hasStrings = columnData.some(val => typeof val === 'string' && isNaN(Number(val)));
      const dataType = hasNumbers && !hasStrings ? 'DOUBLE' : 'VARCHAR';
      
      columnAnalysis[colLetter] = {
        dataType,
        sampleValues: columnData.slice(0, 3),
        count: columnData.length
      };
    }



    // Generate sample rows for schema
    const sampleRows = [];
    for (let row = 2; row <= Math.min(5, rowCount); row++) {
      const rowData = [];
      for (let col = 0; col < colCount; col++) {
        const colLetter = String.fromCharCode(65 + col);
        const cellId = `${colLetter}${row}`;
        const cell = activeSheet.cells[cellId];
        rowData.push(cell && cell.value !== undefined ? cell.value : '');
      }
      sampleRows.push(`Row ${row}: [${rowData.join(', ')}]`);
    }

    // Create SQL-like schema format
    const schema = `Schema:
Table: data
Rows: ${rowCount - 1}
Columns:
${Object.entries(columnAnalysis).map(([colLetter, analysis]) => {
  const sampleText = analysis.sampleValues.map((v: any) => JSON.stringify(v)).join(', ');
  return `- ${colLetter} (${analysis.dataType}) e.g. ${sampleText}`;
}).join('\n')}

Column Mapping (Excel Letter → Actual Column Name):
${Object.entries(columnAnalysis).map(([colLetter, analysis]) => {
  return `-- ${colLetter} → "${colLetter}"`;
}).join('\n')}

IMPORTANT: Use exact column names in SQL queries, NOT Excel letters or numeric values.

Sample Data:
${sampleRows.join('\n')}`;

    return schema;
  };

  // Function to update schema when table is modified
  const updateSchemaAfterModification = async () => {
    try {
      setIsDuckDBProcessing(true);
      const { extractDuckDBSchemaSummary } = await import('../lib/utils');
      const tableName = getCurrentTableName();
      const schema = await extractDuckDBSchemaSummary(window.duckDB, tableName, 3);

      setCurrentSchema(schema);
      setIsDuckDBProcessing(false);
      setIsSchemaReady(true);
      return schema;
    } catch (error) {
      console.error('Error updating schema after modification:', error);
      setIsDuckDBProcessing(false);
      setIsSchemaReady(false);
      return null;
    }
  };

  // Helper function to get current sheet's table name
  const getCurrentTableName = () => {
    if (!activeSheet) return 'sheet_data';
    return `sheet_${activeSheet.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
  };

  // Refresh spreadsheet data from DuckDB after SQL updates
  const refreshSpreadsheetFromDuckDB = async () => {
    try {
  
      
      // Query all data from DuckDB
      const { queryDuckDB } = await import('../lib/utils');
      const tableName = getCurrentTableName();
      const result = await queryDuckDB(`SELECT * FROM "${tableName}"`);
      
      if (result && result.length > 0) {
        // Convert DuckDB result to spreadsheet format
        const updatedCells: Record<string, { value: string | number }> = {};
        
        // Get headers from the first row
        const headers = Object.keys(result[0]);
        
        // First, preserve the header row (row 1)
        headers.forEach((header: string, colIndex: number) => {
          const colLetter = String.fromCharCode(65 + colIndex);
          const cellId = `${colLetter}1`;
          updatedCells[cellId] = { value: header };
        });
        
        // Then process data rows (starting from row 2)
        result.forEach((row: any, rowIndex: number) => {
          headers.forEach((header: string, colIndex: number) => {
            const colLetter = String.fromCharCode(65 + colIndex);
            const cellId = `${colLetter}${rowIndex + 2}`; // Start from row 2 to preserve headers
            updatedCells[cellId] = { value: row[header] || '' };
          });
        });
        
        // Update the spreadsheet with new data
        if (activeSheet) {
          // Use bulkUpdateCells to update all cells at once
          const updates = Object.entries(updatedCells).map(([cellId, cell]) => ({
            cellId,
            value: cell.value
          }));
          
          // Update the spreadsheet state
          if (bulkUpdateCells) {
            bulkUpdateCells(updates);
            addMessage('ai', `🔄 Spreadsheet refreshed with updated data from database.`);
          } else {
            // Fallback: update cells one by one
            Object.entries(updatedCells).forEach(([cellId, cell]) => {
              updateCell(cellId, cell.value);
            });
            addMessage('ai', `🔄 Spreadsheet refreshed with updated data from database.`);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing spreadsheet from DuckDB:', error);
      addMessage('ai', `⚠️ Could not refresh spreadsheet data: ${error}`);
    }
  };

  // Function to verify sheet data structure
  const verifySheetData = () => {
    if (!activeSheet) {
  
      return;
    }



    // Check if we have data in the expected format
    let hasData = false;
    for (let row = 2; row <= Math.min(5, activeSheet.rowCount); row++) {
      for (let col = 0; col < activeSheet.colCount; col++) {
        const colLetter = String.fromCharCode(65 + col);
        const cellId = `${colLetter}${row}`;
        const cell = activeSheet.cells[cellId];
        if (cell && cell.value !== undefined && cell.value !== '') {
          hasData = true;
  
        }
      }
    }

    if (!hasData) {
      console.warn('WARNING: No data found in sheet cells!');
    }


  };

  // Show message when CSV is uploaded
  useEffect(() => {
    if (csvUploaded) {
      // Don't show automatic messages, just set processing state
      setIsProcessingCSV?.(true);
    }
  }, [csvUploaded, setIsProcessingCSV]);

  // Auto-load sheet into DuckDB and generate schema when activeSheet changes or CSV is uploaded
  useEffect(() => {
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

          verifySheetData();

          // Set DuckDB processing state
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
                    const tableName = getCurrentTableName();
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
                } else {
                  addMessage('ai', `✅ Data processed and schema generated for ${activeSheet.name}! I'm ready to help you analyze your data.`);
                }
              } else {
                console.warn('No schema generated, this might cause issues with AI processing');
                addMessage('ai', '⚠️ Data loaded but schema generation failed. Some AI features may be limited.');
              }
            } catch (error) {
              console.error('Error loading sheet into DuckDB:', error);
              addMessage('ai', '❌ Error processing data. Please try uploading your data again.');
            } finally {
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
  }, [activeSheet?.id, activeSheet?.name, csvUploaded, resetCsvUploadFlag]); // Added activeSheet?.name to trigger on sheet name changes too

  const handleSendMessage = async () => {
    if (!message.trim() || !activeSheet) return;

    // Check if DuckDB is still processing data (not just asking questions)
    if (isDuckDBProcessing) {
      addMessage('ai', '⏳ Please wait while I process your data...');
      return;
    }

    // Check if we have a cached schema available
    if (!currentSchema || !isSchemaReady) {
      addMessage('ai', '⚠️ Please wait for data processing to complete before asking questions.');
      return;
    }

    const userMessage = message.trim();
    setMessage(''); // Clear input immediately
    addMessage('user', userMessage);

    setIsLoading(true);

    try {
      // Use cached schema for the current active sheet - no regeneration needed for queries
      console.log(`🤖 Using cached schema for active sheet: ${activeSheet.name} (${activeSheet.id})`);
      const schema = currentSchema;
      const token = localStorage.getItem('auth_token');

      // First, get AI1 reasoning and simplified question
      const ai1Response = await axios.post('/api/ai/ai1', {
          message: userMessage,
        schema,
        userEmail: user?.email || '',
        selectionContext: selectionContext ? formatSelectionContextForAI(selectionContext) : null,
        sheetInfo: {
          sheetName: activeSheet.name,
          sheetId: activeSheet.id,
          tableName: getCurrentTableName(),
          totalRows: activeSheet.rowCount - 1,
          totalColumns: activeSheet.colCount,
          columnAnalysis: [], // Will be derived from schema
          hasSelection: selectionContext !== null,
          selectionDetails: selectionContext
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (ai1Response.data.error) {
        addMessage('ai', `❌ Error: ${ai1Response.data.error}`);
        return;
      }

      const ai1Data = ai1Response.data;
      
      // Display the response to user from AI1
      if (ai1Data.response_to_user) {
        addMessage('ai', ai1Data.response_to_user);
      }
      
      // If the query is not sheet-related, stop here
      if (!ai1Data.is_sheet_related) {
        setIsLoading(false);
        return;
      }
      
      // If sheet-related, show explanation and proceed to AI2
      if (ai1Data.explanation) {
        addMessage('ai', ai1Data.explanation);
      }

      // Then, get AI2 code generation (only for sheet-related queries)
      const ai2Response = await axios.post('/api/ai/ai2', {
        message: userMessage,
        schema,
        userEmail: user?.email || '',
        simplified_user_question: ai1Data.simplified_user_question,
        explanation: ai1Data.explanation,
        isUpdate: ai1Data.isUpdate,
        isChart: ai1Data.isChart || false,
        selectionContext: selectionContext ? formatSelectionContextForAI(selectionContext) : null,
        sheetInfo: {
          sheetName: activeSheet.name,
          sheetId: activeSheet.id,
          tableName: getCurrentTableName(),
          totalRows: activeSheet.rowCount - 1,
          totalColumns: activeSheet.colCount,
          columnAnalysis: [], // Will be derived from schema
          hasSelection: selectionContext !== null,
          selectionDetails: selectionContext
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (ai2Response.data.error) {
        addMessage('ai', `❌ Error: ${ai2Response.data.error}`);
        return;
      }

      const ai2Data = ai2Response.data;
      console.log('AI2 response received:', ai2Data);

      if (ai2Data.stage === 'complete') {
        const masterResponse = ai2Data.master_response;
        console.log('Master response:', masterResponse);
        
        // Extract column analysis from current schema
        console.log('Current schema for column analysis:', currentSchema);
        let columnAnalysis = extractColumnAnalysisFromSchema(currentSchema || '');
        
        // If schema extraction failed, try fallback method
        if (columnAnalysis.length === 0) {
          console.log('Schema extraction failed, trying fallback method...');
          columnAnalysis = extractColumnAnalysisFromSheet();
        }
        
        console.log('Final column analysis for AI2:', columnAnalysis);
        console.log('Master response for button logic:', masterResponse);
        console.log('requires_update value:', masterResponse.requires_update);
        
        // Check if this is a chart response
        if (masterResponse.is_chart && masterResponse.chart_spec) {
          // Execute the SQL query to get data for the chart
          try {
            // Suppress raw query output in chat for chart requests
            const chartData = await executeSQLQuery(
              masterResponse.ai2_generated_code,
              false,
              { suppressOutput: true }
            );
            if (chartData && chartData.length > 0) {
              console.log('Chart data received from SQL:', chartData);
              console.log('Chart spec:', masterResponse.chart_spec);
              
              // Ensure data is in the correct format for charts
              const processedData = chartData.map((row: any) => {
                // Convert row to plain object if it's not already
                if (row && typeof row === 'object') {
                  return { ...row };
                }
                return row;
              });
              
              console.log('Processed chart data:', processedData);
              console.log('First row structure:', processedData[0]);
              console.log('Available keys in first row:', Object.keys(processedData[0] || {}));
              console.log('Chart spec fields:', {
                x: masterResponse.chart_spec?.x?.field,
                y: masterResponse.chart_spec?.y?.field
              });
              
              // Add chart message with data
              addMessage('ai', `📊 Here's your ${masterResponse.chart_spec.type} chart:`, {
                data: processedData,
                chartSpec: masterResponse.chart_spec
              });
            } else {
              console.log('No chart data received from SQL query');
              addMessage('ai', '❌ No data found for the chart.');
            }
          } catch (error) {
            addMessage('ai', `❌ Error generating chart: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else if (masterResponse.requires_update) {
          // For update operations, show confirmation buttons instead of executing immediately
          setPendingAction(masterResponse.ai2_generated_code);
          setPendingActionType('update');
          setPendingReasoning([
            `This will update ${masterResponse.operation_type === 'update' ? 'data in the sheet' : 'query results'}`
          ]);
          setPendingRaw(masterResponse);
        } else {
          // Execute the code immediately for non-update operations
          await executeAI2Code(masterResponse.ai2_generated_code, masterResponse.tool, masterResponse.requires_update, columnAnalysis);
        }
      } else if (ai2Data.stage === 'ai2_failed') {
        addMessage('ai', `❌ AI2 processing failed: ${ai2Data.ai2_error?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      addMessage('ai', `❌ Error: ${error instanceof Error ? error.message : 'Something went wrong'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for Apply button
  const handleApply = async () => {
    if (!pendingAction) return;
    if (pendingType === 'function') {
      // Run the function as before
      let updates;
      try {
        let cleanFnString = typeof pendingAction === 'string' ? pendingAction.trim() : '';
        if (cleanFnString.startsWith('```')) {
          cleanFnString = cleanFnString.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
        }
        let match = cleanFnString.match(/^function\s+\w+\s*\(([^)]*)\)\s*{([\s\S]*)}\s*$/m);
        let fn;
        if (match) {
          const arg = match[1].trim();
          const body = match[2].trim();
          fn = new Function(arg, body);
        } else {
          try {
            fn = eval('(' + cleanFnString + ')');
          } catch (e) {
            fn = new Function('cells', cleanFnString + '; return cells;');
          }
        }
        if (typeof fn !== 'function') throw new Error('AI did not return a function');
        const allCells = Object.keys(activeSheet.cells).map(cellId => ({
          cellId,
          value: activeSheet.cells[cellId]?.value
        }));
        updates = fn(allCells);
      } catch (e) {
        addMessage('ai', `❌ Error executing AI function: ${e}`);
        setPendingAction(null);
        setPendingType(null);
        setPendingReasoning([]);
        setPendingRaw(null);
        return;
      }
      if (updates && Array.isArray(updates)) {
        // Create AI updates instead of applying them directly
        const aiUpdates = updates.map((update: { cellId: string, value: string | number }) => {
          const currentCell = activeSheet.cells[update.cellId];
          const originalValue = currentCell?.value || '';
          
          return {
            cellId: update.cellId,
            originalValue,
            aiValue: update.value,
            timestamp: Date.now(),
            reasoning: 'AI-generated update'
          };
        });

        if (createAIUpdates) {
          createAIUpdates(aiUpdates);
          addMessage('ai', `Updated ${aiUpdates.length} cell${aiUpdates.length !== 1 ? 's' : ''}. Hover over colored cells to see the changes.`);
        } else {
          // Fallback to direct updates if AI update system is not available
          let applied = 0;
          updates.forEach((update: { cellId: string, value: string | number }) => {
            if (update.cellId && update.value !== undefined) {
              updateCell(update.cellId, update.value);
              applied++;
            }
          });
          addMessage('ai', `Applied ${applied} cell update${applied !== 1 ? 's' : ''} to the spreadsheet.`);
        }
      } else {
        addMessage('ai', `AI function did not return an updates array.`);
      }
    } else if (pendingType === 'sql' || pendingActionType === 'update') {
      // Execute the SQL query and create AI updates
      try {
        const sqlQuery = pendingAction as string;

        // ⚠️ SAFETY CHECK: Warn about potentially dangerous UPDATE queries
        if (sqlQuery.toUpperCase().includes('UPDATE')) {
          // Check for UPDATE without WHERE (affects all rows)
          if (!sqlQuery.toUpperCase().includes('WHERE')) {
            const confirmAllRows = confirm(
              '⚠️ WARNING: This UPDATE query will modify ALL rows in the table!\n\n' +
              `Query: ${sqlQuery}\n\n` +
              'Are you sure you want to continue?'
            );
            if (!confirmAllRows) {
              addMessage('ai', '❌ Operation cancelled by user to prevent mass update.');
              setPendingAction(null);
              setPendingActionType(null);
              setPendingType(null);
              return;
            }
          }

          // Check for BETWEEN operations that might affect many rows
          if (sqlQuery.toUpperCase().includes('BETWEEN') && sqlQuery.toUpperCase().includes('DATA_VALUE')) {
            const confirmRange = confirm(
              '⚠️ CAUTION: This UPDATE query uses a range operation (BETWEEN) on the DATA_VALUE column.\n\n' +
              `Query: ${sqlQuery}\n\n` +
              'This might update more rows than expected. Are you sure this is what you want?'
            );
            if (!confirmRange) {
              addMessage('ai', '❌ Operation cancelled by user.');
              setPendingAction(null);
              setPendingActionType(null);
              setPendingType(null);
              return;
            }
          }

          // Check for broad numeric ranges
          const betweenMatch = sqlQuery.match(/BETWEEN\s+['"]?(\d+)['"]?\s+AND\s+['"]?(\d+)['"]?/i);
          if (betweenMatch) {
            const startVal = parseInt(betweenMatch[1]);
            const endVal = parseInt(betweenMatch[2]);
            const rangeSize = Math.abs(endVal - startVal);

            if (rangeSize > 100) {
              const confirmBroadRange = confirm(
                `⚠️ WARNING: This UPDATE query affects a broad range of ${rangeSize} values.\n\n` +
                `Query: ${sqlQuery}\n\n` +
                'This will update many rows. Are you sure?'
              );
              if (!confirmBroadRange) {
                addMessage('ai', '❌ Operation cancelled by user.');
                setPendingAction(null);
                setPendingActionType(null);
                setPendingType(null);
                return;
              }
            }
          }
        }

        const { queryDuckDB } = await import('../lib/utils');
        const result = await queryDuckDB(sqlQuery);
        
        if (result && result.length > 0) {
          addMessage('ai', `✅ SQL executed successfully! Modified ${result.length} rows.`);
          
          // Create AI updates for the cells that were modified by SQL
          if (createAIUpdates && activeSheet) {
            // For SQL updates, we need to identify which cells actually changed
            // We'll refresh the data first, then compare to find the changed cells
            try {
              // Refresh spreadsheet data from DuckDB to get the updated values
              const { queryDuckDB } = await import('../lib/utils');
              const tableName = getCurrentTableName();
              const updatedData = await queryDuckDB(`SELECT * FROM "${tableName}"`);
              
              if (updatedData && updatedData.length > 0) {
                // Convert DuckDB result to spreadsheet format to compare
                const updatedCells: Record<string, { value: string | number }> = {};
                
                // Get headers from the first row
                const headers = Object.keys(updatedData[0]);
                
                // First, preserve the header row (row 1)
                headers.forEach((header: string, colIndex: number) => {
                  const colLetter = String.fromCharCode(65 + colIndex);
                  const cellId = `${colLetter}1`;
                  updatedCells[cellId] = { value: header };
                });
                
                // Then process data rows (starting from row 2)
                updatedData.forEach((row: any, rowIndex: number) => {
                  headers.forEach((header: string, colIndex: number) => {
                    const colLetter = String.fromCharCode(65 + colIndex);
                    const cellId = `${colLetter}${rowIndex + 2}`; // Start from row 2 to preserve headers
                    updatedCells[cellId] = { value: row[header] || '' };
                  });
                });
                
                // Now compare current cells with updated cells to find changes
                const currentCells = activeSheet.cells;
                const changedCells: any[] = [];
                
                console.log('🔍 Comparing SQL changes...');
                console.log('Current cells count:', Object.keys(currentCells).length);
                console.log('Updated cells count:', Object.keys(updatedCells).length);
                
                Object.keys(updatedCells).forEach(cellId => {
                  const currentCell = currentCells[cellId];
                  const updatedCell = updatedCells[cellId];
                  
                  if (currentCell && updatedCell) {
                    const currentValue = currentCell.value;
                    const updatedValue = updatedCell.value;
                    
                    // Check if the value actually changed
                    if (currentValue !== updatedValue) {
                      console.log('🔄 Found changed cell:', cellId, 'from:', currentValue, 'to:', updatedValue);
                      changedCells.push({
                        cellId,
                        originalValue: currentValue,
                        aiValue: updatedValue,
                        timestamp: Date.now(),
                        reasoning: `SQL update - ${result.length} rows modified`
                      });
                    }
                  }
                });
                
                console.log('📊 Total changed cells found:', changedCells.length);
                
                if (changedCells.length > 0) {
                  createAIUpdates(changedCells);
                  addMessage('ai', `Created ${changedCells.length} AI updates for cells that actually changed. Hover over colored cells to see the changes.`);
                } else {
                  addMessage('ai', `SQL executed successfully, but no visible changes were detected in the spreadsheet.`);
                }
              }
            } catch (error) {
              console.error('Error comparing SQL changes:', error);
              addMessage('ai', `SQL executed successfully, but couldn't identify specific cell changes.`);
            }
          }
          
          // Update schema after modification
          await updateSchemaAfterModification();
        } else {
          addMessage('ai', `✅ SQL executed successfully, but no rows were modified.`);
        }
      } catch (error) {
        addMessage('ai', `❌ Error executing SQL: ${error}`);
        console.error('SQL execution error:', error);
      }
    }
    setPendingAction(null);
    setPendingType(null);
    setPendingActionType(null);
    setPendingReasoning([]);
    setPendingRaw(null);
  };

  // Handler for Reject button
  const handleReject = () => {
    addMessage('ai', `Seems like 0str1ch messed up. I am ashamed! Let's give it another go.`);
    setPendingAction(null);
    setPendingType(null);
    setPendingActionType(null);
    setPendingReasoning([]);
    setPendingRaw(null);
  };

  const handleSuggestion = (suggestion: string) => {
    // Check if DuckDB is still processing or schema is not ready
    if (isDuckDBProcessing) {
      addMessage('ai', '⏳ Please wait while I process your data and generate the schema...');
      return;
    }

    if (!isSchemaReady) {
      addMessage('ai', '⚠️ Data processing is not complete yet. Please wait for the schema to be generated before asking questions.');
      return;
    }

    addMessage('user', suggestion);
    
    // Add context-aware response
    if (selectionContext) {
      addMessage('ai', `🎯 I'll ${suggestion.toLowerCase()} for your selected ${selectionContext.selection_type === 'single' ? 'cell' : 'cells'} (${selectionContext.selected_range}).`);
    } else {
      addMessage('ai', `🚀 Great choice! I'll help you ${suggestion.toLowerCase()}.`);
    }
  };

  // Auto-expand textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [message]);

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent) => {
    if (isFixed) return; // Don't allow dragging when fixed
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.userSelect = 'none';
  };
  const handleDrag = (e: MouseEvent) => {
    if (!dragging || isFixed) return;
    
    // Calculate new position with free movement
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    
    // Keep within viewport bounds but allow more freedom
    const maxX = window.innerWidth - 400; // Allow some overflow
    const maxY = window.innerHeight - 600; // Allow some overflow
    
    setPosition({
      x: Math.max(-50, Math.min(newX, maxX)), // Allow slight overflow
      y: Math.max(64, Math.min(newY, maxY)), // Keep below header (64px)
    });
  };
  const handleDragEnd = () => {
    setDragging(false);
    document.body.style.userSelect = '';
  };
  useEffect(() => {
    if (dragging && !isFixed) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
    } else {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [dragging, isFixed]);

  useEffect(() => { setMinimized(isMinimized); }, [isMinimized]);

  // Toggle fixed/movable mode
  const toggleFixedMode = () => {
    setIsFixed(!isFixed);
  };

  // Helper function to convert underscore column names back to original names
  const fixUnderscoreColumnNames = (sql: string): string => {
    console.log('Original SQL with underscores:', sql);
    
    // Map of underscore names to original names
    const columnMapping = {
      'Business_Unit': 'Business Unit',
      'Full_Name': 'Full Name',
      'Job_Title': 'Job Title',
      'Hire_Date': 'Hire Date',
      'Annual_Salary': 'Annual Salary',
      'Bonus_': 'Bonus _',
      'Exit_Date': 'Exit Date'
    };
    
    let fixedSql = sql;
    
    Object.entries(columnMapping).forEach(([underscoreName, originalName]) => {
      const regex = new RegExp(`"${underscoreName}"`, 'g');
      fixedSql = fixedSql.replace(regex, `"${originalName}"`);
    });
    
    console.log('Fixed SQL with original names:', fixedSql);
    return fixedSql;
  };

  // Helper function to fix SQL queries with unquoted column names
  const fixSQLColumnQuoting = (sql: string): string => {
    console.log('Original SQL:', sql);
    
    // Check if the SQL already has properly quoted column names
    const hasQuotedColumns = /"[^"]*"/.test(sql);
    if (hasQuotedColumns) {
      console.log('SQL already has quoted columns, skipping quote fixing');
      return sql;
    }
    
    // Only quote specific column names that have spaces or special characters
    const specificColumns = ['Full Name', 'Job Title', 'Business Unit', 'Hire Date', 'Annual Salary', 'Bonus _', 'Exit Date'];
    let fixedSql = sql;
    
    specificColumns.forEach(col => {
      const unquotedPattern = new RegExp(`\\b${col.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      fixedSql = fixedSql.replace(unquotedPattern, `"${col}"`);
    });
    
    console.log('Fixed SQL:', fixedSql);
    return fixedSql;
  };

    // Helper function to ensure sheet data is loaded into DuckDB
  const ensureSheetLoadedInDuckDB = async () => {
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

    // Create sheet-specific table name
    const tableName = `sheet_${activeSheet.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
    console.log(`Using table name: ${tableName} for sheet: ${activeSheet.name}`);

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
        console.log('Error checking existing tables:', error);
        // Continue with table creation if check fails
      }
    }
    
    // Convert sheet data to 2D array format for DuckDB
    const { colCount, rowCount } = activeSheet;
    const sheetData: string[][] = [];
    
    // Create header row
    const headerRow: string[] = [];
    for (let col = 0; col < colCount; col++) {
      const colLetter = String.fromCharCode(65 + col);
      const cellId = `${colLetter}1`;
      const cell = activeSheet.cells[cellId];
      const headerValue = cell && cell.value ? String(cell.value) : colLetter;
      headerRow.push(headerValue);
    }
    sheetData.push(headerRow);
    
    console.log('Header row for DuckDB:', headerRow);
    console.log('Header row length:', headerRow.length);
    
    // Create data rows
    let dataRowCount = 0;
    let actualDataFound = false;
    for (let row = 2; row <= rowCount; row++) {
      const dataRow: string[] = [];
      let rowHasData = false;
      
      for (let col = 0; col < colCount; col++) {
        const colLetter = String.fromCharCode(65 + col);
        const cellId = `${colLetter}${row}`;
        const cell = activeSheet.cells[cellId];
        const cellValue = cell && cell.value !== undefined ? String(cell.value) : '';
        dataRow.push(cellValue);
        
        if (cellValue && cellValue.trim() !== '') {
          rowHasData = true;
        }
      }
      
      if (rowHasData) {
        sheetData.push(dataRow);
        dataRowCount++;
        actualDataFound = true;
        
        if (dataRowCount <= 3) {
          console.log(`Data row ${row}:`, dataRow);
        }
      }
    }

    console.log(`Converted ${dataRowCount} data rows for DuckDB`);
    console.log('Total sheet data array length:', sheetData.length);
    console.log('Actual data found:', actualDataFound);
    console.log('Sheet data for DuckDB (first 3 rows):', sheetData.slice(0, 3));

    if (!actualDataFound) {
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
  };

  // Execute SQL query
  const executeSQLQuery = async (
    sql: string,
    requiresUpdate: boolean = false,
    options?: { suppressOutput?: boolean }
  ): Promise<any[] | null> => {
    try {
      console.log('Executing SQL query:', sql);
      console.log('Requires update:', requiresUpdate);
      console.log(`🎯 Executing query for ACTIVE SHEET: ${activeSheet?.name} (${activeSheet?.id})`);

      const { queryDuckDB } = await import('../lib/utils');
      const result = await queryDuckDB(sql);

      if (requiresUpdate) {
        // Update the sheet data with the modified data
        if (result && result.length > 0) {
          // Update the active sheet with the new data
          // This would need to be implemented based on your sheet update logic
          console.log('Sheet updated with new data:', result);
          
          // Update schema after modification
          await updateSchemaAfterModification();
          
          if (!options?.suppressOutput) {
            addMessage('ai', `✅ Sheet updated successfully! Modified ${result.length} rows.`);
          }
        } else {
          if (!options?.suppressOutput) {
            addMessage('ai', `✅ Query executed successfully, but no rows were modified.`);
          }
        }
      } else {
        // Display the query results
        if (!options?.suppressOutput) {
          if (result && result.length > 0) {
            const resultText = result.map((row: any) => 
              Object.values(row).join(', ')
            ).join('\n');
            addMessage('ai', `📊 Query Results:\n${resultText}`);
          } else {
            addMessage('ai', `📊 Query executed successfully. No results returned.`);
          }
        }
      }
      return result;
    } catch (error) {
      console.error('Error executing SQL query:', error);
      if (!options?.suppressOutput) {
        addMessage('ai', `❌ Error executing SQL query: ${error}`);
      }
      return null;
    }
  };

  // Extract column analysis from current schema
  const extractColumnAnalysisFromSchema = (schema: string): any[] => {
    if (!schema) return [];
    
    const columnAnalysis: any[] = [];
    const lines = schema.split('\n');
    let inColumnsSection = false;
    
    for (const line of lines) {
      if (line.includes('Columns:')) {
        inColumnsSection = true;
        continue;
      }
      
      if (inColumnsSection && line.trim() === '') {
        break; // End of columns section
      }
      
      if (inColumnsSection && line.startsWith('- ')) {
        // Parse column line like: "- Column_Name (VARCHAR) e.g. "value1", "value2", "value3""
        // or just "- Column_Name (VARCHAR)" if no samples
        const match = line.match(/^- (.+?) \((.+?)\)(?: e\.g\. (.+))?$/);
        if (match) {
          const columnName = match[1].trim();
          const dataType = match[2].trim();
          const sampleValuesStr = match[3] || '';
          const sampleValues = sampleValuesStr ? sampleValuesStr.split(', ').map(v => v.replace(/"/g, '')) : [];
          
          columnAnalysis.push({
            name: columnName,
            type: dataType,
            column: columnName, // For backward compatibility
            sampleValues: sampleValues
          });
        }
      }
    }
    
    console.log('Extracted column analysis from schema:', columnAnalysis);
    return columnAnalysis;
  };

  // Fallback method to extract column analysis from active sheet data
  const extractColumnAnalysisFromSheet = (): any[] => {
    if (!activeSheet || !activeSheet.cells) return [];
    
    const columnAnalysis: any[] = [];
    const { colCount, rowCount } = activeSheet;
    
    // Analyze each column
    for (let col = 0; col < colCount; col++) {
      const colLetter = String.fromCharCode(65 + col);
      const columnData: any[] = [];
      
      // Collect data for this column
      for (let row = 2; row <= Math.min(rowCount, 10); row++) {
        const cellId = `${colLetter}${row}`;
        const cell = activeSheet.cells[cellId];
        if (cell && cell.value !== undefined) {
          columnData.push(cell.value);
        }
      }
      
      // Determine column type and sample values
      const hasNumbers = columnData.some(val => typeof val === 'number' || !isNaN(Number(val)));
      const hasStrings = columnData.some(val => typeof val === 'string' && isNaN(Number(val)));
      const dataType = hasNumbers && !hasStrings ? 'DOUBLE' : 'VARCHAR';
      
      // Use column letter as name if no header found
      const headerCell = activeSheet.cells[`${colLetter}1`];
      const columnName = headerCell && headerCell.value ? String(headerCell.value) : colLetter;
      
      columnAnalysis.push({
        name: columnName,
        type: dataType,
        column: columnName,
        sampleValues: columnData.slice(0, 3)
      });
    }
    
    console.log('Extracted column analysis from sheet:', columnAnalysis);
    return columnAnalysis;
  };

  // Execute AI2 generated code immediately
  // Execute Danfo.js queries
  const executeDanfoQuery = async (danfoCode: string, columnAnalysis: any[]): Promise<any> => {
    try {
      console.log('Executing Danfo query:', danfoCode);
      
      // Import Danfo dynamically
      const { DataFrame, Series } = await import('danfojs');
      
      // Convert sheet data to DataFrame format
      const sheetData = await convertSheetToDataFrame(activeSheet);
      console.log('Sheet data converted to DataFrame:', sheetData);
      
      // Create a simple execution environment
      const executeDanfoCode = (code: string, df: any) => {
        // Create a function that has access to the DataFrame
        const executeFunction = new Function('df', code);
        const result = executeFunction(df);
        return result;
      };
      
      // Execute the Danfo code
      const result = executeDanfoCode(danfoCode, sheetData);
      
      console.log('Danfo query result:', result);
      
      // Format the result for display
      let resultText = '';
      if (result && typeof result === 'object') {
        if (result.shape) {
          // It's a DataFrame
          resultText = `DataFrame with ${result.shape[0]} rows and ${result.shape[1]} columns:\n`;
          resultText += result.head(10).toString(); // Show first 10 rows
        } else if (result.length !== undefined) {
          // It's a Series
          resultText = `Series with ${result.length} values:\n`;
          resultText += result.head(10).toString(); // Show first 10 values
        } else {
          resultText = `Result: ${JSON.stringify(result, null, 2)}`;
        }
      } else {
        resultText = `Result: ${result}`;
      }
      
      addMessage('ai', `✅ Danfo Query Result:\n${resultText}`);
      
      return result;
      
    } catch (error) {
      console.error('Danfo execution error:', error);
      addMessage('ai', `❌ Error executing Danfo query: ${error}`);
      throw error;
    }
  };

  // Helper function to convert sheet data to DataFrame format
  const convertSheetToDataFrame = async (sheet: any) => {
    if (!sheet || !sheet.cells) {
      throw new Error('No sheet data available');
    }
    
    const { colCount, rowCount } = sheet;
    const data: any[] = [];
    const headers: string[] = [];
    
    // Extract headers (first row)
    for (let col = 0; col < colCount; col++) {
      const colLetter = String.fromCharCode(65 + col);
      const cellId = `${colLetter}1`;
      const cell = sheet.cells[cellId];
      const headerValue = cell && cell.value ? String(cell.value) : colLetter;
      headers.push(headerValue);
    }
    
    // Extract data rows
    for (let row = 2; row <= rowCount; row++) {
      const rowData: any = {};
      let hasData = false;
      
      for (let col = 0; col < colCount; col++) {
        const colLetter = String.fromCharCode(65 + col);
        const cellId = `${colLetter}${row}`;
        const cell = sheet.cells[cellId];
        const value = cell && cell.value !== undefined ? cell.value : '';
        
        if (value !== '') {
          hasData = true;
        }
        
        rowData[headers[col]] = value;
      }
      
      if (hasData) {
        data.push(rowData);
      }
    }
    
    console.log('Converted sheet data:', { headers, dataLength: data.length, sampleData: data.slice(0, 3) });
    
    // Import and create DataFrame
    const { DataFrame } = await import('danfojs');
    return new DataFrame(data);
  };

  const executeAI2Code = async (generatedCode: string, tool: string, requiresUpdate: boolean, columnAnalysis: any[]) => {
    try {
      console.log('Executing AI2 code:', generatedCode);
      console.log('Tool:', tool);
      console.log('Requires update:', requiresUpdate);
      console.log('Column analysis:', columnAnalysis);
      console.log('Available column names:', columnAnalysis.map(col => col.name));
      console.log('Column mapping:', columnAnalysis.map((col, index) => {
        const excelLetter = String.fromCharCode(65 + index);
        return `${excelLetter} → "${col.name}"`;
      }));
      
      // Handle different tool types
      if (tool === 'danfo') {
        // Execute Danfo query
        await executeDanfoQuery(generatedCode, columnAnalysis);
        return;
      }
      
      // Handle SQL queries (existing logic)
      // Convert Excel-style column references to actual column names
      const convertExcelToColumnNames = (sql: string, columns: any[]): string => {
        let convertedSql = sql;
        
        console.log('Converting SQL:', sql);
        console.log('Available columns:', columns.map(col => `${col.name} -> "${col.name}"`));
        
        // Replace Excel letters (A, B, C, D, etc.) with actual column names
        columns.forEach((col, index) => {
          const excelLetter = String.fromCharCode(65 + index);
          // Use word boundaries to avoid replacing letters within words
          const regex = new RegExp(`\\b${excelLetter}\\b`, 'g');
          convertedSql = convertedSql.replace(regex, `"${col.name}"`);
        });
        
        // Also replace any numeric literals that might be column references
        // This handles cases where the AI generates SELECT MIN(3) instead of SELECT MIN("Column_3")
        columns.forEach((col) => {
          if (col.name.startsWith('Column_')) {
            const numericPart = col.name.replace('Column_', '');
            // Replace numeric literals that match column numbers
            const regex = new RegExp(`\\b${numericPart}\\b`, 'g');
            convertedSql = convertedSql.replace(regex, `"${col.name}"`);
          }
        });
        
        console.log('Original SQL:', sql);
        console.log('Converted SQL:', convertedSql);
        return convertedSql;
      };
      
      const convertedCode = convertExcelToColumnNames(generatedCode, columnAnalysis);
      
      if (convertedCode !== generatedCode) {
        addMessage('ai', `Note: Converted Excel column references to actual column names in SQL query.`);
      }
      
      // Fix SQL column quoting
      const fixedSql = fixSQLColumnQuoting(convertedCode);
      if (fixedSql !== convertedCode) {
        console.log('Original SQL:', convertedCode);
        console.log('Fixed SQL:', fixedSql);
        addMessage('ai', `Note: Fixed unquoted column names in SQL query.`);
      }
      
      // Fix underscore column names
      const finalSql = fixUnderscoreColumnNames(fixedSql);
      if (finalSql !== fixedSql) {
        console.log('SQL with underscores:', fixedSql);
        console.log('SQL with original names:', finalSql);
        addMessage('ai', `Note: Fixed underscore column names to original names.`);
      }
      
      console.log('Final SQL to execute:', finalSql);
      
      // Execute the converted SQL query
      await executeSQLQuery(finalSql, requiresUpdate);
    } catch (error) {
      addMessage('ai', `❌ Error executing AI2 code: ${error}`);
      console.error('AI2 execution error:', error);
    }
  };

  if (minimized) {
    return (
      <button
        onClick={() => { setMinimized(false); onToggleMinimize(); }}
        style={{
          position: 'fixed',
          right: 20,
          top: 100, // Position below header
          zIndex: 9999, // Very high z-index to stay on top
          borderRadius: '9999px 0 0 9999px',
          background: 'hsl(var(--background))',
          boxShadow: '0 4px 24px 0 rgba(0,0,0,0.12), 0 1.5px 4px 0 rgba(0, 0, 0, 0.10)',
          border: '1px solid hsl(var(--border))',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
        }}
        title="Open AI Assistant"
      >
        <Wand2 className="h-6 w-6 text-primary" />
      </button>
    );
  }

  // Fixed position styles
  const fixedStyles = isFixed ? {
    position: 'fixed' as const,
    right: 20,
    top: 100, // Position below header (header is 64px + some margin)
    maxHeight: 'calc(100vh - 120px)', // Ensure it doesn't exceed viewport height
    zIndex: 9999, // Very high z-index to stay on top
  } : {
    position: 'fixed' as const,
    left: position.x,
    top: position.y,
    zIndex: 9999, // Very high z-index to stay on top
  };

  return (
    <div id="ai-chatbox" data-ai-chatbox className="ai-assistant" style={fixedStyles}>
      <Resizable
        initialWidth={500}
        initialHeight={600}
        minWidth={350}
        minHeight={400}
        maxWidth={900}
        maxHeight={800}
      >
        <Card className="w-full h-full shadow-2xl flex flex-col overflow-hidden bg-background/80 backdrop-blur-md border border-border relative z-50" style={{ filter: 'drop-shadow(0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04))' }}>
          <div className="flex items-center justify-between p-3 border-b border-border drag-handle cursor-move bg-background/95 backdrop-blur-sm sticky top-0 z-10" onMouseDown={handleDragStart}>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Wand2 className="h-5 w-5 text-primary" />
              <div className="flex flex-col">
                <span>AI Assistant</span>
                {activeSheet && (
                  <span className="text-xs text-muted-foreground font-normal">
                    Ostrich is looking at {activeSheet.name}
                  </span>
                )}
                {!activeSheet && (
                  <span className="text-xs text-muted-foreground font-normal">
                    Ostrich is ready for your data
                  </span>
                )}
              </div>
              {isDuckDBProcessing && (
                <div className="flex items-center gap-1 ml-2">
                  <LoaderCircle className="h-3 w-3 animate-spin text-blue-600" />
                  <span className="text-xs text-blue-600">Processing {activeSheet?.name || 'sheet'}...</span>
                </div>
              )}
              {!isDuckDBProcessing && !isSchemaReady && activeSheet && currentSchema && (
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-xs text-orange-600">Loading {activeSheet.name}...</span>
                </div>
              )}
              {!isDuckDBProcessing && isSchemaReady && currentSchema && (
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-xs text-green-600">Ready for {activeSheet?.name || 'sheet'}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 relative z-20">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 no-drag hover:bg-accent" 
                onClick={toggleFixedMode}
                title={isFixed ? "Make Movable" : "Fix Position"}
              >
                {isFixed ? <PinOff className="h-4 w-4 text-foreground" /> : <Pin className="h-4 w-4 text-foreground" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 no-drag hover:bg-accent" onClick={() => { setMinimized(true); onToggleMinimize(); }} title="Close">
                <X className="h-4 w-4 text-foreground" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 p-4 custom-blue-scrollbar" style={{ maxHeight: 'calc(100% - 100px)' }}>
            <div className="space-y-6">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://placehold.co/40x40.png`} data-ai-hint={msg.type === 'user' ? 'person user' : 'robot'} />
                    <AvatarFallback>{msg.type === 'user' ? 'ME' : 'AI'}</AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-md rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      msg.type === 'user'
                        ? 'bg-[hsl(205.91,68.04%,61.96%)] text-white'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {msg.content}
                    {msg.chartData && (
                      <div className="mt-4">
                        {(() => { console.log('Rendering chart with data:', msg.chartData.data, 'chartSpec:', msg.chartData.chartSpec); return null; })()}
                        {msg.chartData.data && msg.chartData.data.length > 0 ? (
                          <div>
                            <div className="text-xs text-muted-foreground mb-2">
                              Chart Type: {msg.chartData.chartSpec?.type || 'unknown'} | 
                              X Field: {msg.chartData.chartSpec?.x?.field || 'name'} | 
                              Y Field: {msg.chartData.chartSpec?.y?.field || 'value'}
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              Data Structure: {JSON.stringify(msg.chartData.data[0])}
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              Data Length: {msg.chartData.data.length} | 
                              First Row Keys: {Object.keys(msg.chartData.data[0] || {}).join(', ')}
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              Chart Spec X Field: {msg.chartData.chartSpec?.x?.field || 'undefined'} | 
                              Chart Spec Y Field: {msg.chartData.chartSpec?.y?.field || 'undefined'}
                            </div>
                                                          <Chart
                                data={msg.chartData.data}
                                type={(() => {
                                  const chartType = msg.chartData.chartSpec?.type;
                                  if (chartType === "heatmap" || chartType === "scatter") {
                                    return "bar";
                                  }
                                  if (chartType === "bar" || chartType === "line" || chartType === "pie" || chartType === "area") {
                                    return chartType;
                                  }
                                  return "bar";
                                })()}
                                xKey={(() => {
                                  const xField = msg.chartData.chartSpec?.x?.field;
                                  if (xField && xField in msg.chartData.data[0]) {
                                    return xField;
                                  }
                                  // Fallback: use the first available key that's not the yKey
                                  const availableKeys = Object.keys(msg.chartData.data[0] || {});
                                  const yField = msg.chartData.chartSpec?.y?.field;
                                  const fallbackKey = availableKeys.find(key => key !== yField) || availableKeys[0] || 'name';
                                  console.log('X key fallback:', { original: xField, available: availableKeys, fallback: fallbackKey });
                                  return fallbackKey;
                                })()}
                                yKey={(() => {
                                  const yField = msg.chartData.chartSpec?.y?.field;
                                  if (yField && yField in msg.chartData.data[0]) {
                                    return yField;
                                  }
                                  // Fallback: use the second available key or first if only one exists
                                  const availableKeys = Object.keys(msg.chartData.data[0] || {});
                                  const fallbackKey = availableKeys.length > 1 ? availableKeys[1] : availableKeys[0] || 'value';
                                  console.log('Y key fallback:', { original: yField, available: availableKeys, fallback: fallbackKey });
                                  return fallbackKey;
                                })()}
                                height={300}
                                showGrid={true}
                                showLegend={true}
                                showTooltip={true}
                                className="border rounded-lg"
                              />
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground py-8">
                            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No data available for chart</p>
                            <p className="text-sm">Data: {JSON.stringify(msg.chartData.data)}</p>
                          </div>
                        )}
                        <div className="mt-2 flex justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (onEmbedChart && msg.chartData) {
                                onEmbedChart(msg.chartData.data, msg.chartData.chartSpec);
                              }
                            }}
                          >
                            Embed on Canvas
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {pendingAction && pendingActionType === 'update' && (
                <div className="flex flex-col items-center gap-3 mt-4">
                  <div className="flex gap-2">
                    <Button onClick={handleApply} variant="default">Apply</Button>
                    <Button onClick={handleReject} variant="destructive">Reject</Button>
                  </div>
                </div>
              )}


              

              {pendingReplyResult && pendingActionType === 'reply' && (
                <div className="flex flex-col items-center gap-3 mt-4">
                  <div className="text-green-600 dark:text-green-400 font-semibold">Result: {pendingReplyResult}</div>
                </div>
              )}
              {isLoading && (
                <div className="flex justify-start items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="robot" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl px-3 py-2">
                    <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              {isDuckDBProcessing && (
                <div className="flex justify-start items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="robot" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl px-3 py-2 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm text-blue-700">Processing data and generating schema...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t border-border space-y-4">
            {/* Selection Context Indicator */}
            {selectionContext && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                    <Target className="h-4 w-4" />
                    <span className="font-medium">
                      {selectionContext.selection_type === 'single' ? 'Cell Selected' : 
                       selectionContext.selection_type === 'range' ? 'Range Selected' : 
                       'Multiple Cells Selected'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {selectedCells.length} cell{selectedCells.length !== 1 ? 's' : ''}
                    </Badge>
                    {onDeselectCells && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onDeselectCells}
                        className="h-6 px-2 text-xs border-green-300 text-green-700 hover:bg-green-100 dark:border-green-600 dark:text-green-300 dark:hover:bg-green-800/30"
                      >
                        Deselect
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {selectionContext.selected_range} • {selectionContext.columns.join(', ')} • {selectionContext.row_count} rows
                </div>
                <div className="text-xs text-green-500 dark:text-green-300 mt-1 font-medium">
                  💡 I'll focus on your selected cells for any questions you ask
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="shrink-0"><FileUp className="h-5 w-5" /></Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    placeholder={
                      isDuckDBProcessing 
                        ? "Processing data..." 
                        : !isSchemaReady 
                        ? "Waiting for schema..." 
                        : selectionContext
                        ? `Ask about selected ${selectionContext.selection_type === 'single' ? 'cell' : 'cells'}...`
                        : "Ask the AI to do something..."
                    }
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                    disabled={isLoading || isDuckDBProcessing || !isSchemaReady}
                    className="no-drag"
                  />
                </TooltipTrigger>
                {(!isSchemaReady && !isDuckDBProcessing) && (
                  <TooltipContent>
                    <p>Upload CSV to get started</p>
                  </TooltipContent>
                )}
              </Tooltip>
              <Button 
                onClick={handleSendMessage} 
                disabled={isLoading || isDuckDBProcessing || !isSchemaReady || !message.trim()} 
                className="no-drag"
                size="icon"
                variant="ghost"
              >
                <Send className="h-4 w-4 text-foreground" />
              </Button>
            </div>
            <div className="flex items-center justify-center text-xs text-muted-foreground mt-2 gap-2">
              <span>Powered by</span>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="h-6 text-xs w-auto border-0 bg-transparent p-1 focus:ring-0 focus-visible:ring-offset-0 focus-visible:ring-0 shadow-none no-drag">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0str1ch 1.0">0str1ch 1.0</SelectItem>
                  <SelectItem value="0str1ch mini">0str1ch mini</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </Resizable>
    </div>
  );
};

/* Add this to your global CSS or in a style tag for custom-blue-scrollbar */
/*
.custom-blue-scrollbar::-webkit-scrollbar {
  width: 8px;
  background: transparent;
}
.custom-blue-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(205.91,68.04%,61.96%);
  border-radius: 8px;
}
*/
