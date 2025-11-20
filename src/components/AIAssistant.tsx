import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, BarChart3, Lightbulb, Calculator, TrendingUp, ChevronRight, ChevronLeft, Upload, Sparkles, Move, X, Wand2, FileUp, Pin, PinOff, Target } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoaderCircle } from '@/lib/icons';
// Select component removed - no longer needed
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Resizable } from './Resizable';
import { useAuth } from '@/components/auth/AuthContext';
import { TokenUsageCompact } from '@/components/TokenUsageCompact';
import { Chart } from '@/components/ui/chart';
import { createCellSelectionContext, formatSelectionContextForAI, CellSelectionContext } from '@/lib/cellSelectionUtils';
import { getResponsivePosition, getResponsiveSize, constrainToViewport, getViewportBounds } from '@/lib/viewportUtils';
import { getMessageContextManager, resetMessageContextManager } from '@/lib/messageContextManager';
import api from '@/lib/api'; // Replaced axios with api client

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
  // DuckDB mapping props from parent
  isDuckDBProcessing?: boolean;
  isSchemaReady?: boolean;
  currentSchema?: string | null;
  ensureSheetLoadedInDuckDB?: () => Promise<any>;
  // CSV processing state
  isProcessingCSV?: boolean;
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
  onDeselectCells,
  // DuckDB mapping props from parent
  isDuckDBProcessing: parentIsDuckDBProcessing,
  isSchemaReady: parentIsSchemaReady,
  currentSchema: parentCurrentSchema,
  ensureSheetLoadedInDuckDB: parentEnsureSheetLoadedInDuckDB,
  // CSV processing state
  isProcessingCSV
}: AIAssistantProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ai_conversation_context');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((msg: any) => ({
              type: msg.role === 'user' ? 'user' : 'ai',
              content: msg.content
            }));
          }
        }
      } catch (error) {
        console.error('Error loading chat history from localStorage:', error);
      }
    }
    return [{
      type: 'ai',
      content: "✨ Welcome to your AI-powered infinite canvas! Upload some data and I'll help you analyze it, create stunning visualizations, and perform complex calculations."
    }];
  });
  const [isLoading, setIsLoading] = useState(false);
  // Use DuckDB state from parent instead of managing internally
  const isDuckDBProcessing = parentIsDuckDBProcessing || false;
  const isSchemaReady = parentIsSchemaReady || false;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  // Initialize position with responsive positioning
  const [position, setPosition] = useState(() => {
    const viewport = getViewportBounds();
    return getResponsivePosition('ai-assistant', viewport);
  });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [selectedModel, setSelectedModel] = useState('0str1ch 1.0');
  const [minimized, setMinimized] = useState(isMinimized);
  const [isFixed, setIsFixed] = useState(true); // New state for fixed/movable mode
  const { user } = useAuth();
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [pendingReasoning, setPendingReasoning] = useState<string[]>([]);

  // Message context manager for conversation history
  const contextManager = useMemo(() => getMessageContextManager(), []);
  const syncMessagesFromContext = useCallback(() => {
    const context = contextManager.getContext();
    if (context.recentMessages && context.recentMessages.length > 0) {
      setMessages(context.recentMessages.map(msg => ({
        type: msg.role === 'user' ? 'user' : 'ai',
        content: msg.content
      })));
    }
  }, [contextManager]);

  // Set user credentials and load from DB on mount/user change
  useEffect(() => {
    syncMessagesFromContext();
  }, [syncMessagesFromContext]);

  useEffect(() => {
    if (user?.email) {
      const token = localStorage.getItem('auth_token');
      contextManager.setUserCredentials(user.email, token);

      // Load from database if localStorage is empty
      contextManager.loadFromDatabase()
        .then(() => {
          syncMessagesFromContext();
        })
        .catch(error => {
          console.error('Error loading messages from database:', error);
        });
    }
  }, [user?.email, contextManager, syncMessagesFromContext]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
    };

    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(scrollToBottom, 100);

    return () => clearTimeout(timeoutId);
  }, [messages]);
  const [pendingType, setPendingType] = useState<'function' | 'sql' | null>(null);
  const [pendingRaw, setPendingRaw] = useState<any>(null);
  const [pendingActionType, setPendingActionType] = useState<'update' | 'reply' | null>(null);
  const [pendingActionReason, setPendingActionReason] = useState<string | null>(null);
  const [pendingReplyResult, setPendingReplyResult] = useState<string | null>(null);
  // Use schema from parent instead of managing internally
  const currentSchema = parentCurrentSchema;
  const [selectionContext, setSelectionContext] = useState<CellSelectionContext | null>(null);
  const [lastProcessedSheetId, setLastProcessedSheetId] = useState<string | null>(null);
  const [similarCellsData, setSimilarCellsData] = useState<{ value: any; count: number; cells: string[] }[]>([]);
  const [showSimilarCells, setShowSimilarCells] = useState(false);

  // Function to handle cell navigation
  const handleCellNavigation = (cellId: string) => {
    // This would typically scroll to the cell and highlight it
    // For now, we'll just log it - you can implement the actual navigation logic
    console.log(`Navigating to cell: ${cellId}`);

    // You could emit an event or call a parent function to navigate to the cell
    // Example: onNavigateToCell?.(cellId);
  };

  // Function to analyze similar cell values
  const analyzeSimilarCells = (selectedCells: string[], activeSheet: any) => {
    if (!selectedCells.length || !activeSheet) {
      setSimilarCellsData([]);
      return;
    }

    // Get values from selected cells
    const selectedValues = selectedCells.map(cellId => {
      const cell = activeSheet.cells[cellId];
      return cell?.value;
    }).filter(value => value !== undefined && value !== null && value !== '');

    if (selectedValues.length === 0) {
      setSimilarCellsData([]);
      return;
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
    const similarCells = Array.from(valueCounts.entries())
      .map(([value, data]) => ({ value, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Limit to top 10

    setSimilarCellsData(similarCells);
  };

  // Update selection context when selectedCells changes
  useEffect(() => {
    if (selectedCells.length > 0 && activeSheet) {
      const context = createCellSelectionContext(selectedCells, activeSheet);
      setSelectionContext(context);

      // Analyze similar cells
      analyzeSimilarCells(selectedCells, activeSheet);

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
      setSimilarCellsData([]);
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
        console.log('🔧 AIAssistant using api client');
        const response = await api.post('/ai', {
          message: operation === 'sum-selected' ? 'Calculate the sum of the selected cells' : 'Calculate the average of the selected cells',
          userEmail: user?.email || ''
        });
        const data = response.data;
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

    // Auto-scroll to bottom after adding message
    setTimeout(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
    }, 50);
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

  // Schema updates are now handled by parent component

  // Helper function to get current sheet's table name
  const getCurrentTableName = async () => {
    if (!activeSheet) return 'sheet_data';

    try {
      // First, try to find the actual table name in DuckDB
      const { queryDuckDB } = await import('../lib/utils');
      const tablesResult = await queryDuckDB('SHOW TABLES');
      console.log('🔍 Raw SHOW TABLES result:', tablesResult);

      const existingTables = tablesResult
        .filter(row => {
          console.log('🔍 Filtering table row:', row, 'Type:', typeof row, 'IsArray:', Array.isArray(row));
          if (row && typeof row === 'object' && !Array.isArray(row)) {
            // Handle Proxy(StructRow) objects
            const keys = Object.keys(row);
            console.log('🔍 StructRow keys:', keys);
            if (keys.length > 0) {
              const tableName = row[keys[0]];
              console.log('🔍 Extracted table name from StructRow:', tableName);
              return tableName && typeof tableName === 'string';
            }
          }
          return row && Array.isArray(row) && row.length > 0;
        })
        .map(row => {
          if (row && typeof row === 'object' && !Array.isArray(row)) {
            // Handle Proxy(StructRow) objects
            const keys = Object.keys(row);
            return keys.length > 0 ? row[keys[0]] : null;
          }
          return Array.isArray(row) ? row[0] : null;
        })
        .filter(tableName => tableName && typeof tableName === 'string');

      console.log('🔍 Available tables in DuckDB:', existingTables);
      console.log('🔍 Looking for table for sheet:', activeSheet.name, '(ID:', activeSheet.id, ')');

      // Look for tables that match the sheet name or any sheet ID pattern
      const sheetNamePattern = activeSheet.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const currentIdPattern = activeSheet.id.replace(/[^a-zA-Z0-9]/g, '_');

      // Try to find a table that matches this sheet
      for (const table of existingTables) {
        // Skip undefined or null tables
        if (!table || typeof table !== 'string') {
          console.log('⚠️ Skipping invalid table entry:', table);
          continue;
        }

        // Check if table name contains sheet name or matches any sheet pattern
        if (table.toLowerCase().includes(sheetNamePattern) ||
          (table.includes('sheet_') && table.includes(activeSheet.id.split('-')[1]))) {
          console.log(`✅ Found matching table: ${table} for sheet: ${activeSheet.name}`);
          return table;
        }
      }

      // If no match found, look for any sheet table (fallback)
      const sheetTables = existingTables.filter(table => table && typeof table === 'string' && table.startsWith('sheet_'));
      if (sheetTables.length > 0) {
        console.log(`⚠️ No exact match found, using first available sheet table: ${sheetTables[0]}`);
        return sheetTables[0];
      }

      // Last resort: generate new table name
      const cleanId = activeSheet.id.replace(/[^a-zA-Z0-9]/g, '_');
      const tableName = cleanId.startsWith('sheet_') ? cleanId : `sheet_${cleanId}`;
      console.log(`⚠️ No existing tables found, generating new table name: ${tableName}`);
      return tableName;

    } catch (error) {
      console.error('❌ Error finding table name, falling back to ID-based name:', error);
      // Fallback to old method
      const cleanId = activeSheet.id.replace(/[^a-zA-Z0-9]/g, '_');
      const tableName = cleanId.startsWith('sheet_') ? cleanId : `sheet_${cleanId}`;
      return tableName;
    }
  };

  // Refresh spreadsheet data from DuckDB after SQL updates
  const refreshSpreadsheetFromDuckDB = async () => {
    try {
      console.log('🔄 refreshSpreadsheetFromDuckDB called');

      // Query all data from DuckDB
      const { queryDuckDB } = await import('../lib/utils');
      const tableName = await getCurrentTableName();
      console.log('🔍 Querying table:', tableName);
      console.log('🔍 Active sheet info:', {
        id: activeSheet?.id,
        name: activeSheet?.name,
        tableName: tableName
      });

      // First check if table exists
      try {
        const tablesResult = await queryDuckDB('SHOW TABLES');
        const existingTables = tablesResult.map(row => row[0]);
        console.log('🔍 Existing tables in DuckDB:', existingTables);
        console.log('🔍 Looking for table:', tableName);
        console.log('🔍 Table exists?', existingTables.includes(tableName));

        if (!existingTables.includes(tableName)) {
          console.error(`❌ Table ${tableName} does not exist in DuckDB`);
          console.log('💡 Available tables:', existingTables);
          return;
        }
      } catch (error) {
        console.error('❌ Error checking tables:', error);
        return;
      }

      const result = await queryDuckDB(`SELECT * FROM "${tableName}"`);
      console.log('📊 DuckDB query result:', result.length, 'rows');

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
          console.log('📝 Updating spreadsheet with', Object.keys(updatedCells).length, 'cells');

          // Use bulkUpdateCells to update all cells at once
          const updates = Object.entries(updatedCells).map(([cellId, cell]) => ({
            cellId,
            value: cell.value
          }));

          console.log('🔍 Sample updates:', updates.slice(0, 3));

          // Update the spreadsheet state
          if (bulkUpdateCells) {
            console.log('✅ Using bulkUpdateCells');
            bulkUpdateCells(updates);
            addMessage('ai', `🔄 Spreadsheet refreshed with updated data from database.`);
          } else {
            console.log('⚠️ Using fallback updateCell method');
            // Fallback: update cells one by one
            Object.entries(updatedCells).forEach(([cellId, cell]) => {
              updateCell(cellId, cell.value);
            });
            addMessage('ai', `🔄 Spreadsheet refreshed with updated data from database.`);
          }
        } else {
          console.log('⚠️ No active sheet found for refresh');
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

  // DuckDB mapping is now handled by parent component - no longer needed here

  // Simple token cost estimator (matches backend severity analyzer logic)
  // Note: This is only used for frontend estimation, actual cost is calculated on backend
  const estimateTokenCost = (message: string): number => {
    if (!message || typeof message !== 'string') {
      return 2000; // Default to max
    }

    const msg = message.toLowerCase().trim();
    const msgLength = message.length;

    let severityScore = 0;

    // Message length (0-30 points)
    if (msgLength < 20) {
      severityScore += 5;
    } else if (msgLength < 50) {
      severityScore += 15;
    } else if (msgLength < 100) {
      severityScore += 25;
    } else {
      severityScore += 30;
    }

    // Complexity keywords (0-40 points)
    const complexityKeywords = {
      veryHigh: ['attrition', 'retention', 'churn', 'cohort', 'regression', 'statistical', 'machine learning', 'ai', 'predictive'],
      high: ['analyze', 'trend', 'correlation', 'forecast', 'predict', 'relationship', 'compare multiple', 'complex', 'pivot', 'aggregate'],
      medium: ['calculate', 'sum', 'average', 'total', 'group', 'sort', 'filter', 'find', 'compare'],
      simple: ['show', 'display', 'list', 'count', 'what', 'how many', 'hey', 'hi', 'hello']
    };

    let complexityFound = false;
    for (const keyword of complexityKeywords.veryHigh) {
      if (msg.includes(keyword)) {
        severityScore += 40;
        complexityFound = true;
        break;
      }
    }

    if (!complexityFound) {
      for (const keyword of complexityKeywords.high) {
        if (msg.includes(keyword)) {
          severityScore += 30;
          complexityFound = true;
          break;
        }
      }
    }

    if (!complexityFound) {
      for (const keyword of complexityKeywords.medium) {
        if (msg.includes(keyword)) {
          severityScore += 20;
          complexityFound = true;
          break;
        }
      }
    }

    if (!complexityFound) {
      for (const keyword of complexityKeywords.simple) {
        if (msg.includes(keyword)) {
          severityScore += 10;
          break;
        }
      }
    }

    // SQL/Query indicators (0-20 points)
    const sqlKeywords = ['select', 'where', 'group by', 'order by', 'join', 'union', 'having', 'aggregate'];
    for (const keyword of sqlKeywords) {
      if (msg.includes(keyword)) {
        severityScore += 20;
        break;
      }
    }

    // Chart requests (0-10 points)
    const chartKeywords = ['chart', 'graph', 'plot', 'visualize', 'bar', 'line', 'pie', 'scatter'];
    for (const keyword of chartKeywords) {
      if (msg.includes(keyword)) {
        severityScore += 10;
        break;
      }
    }

    // Clamp severity score to 0-100
    severityScore = Math.min(100, Math.max(0, severityScore));

    // Convert to token cost (100-2000, multiples of 100)
    const rawCost = 100 + (severityScore / 100) * 1900;
    const tokenCost = Math.round(rawCost / 100) * 100;

    return Math.min(2000, Math.max(100, tokenCost));
  };

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

    // Add user message to context
    contextManager.addMessage('user', userMessage);

    // Estimate token cost based on message complexity (simple heuristic)
    const estimatedTokens = estimateTokenCost(userMessage);
    setIsLoading(true);

    try {
      // Use cached schema for the current active sheet - no regeneration needed for queries
      console.log(`🤖 Using cached schema for active sheet: ${activeSheet.name} (${activeSheet.id})`);
      const schema = currentSchema;
      const token = localStorage.getItem('auth_token');

      // First, get AI1 reasoning and simplified question
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090';

      // Get conversation context
      const conversationContext = contextManager.getContext();
      const formattedContext = contextManager.getFormattedContext();
      console.log('💬 Conversation context:', {
        hasSummary: !!conversationContext.summary,
        recentMessages: conversationContext.recentMessages.length,
        totalMessages: conversationContext.totalMessages
      });

      // Create enhanced selection context with explicit column name instructions
      let enhancedSelectionContext = null;
      if (selectionContext) {
        console.log('🎯 Selection context detected:', selectionContext);
        const formattedSelectionContext = formatSelectionContextForAI(selectionContext);
        console.log('📝 Formatted selection context for AI:', formattedSelectionContext);
        enhancedSelectionContext = `${formattedSelectionContext}\n\n🚨 IMPORTANT: When generating SQL queries, use the ACTUAL column names from the selection context above, NOT generic schema names like "Column A", "Column B", etc. The user has selected specific cells with real column names - use those names in your SQL queries.`;
        console.log('🚨 Enhanced selection context:', enhancedSelectionContext);
      } else {
        console.log('⚠️ No selection context - AI will use generic schema column names');
      }

      let ai1Response;
      try {
        ai1Response = await api.post('/ai/ai1', {
          message: userMessage,
          schema,
          userEmail: user?.email || '',
          selectionContext: enhancedSelectionContext,
          conversationContext: formattedContext, // Add conversation context
          conversationHistory: conversationContext.recentMessages, // Add recent messages
          conversationSummary: conversationContext.summary, // Add summary if available
          sheetInfo: {
            sheetName: activeSheet.name,
            sheetId: activeSheet.id,
            tableName: await getCurrentTableName(),
            totalRows: activeSheet.rowCount - 1,
            totalColumns: activeSheet.colCount,
            columnAnalysis: [], // Will be derived from schema
            hasSelection: selectionContext !== null,
            selectionDetails: selectionContext
          }
        });
      } catch (error: any) {
        // Handle 429 Token Limit Exceeded
        if (error.response?.status === 429) {
          const errorData = error.response.data;
          const resetTime = errorData.resetAt ? new Date(errorData.resetAt).toLocaleString() : 'midnight';
          addMessage('ai', `⛔ Token Limit Reached\n\n${errorData.message || 'You have reached your daily token limit.'}\n\nRemaining: ${errorData.remaining?.toLocaleString() || 0} tokens\nResets: ${resetTime}\n\nPlease try again later or upgrade your plan.`);
          setIsLoading(false);
          // Trigger token usage refresh
          window.dispatchEvent(new CustomEvent('refreshTokenUsage'));
          return;
        }
        throw error;
      }

      if (ai1Response.data.error) {
        addMessage('ai', `❌ Error: ${ai1Response.data.error}`);
        return;
      }

      // Check if AI couldn't derive context
      if (ai1Response.data.response_to_user &&
        (ai1Response.data.response_to_user.includes('Unable to fulfill the request') ||
          ai1Response.data.response_to_user.includes('context lacks the information'))) {
        addMessage('ai', `⚠️ I'm having trouble understanding your data structure. Please ensure your headers are clearly defined in row 1 and try asking me to "show me the data" or "what columns do we have?" first.`);
        setIsLoading(false);
        window.dispatchEvent(new CustomEvent('refreshTokenUsage'));
        return;
      }

      const ai1Data = ai1Response.data;


      // Display the response to user from AI1
      let aiResponseText = '';
      if (ai1Data.response_to_user) {
        aiResponseText = ai1Data.response_to_user;
        addMessage('ai', ai1Data.response_to_user);
      } else if (ai1Data.explanation && !ai1Data.is_sheet_related) {
        // For non-sheet-related queries, use explanation as fallback if response_to_user is not available
        aiResponseText = ai1Data.explanation;
        addMessage('ai', ai1Data.explanation);
      }

      // Add AI response to context
      if (aiResponseText) {
        contextManager.addMessage('assistant', aiResponseText);
      }

      // If the query is not sheet-related, stop here
      if (!ai1Data.is_sheet_related) {
        setIsLoading(false);
        window.dispatchEvent(new CustomEvent('refreshTokenUsage'));
        return;
      }

      // If sheet-related, show Mistral's reasoning prominently
      if (ai1Data.explanation) {
        addMessage('ai', ai1Data.explanation);
        // Add explanation to context as well
        contextManager.addMessage('assistant', ai1Data.explanation);
      }

      // Then, get AI2 code generation (only for sheet-related queries)
      let ai2Response;
      try {
        // Get updated context (in case it was summarized)
        const updatedContext = contextManager.getContext();
        const updatedFormattedContext = contextManager.getFormattedContext();

        ai2Response = await api.post('/ai/ai2', {
          message: userMessage,
          schema,
          userEmail: user?.email || '',
          simplified_user_question: ai1Data.simplified_user_question,
          explanation: ai1Data.explanation,
          isUpdate: ai1Data.isUpdate,
          isChart: ai1Data.isChart || false,
          selectionContext: selectionContext ? formatSelectionContextForAI(selectionContext) : null,
          conversationContext: updatedFormattedContext, // Add conversation context
          conversationHistory: updatedContext.recentMessages, // Add recent messages
          conversationSummary: updatedContext.summary, // Add summary if available
          sheetInfo: {
            sheetName: activeSheet.name,
            sheetId: activeSheet.id,
            tableName: await getCurrentTableName(),
            totalRows: activeSheet.rowCount - 1,
            totalColumns: activeSheet.colCount,
            columnAnalysis: [], // Will be derived from schema
            hasSelection: selectionContext !== null,
            selectionDetails: selectionContext
          }
        });
      } catch (error: any) {
        // Handle 429 Token Limit Exceeded
        if (error.response?.status === 429) {
          const errorData = error.response.data;
          const resetTime = errorData.resetAt ? new Date(errorData.resetAt).toLocaleString() : 'midnight';
          addMessage('ai', `⛔ Token Limit Reached\n\n${errorData.message || 'You have reached your daily token limit.'}\n\nRemaining: ${errorData.remaining?.toLocaleString() || 0} tokens\nResets: ${resetTime}\n\nPlease try again later or upgrade your plan.`);
          setIsLoading(false);
          // Trigger token usage refresh
          window.dispatchEvent(new CustomEvent('refreshTokenUsage'));
          return;
        }
        throw error;
      }

      if (ai2Response.data.error) {
        addMessage('ai', `❌ Error: ${ai2Response.data.error}`);
        return;
      }

      // Check if AI2 couldn't derive context
      if (ai2Response.data.ai2_generated_code &&
        (ai2Response.data.ai2_generated_code.includes('Unable to fulfill the request') ||
          ai2Response.data.ai2_generated_code.includes('context lacks the information'))) {
        addMessage('ai', `⚠️ I'm having trouble understanding your data structure. Please ensure your headers are clearly defined in row 1 and try asking me to "show me the data" or "what columns do we have?" first.`);
        setIsLoading(false);
        window.dispatchEvent(new CustomEvent('refreshTokenUsage'));
        return;
      }

      const ai2Data = ai2Response.data;
      console.log('AI2 response received:', ai2Data);

      // Handle confirmation required for partial matches
      if (ai2Data.stage === 'confirmation_required' && ai2Data.requires_confirmation) {
        await handlePartialMatchConfirmation(ai2Data);
        setIsLoading(false);
        window.dispatchEvent(new CustomEvent('refreshTokenUsage'));
        return;
      }

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
              addMessage('ai', `⚠️ No Data Found for Chart\n\nYour query didn't return any data to display in the chart.\n\n**Possible causes:**\n• The filter conditions don't match any rows in your sheet\n• The data you're trying to visualize might not exist\n• Column values might be different than expected\n\n**What you can try:**\n• Check your filter conditions match the actual data values\n• Verify the columns contain the expected data\n• Try asking a broader question to see what data is available`);
            }
          } catch (error) {
            console.error('Error generating chart:', error);
            const friendlyMessage = getFriendlyErrorMessage(error);
            addMessage('ai', friendlyMessage);
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
      // Refresh token usage after message cycle completes (success or error)
      // This ensures UI shows updated token count after DB update
      window.dispatchEvent(new CustomEvent('refreshTokenUsage'));
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
          // Import and use the AI diff logger
          import('@/lib/aiChangeLogger').then(({ logAIDiff }) => {
            // Convert aiUpdates to the format expected by logAIDiff
            const diffUpdates = aiUpdates.map(update => ({
              cellId: update.cellId,
              value: update.aiValue
            }));

            logAIDiff(diffUpdates, (cellId) => {
              // Get previous value from the current sheet
              const cell = activeSheet?.cells[cellId];
              return cell?.value;
            }, activeSheet?.name || activeSheet?.id || 'unknown');
          });

          createAIUpdates(aiUpdates);
          addMessage('ai', `Updated ${aiUpdates.length} cell${aiUpdates.length !== 1 ? 's' : ''}. Hover over colored cells to see the changes.`);

          // Refresh spreadsheet data from DuckDB to sync UI with database
          try {
            await refreshSpreadsheetFromDuckDB();
          } catch (error) {
            console.error('Error refreshing spreadsheet after AI update:', error);
          }
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
          addMessage('ai', `✅ SQL executed successfully! Modified ${result.length} row${result.length !== 1 ? 's' : ''}.`);

          // Create AI updates for only the cells actually affected by this SQL
          if (createAIUpdates && activeSheet) {
            try {
              const currentCells = activeSheet.cells;
              const changedCells: any[] = [];

              // Build headers from row 1 of the spreadsheet
              const headers: string[] = [];
              for (let col = 0; col < activeSheet.colCount; col++) {
                const colLetter = String.fromCharCode(65 + col);
                const headerCellId = `${colLetter}1`;
                const headerValue = currentCells[headerCellId]?.value;
                headers.push(headerValue !== undefined && headerValue !== null ? String(headerValue) : colLetter);
              }

              // Parse SQL parts - handle both simple and UPPER()/LOWER() patterns
              // Pattern 1: Simple SET "column" = 'value'
              let setMatch = sqlQuery.match(/SET\s+"([^"]+)"\s*=\s*'([^']*)'/i);
              // Pattern 2: SET "column" = 'value' (with UPPER/LOWER)
              if (!setMatch) {
                setMatch = sqlQuery.match(/SET\s+"([^"]+)"\s*=\s*['"]([^'"]*)['"]/i);
              }

              // Pattern 1: Simple WHERE "column" = 'value'
              let whereMatch = sqlQuery.match(/WHERE\s+"([^"]+)"\s*=\s*'([^']*)'/i);
              // Pattern 2: WHERE UPPER("column") = UPPER('value')
              if (!whereMatch) {
                whereMatch = sqlQuery.match(/WHERE\s+UPPER\s*\(\s*"([^"]+)"\s*\)\s*=\s*UPPER\s*\(\s*'([^']*)'\s*\)/i);
              }
              // Pattern 3: WHERE LOWER("column") = LOWER('value')
              if (!whereMatch) {
                whereMatch = sqlQuery.match(/WHERE\s+LOWER\s*\(\s*"([^"]+)"\s*\)\s*=\s*LOWER\s*\(\s*'([^']*)'\s*\)/i);
              }
              // Pattern 4: WHERE "column" ILIKE '%value%'
              if (!whereMatch) {
                whereMatch = sqlQuery.match(/WHERE\s+"([^"]+)"\s+ILIKE\s+['"]%([^'"]+)%['"]/i);
              }

              const updatedColumn = setMatch?.[1];
              const newValue = setMatch?.[2] ?? '';
              const whereColumn = whereMatch?.[1];
              const whereValue = whereMatch?.[2] ?? '';

              console.log('🔍 Parsed SQL:', { updatedColumn, newValue, whereColumn, whereValue });

              if (updatedColumn && whereColumn) {
                const updatedColIndex = headers.indexOf(updatedColumn);
                const whereColIndex = headers.indexOf(whereColumn);

                if (updatedColIndex !== -1 && whereColIndex !== -1) {
                  const updatedColLetter = String.fromCharCode(65 + updatedColIndex);
                  const whereColLetter = String.fromCharCode(65 + whereColIndex);

                  // Find all target rows that match the WHERE condition in the sheet
                  // Use case-insensitive matching if WHERE clause uses UPPER/LOWER
                  const isCaseInsensitive = sqlQuery.includes('UPPER') || sqlQuery.includes('LOWER') || sqlQuery.includes('ILIKE');

                  for (let row = 2; row <= activeSheet.rowCount; row++) {
                    const whereCellId = `${whereColLetter}${row}`;
                    const whereCell = currentCells[whereCellId];
                    const whereCellVal = whereCell?.value;

                    // Match using case-insensitive comparison if needed
                    const matches = isCaseInsensitive
                      ? String(whereCellVal).toUpperCase() === String(whereValue).toUpperCase()
                      : String(whereCellVal) === String(whereValue);

                    if (matches) {
                      const targetCellId = `${updatedColLetter}${row}`;
                      const originalValue = currentCells[targetCellId]?.value;

                      if (String(originalValue) !== String(newValue)) {
                        changedCells.push({
                          cellId: targetCellId,
                          originalValue,
                          aiValue: newValue,
                          timestamp: Date.now(),
                          reasoning: 'SQL update'
                        });
                      }
                    }
                  }

                  console.log('📊 Total changed cells (precomputed):', changedCells.length);

                  if (changedCells.length > 0) {
                    // Log diffs
                    import('@/lib/aiChangeLogger').then(({ logAIDiff }) => {
                      const diffUpdates = changedCells.map(update => ({
                        cellId: update.cellId,
                        value: update.aiValue
                      }));
                      logAIDiff(diffUpdates, (cellId) => {
                        const cell = activeSheet?.cells[cellId];
                        return cell?.value;
                      }, activeSheet?.name || activeSheet?.id || 'unknown');
                    });

                    // Create AI updates
                    createAIUpdates(changedCells);
                    addMessage('ai', `Created ${changedCells.length} AI update${changedCells.length !== 1 ? 's' : ''} for cells that actually changed.`);

                    // Refresh spreadsheet data from DuckDB to sync UI with database
                    try {
                      await refreshSpreadsheetFromDuckDB();
                    } catch (error) {
                      console.error('Error refreshing spreadsheet after SQL update:', error);
                    }
                  } else {
                    addMessage('ai', 'SQL executed, but no actual cell values needed changing.');
                  }
                } else {
                  console.warn('⚠️ Column not found in headers for SQL change mapping');
                }
              } else {
                console.warn('⚠️ Failed to parse SET/WHERE from SQL for targeted diff');
                // Even if parsing fails, refresh the spreadsheet to show updated data
                try {
                  await refreshSpreadsheetFromDuckDB();
                  console.log('✅ Refreshed spreadsheet after SQL update (parsing failed, but refresh succeeded)');
                } catch (error) {
                  console.error('Error refreshing spreadsheet after SQL update:', error);
                }
              }
            } catch (error) {
              console.error('Error computing SQL diffs:', error);
              addMessage('ai', 'SQL executed, but failed to compute precise diffs.');
              // Always refresh even if diff computation fails
              try {
                await refreshSpreadsheetFromDuckDB();
                console.log('✅ Refreshed spreadsheet after SQL update (diff computation failed, but refresh succeeded)');
              } catch (refreshError) {
                console.error('Error refreshing spreadsheet after SQL update:', refreshError);
              }
            }
          } else {
            // If createAIUpdates is not available, still refresh the spreadsheet
            try {
              await refreshSpreadsheetFromDuckDB();
              console.log('✅ Refreshed spreadsheet after SQL update');
            } catch (error) {
              console.error('Error refreshing spreadsheet after SQL update:', error);
            }
          }

          // Schema updates are now handled by parent component
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

    // Use viewport utility to constrain position
    const aiAssistantSize = getResponsiveSize('ai-assistant', getViewportBounds());
    const constrainedPosition = constrainToViewport(
      { x: newX, y: newY },
      aiAssistantSize,
      20 // margin
    );

    setPosition(constrainedPosition);
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

  // Handle window resize to maintain responsive positioning
  useEffect(() => {
    const handleResize = () => {
      if (isFixed) {
        // Update position to maintain responsive layout
        const viewport = getViewportBounds();
        setPosition(getResponsivePosition('ai-assistant', viewport));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFixed]);

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

  // Use DuckDB mapping function from parent instead of managing internally
  const ensureSheetLoadedInDuckDB = parentEnsureSheetLoadedInDuckDB;

  // Handle partial match confirmation
  const handlePartialMatchConfirmation = async (ai2Data: any) => {
    try {
      const { queryDuckDB } = await import('../lib/utils');
      const tableName = await getCurrentTableName();
      const checkQuery = ai2Data.partial_matches?.checkQuery ||
        `SELECT DISTINCT "${ai2Data.column_name}" FROM "${tableName}" WHERE "${ai2Data.column_name}" ILIKE '%${ai2Data.search_value?.replace(/'/g, "''")}%' OR UPPER("${ai2Data.column_name}") = UPPER('${ai2Data.search_value?.replace(/'/g, "''")}') LIMIT 10;`;

      console.log('🔍 Checking for partial matches:', checkQuery);
      const matches = await queryDuckDB(checkQuery);
      console.log('🔍 Found matches:', matches);

      if (matches && matches.length > 0) {
        const matchValues = matches.map((row: any) => row[ai2Data.column_name]).filter((v: any) => v);
        const uniqueMatches = [...new Set(matchValues)];

        if (uniqueMatches.length > 0) {
          // Show confirmation dialog
          const matchList = uniqueMatches.map((val: string, idx: number) => `${idx + 1}. "${val}"`).join('\n');
          const confirmMessage = `🔍 Found ${uniqueMatches.length} partial match(es) for "${ai2Data.search_value}":\n\n${matchList}\n\nDid you mean one of these? (Yes to proceed with update, No to cancel)`;

          const userConfirmed = window.confirm(confirmMessage);

          if (userConfirmed) {
            // User confirmed, proceed with update
            addMessage('ai', `✅ Proceeding with update using partial match for "${ai2Data.search_value}"`);
            const columnAnalysis = extractColumnAnalysisFromSchema(currentSchema || '');
            await executeAI2Code(ai2Data.ai2_generated_code, 'duckdb', true, columnAnalysis);
          } else {
            // User denied, ask for exact value
            addMessage('ai', `❌ Update cancelled. Please provide the exact value you want to update.`);
            addMessage('ai', `💡 Tip: Use the exact value as it appears in your sheet, or be more specific in your request.`);
          }
        } else {
          // No matches found, proceed normally
          const columnAnalysis = extractColumnAnalysisFromSchema(currentSchema || '');
          await executeAI2Code(ai2Data.ai2_generated_code, 'duckdb', true, columnAnalysis);
        }
      } else {
        // No matches found, proceed normally
        const columnAnalysis = extractColumnAnalysisFromSchema(currentSchema || '');
        await executeAI2Code(ai2Data.ai2_generated_code, 'duckdb', true, columnAnalysis);
      }
    } catch (error) {
      console.error('Error checking partial matches:', error);
      // On error, proceed with update anyway
      addMessage('ai', `⚠️ Could not verify matches, proceeding with update...`);
      const columnAnalysis = extractColumnAnalysisFromSchema(currentSchema || '');
      await executeAI2Code(ai2Data.ai2_generated_code, 'duckdb', true, columnAnalysis);
    }
  };

  // Helper function to generate friendly error messages for data issues
  const getFriendlyErrorMessage = (error: any): string => {
    const errorMessage = error?.message || error?.toString() || String(error);
    const errorLower = errorMessage.toLowerCase();

    // DuckDB specific errors - Catalog/Column issues
    if (errorLower.includes('catalog') || (errorLower.includes('column') && (errorLower.includes('not found') || errorLower.includes('does not exist') || errorLower.includes('invalid') || errorLower.includes('unknown')))) {
      return `⚠️ Data Issue Detected\n\nThe sheet has an issue - the data you're trying to use is either missing or incomplete.\n\n**Possible causes:**\n• The column name might be incorrect or misspelled\n• The column might not exist in your current data\n• Column names with spaces might need to be quoted differently\n\n**What you can try:**\n• Check that the column names match exactly what's in your sheet\n• Verify the data includes the columns you're querying\n• Try asking "what columns do I have?" to see available data`;
    }

    // Table not found errors
    if (errorLower.includes('table') && (errorLower.includes('not found') || errorLower.includes('does not exist'))) {
      return `⚠️ Data Issue Detected\n\nThe sheet has an issue - the data table cannot be found.\n\n**Possible causes:**\n• The sheet data hasn't been loaded yet\n• The data processing is still in progress\n\n**What you can try:**\n• Wait a moment for data processing to complete\n• Try asking "show me the data" to verify your sheet is loaded`;
    }

    // No data matched / empty results
    if (errorLower.includes('no rows') || errorLower.includes('no data') || errorLower.includes('empty result') || (errorLower.includes('result') && errorLower.includes('empty'))) {
      return `⚠️ No Data Matched\n\nYour query didn't find any matching data.\n\n**Possible causes:**\n• The filter conditions don't match any rows in your sheet\n• The data you're looking for might not exist\n• Column values might be different than expected (check for spelling, case sensitivity, or formatting differences)\n\n**What you can try:**\n• Check your filter conditions match the actual data values\n• Try a broader query to see what data is available\n• Verify the column contains the expected values`;
    }

    // Data type mismatch errors
    if (errorLower.includes('type') && (errorLower.includes('mismatch') || errorLower.includes('cannot') || errorLower.includes('incompatible'))) {
      return `⚠️ Data Type Issue\n\nThe sheet has an issue - there's a mismatch in data types.\n\n**Possible causes:**\n• The column contains mixed data types (text and numbers)\n• Trying to perform calculations on non-numeric data\n• Date formats might be inconsistent\n\n**What you can try:**\n• Check that numeric columns contain only numbers\n• Verify date columns are formatted consistently\n• Ask me to "show me the data" to see what's actually in the columns`;
    }

    // SQL syntax errors (but make them user-friendly)
    if (errorLower.includes('syntax error') || errorLower.includes('invalid sql') || errorLower.includes('parse error')) {
      return `⚠️ Query Issue\n\nThe sheet has an issue - the query couldn't be processed correctly.\n\n**Possible causes:**\n• The data structure might be incomplete or corrupted\n• Column names might be formatted incorrectly\n• The query references data that doesn't exist\n\n**What you can try:**\n• Check that your sheet data is complete and properly formatted\n• Try asking a simpler question first\n• Verify all required columns are present in your data`;
    }

    // Generic data-related errors
    if (errorLower.includes('null') || errorLower.includes('missing') || errorLower.includes('incomplete')) {
      return `⚠️ Data Issue Detected\n\nThe sheet has an issue - the data you're trying to use is either missing or incomplete.\n\n**Possible causes:**\n• Required columns are missing from your data\n• Some data values are empty or null\n• The data structure doesn't match what's expected\n\n**What you can try:**\n• Verify your sheet has all the necessary columns\n• Check for empty cells or missing values\n• Try asking "what columns do I have?" to see what's available`;
    }

    // Default friendly message
    return `⚠️ Data Issue Detected\n\nThe sheet has an issue - the data you're trying to map or use is either missing or incomplete.\n\n**What happened:**\nSomething went wrong while processing your request. This usually means the data structure or content doesn't match what's expected.\n\n**What you can try:**\n• Verify your sheet data is complete and properly formatted\n• Check that all required columns exist\n• Try asking "show me the data" or "what columns do I have?" to inspect your data\n• Simplify your query and try again`;
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
      console.log('🔍 About to execute SQL query:', sql);
      console.log('🔍 Table name from getCurrentTableName():', getCurrentTableName());

      const result = await queryDuckDB(sql);
      console.log('🔍 SQL query result:', result);
      console.log('🔍 Result type:', typeof result);
      console.log('🔍 Result length:', result?.length);

      if (requiresUpdate) {
        // For UPDATE queries, result might be empty but the update still succeeded
        console.log('🔄 SQL UPDATE query executed, refreshing spreadsheet...');

        // Always refresh the spreadsheet after an UPDATE query
        try {
          console.log('🔄 Refreshing spreadsheet after SQL update...');
          await refreshSpreadsheetFromDuckDB();
          console.log('✅ Spreadsheet refreshed successfully');
        } catch (error) {
          console.error('❌ Error refreshing spreadsheet after SQL update:', error);
        }

        if (!options?.suppressOutput) {
          if (result && result.length > 0) {
            const updateMessage = `✅ Sheet updated successfully! Modified ${result.length} rows.`;
            addMessage('ai', updateMessage);
            contextManager.addMessage('assistant', updateMessage);
          } else {
            const updateMessage = `✅ Sheet updated successfully! Changes have been applied.`;
            addMessage('ai', updateMessage);
            contextManager.addMessage('assistant', updateMessage);
          }
        }
      } else {
        // Display the query results
        if (!options?.suppressOutput) {
          if (result && result.length > 0) {
            const resultText = result.map((row: any) =>
              Object.values(row).join(', ')
            ).join('\n');
            const queryMessage = `📊 Query Results:\n${resultText}`;
            addMessage('ai', queryMessage);
            contextManager.addMessage('assistant', queryMessage);
          } else {
            // For SELECT queries with no results, show friendly message
            const noDataMessage = `⚠️ No Data Matched\n\nYour query didn't find any matching data.\n\n**Possible causes:**\n• The filter conditions don't match any rows in your sheet\n• The data you're looking for might not exist\n• Column values might be different than expected\n\n**What you can try:**\n• Check your filter conditions match the actual data values\n• Try a broader query to see what data is available\n• Verify the column contains the expected values`;
            addMessage('ai', noDataMessage);
            contextManager.addMessage('assistant', noDataMessage);
          }
        }
      }
      return result;
    } catch (error) {
      console.error('Error executing SQL query:', error);
      if (!options?.suppressOutput) {
        const friendlyMessage = getFriendlyErrorMessage(error);
        addMessage('ai', friendlyMessage);
        contextManager.addMessage('assistant', friendlyMessage);
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
      console.error('AI2 execution error:', error);
      const friendlyMessage = getFriendlyErrorMessage(error);
      addMessage('ai', friendlyMessage);
    }
  };

  if (minimized) {
    const responsivePosition = getResponsivePosition('ai-assistant', getViewportBounds());
    return (
      <button
        onClick={() => { setMinimized(false); onToggleMinimize(); }}
        style={{
          position: 'fixed',
          right: `${getViewportBounds().width - responsivePosition.x - 50}px`, // Calculate right position
          top: `${responsivePosition.y}px`,
          zIndex: 10, // Low enough to go behind modal overlays
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

  // Fixed position styles with responsive positioning
  const responsivePosition = getResponsivePosition('ai-assistant', getViewportBounds());
  const fixedStyles = isFixed ? {
    position: 'fixed' as const,
    right: `${getViewportBounds().width - responsivePosition.x - 500}px`, // Calculate right position from left
    top: `${responsivePosition.y}px`,
    maxHeight: 'calc(100vh - 120px)', // Ensure it doesn't exceed viewport height
    zIndex: 10, // Low enough to go behind modal overlays
  } : {
    position: 'fixed' as const,
    left: position.x,
    top: position.y,
    zIndex: 10, // Low enough to go behind modal overlays
  };

  return (
    <div id="ai-chatbox" data-ai-chatbox className="ai-assistant viewport-safe" style={{ ...fixedStyles, opacity: 0.94 }}>
      <Resizable
        initialWidth={500}
        initialHeight={600}
        minWidth={350}
        minHeight={400}
        maxWidth={900}
        maxHeight={800}
      >
        <div className="w-full h-full shadow-2xl flex flex-col overflow-hidden relative z-50 rounded-lg" style={{
          filter: 'drop-shadow(0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04))',
          backgroundColor: 'rgba(255, 255, 255, 0.3) !important',
          backdropFilter: 'blur(20px) !important',
          border: '1px solid rgba(255, 255, 255, 0.2) !important',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25) !important',
          WebkitBackdropFilter: 'blur(20px) !important'
        }}>
          <div className="flex items-center justify-between p-3 drag-handle cursor-move sticky top-0 z-10" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.4) !important',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2) !important',
            backdropFilter: 'blur(10px) !important',
            WebkitBackdropFilter: 'blur(10px) !important'
          }} onMouseDown={handleDragStart}>
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
            <div className="flex items-center gap-2 relative z-20">
              <TokenUsageCompact />
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
          <div
            ref={scrollAreaRef}
            className="flex-1 p-4 ai-chat-scrollbar overflow-y-auto"
            style={{ maxHeight: 'calc(100% - 100px)' }}
          >
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
                    className={`max-w-md rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${msg.type === 'user'
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
                  <div className="bg-muted rounded-2xl px-3 py-2 flex items-center gap-3">
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
          </div>
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
                    {similarCellsData.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSimilarCells(!showSimilarCells)}
                        className="h-6 px-2 text-xs text-green-600 hover:text-green-800 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-200 dark:hover:bg-green-800/30"
                      >
                        <span className="mr-1">📊</span>
                        Similar ({similarCellsData.length})
                      </Button>
                    )}
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

                {/* Similar Cells Dropdown */}
                {showSimilarCells && similarCellsData.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700 similar-cells-dropdown">
                    <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">
                      📊 Similar Values Found:
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {similarCellsData.map((item, index) => (
                        <div key={index} className="bg-white/50 dark:bg-gray-800/50 rounded px-2 py-1 similar-cell-item">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-green-600 dark:text-green-400 text-xs">
                                {String(item.value).length > 20 ? `${String(item.value).substring(0, 20)}...` : String(item.value)}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {item.count} occurrence{item.count !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.cells.slice(0, 8).map((cellId, cellIndex) => (
                              <span
                                key={cellIndex}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 cell-location-badge"
                                title={`Click to highlight cell ${cellId}`}
                                onClick={() => handleCellNavigation(cellId)}
                              >
                                {cellId}
                              </span>
                            ))}
                            {item.cells.length > 8 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 more-cells-badge">
                                +{item.cells.length - 8} more
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-green-500 dark:text-green-300 mt-2">
                      💡 These values appear {similarCellsData.reduce((sum, item) => sum + item.count, 0)} times total in your sheet
                      <br />
                      📍 Click on any cell location above to navigate to it
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="shrink-0"><FileUp className="h-5 w-5" /></Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Textarea
                    placeholder={
                      isProcessingCSV
                        ? "Processing CSV data..."
                        : isDuckDBProcessing
                          ? "Processing data..."
                          : !isSchemaReady
                            ? "Waiting for schema..."
                            : selectionContext
                              ? `Ask about selected ${selectionContext.selection_type === 'single' ? 'cell' : 'cells'}...`
                              : "Ask the AI to do something..."
                    }
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isLoading || isDuckDBProcessing || !isSchemaReady || isProcessingCSV}
                    className="no-drag resize-none min-h-[40px] max-h-[200px]"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.3) !important',
                      border: '1px solid rgba(255, 255, 255, 0.2) !important',
                      backdropFilter: 'blur(10px) !important',
                      WebkitBackdropFilter: 'blur(10px) !important'
                    }}
                    ref={textareaRef}
                  />
                </TooltipTrigger>
                {(!isSchemaReady && !isDuckDBProcessing) && (
                  <TooltipContent>
                    <p>Upload CSV or add Data to get started</p>
                  </TooltipContent>
                )}
              </Tooltip>
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || isDuckDBProcessing || !isSchemaReady || !message.trim() || isProcessingCSV}
                className="no-drag"
                size="icon"
                variant="ghost"
              >
                <Send className="h-4 w-4 text-foreground" />
              </Button>
            </div>
            <div className="flex items-center justify-center text-xs text-muted-foreground mt-2 gap-2">
              <span>Powered by</span>
              <span className="font-medium">0str1ch 1.0</span>
            </div>
          </div>
        </div>
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
