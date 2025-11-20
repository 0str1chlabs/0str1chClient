import { useReducer, useCallback, useMemo, useState, useRef } from 'react';
import { useEffect } from 'react';
import { indexedDBService } from '@/lib/indexedDBService';
import { manualUpdateStorage } from '@/lib/manualUpdateStorage';
import { backblazeSyncManager } from '@/lib/backblazeSyncManager';
import { SpreadsheetState, SheetData, Cell, Chart, CellStyle, AIUpdate, AIUpdateBatch } from '@/types/spreadsheet';
import { produce } from 'immer';
import { toast } from '@/hooks/use-toast';

const createEmptySheet = (id: string, name: string): SheetData => ({
  id,
  name,
  cells: {},
  rowCount: 1000,
  colCount: 26,
});

const spreadsheetReducer = (state: SpreadsheetState, action: any): SpreadsheetState => {
  return produce(state, draft => {
    switch (action.type) {
      case 'ADD_SHEET': {
        const proposedName = `Sheet ${state.sheets.length + 1}`;
        
        // Check if a sheet with this name already exists
        const existingSheet = state.sheets.find(sheet => sheet.name === proposedName);
        if (existingSheet) {
          console.log(`🔄 Sheet with name "${proposedName}" already exists, skipping duplicate creation`);
          // Just switch to the existing sheet instead of creating a duplicate
          draft.activeSheetId = existingSheet.id;
          break;
        }
        
        // Generate unique ID by checking existing sheets
        let newId;
        let attempts = 0;
        do {
          newId = `sheet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          attempts++;
        } while (state.sheets.some(sheet => sheet.id === newId) && attempts < 10);
        
        const newSheet = createEmptySheet(newId, proposedName);
        console.log(`✅ Creating new sheet "${proposedName}" with ID ${newId}`);
        draft.sheets.push(newSheet);
        draft.activeSheetId = newId;
        break;
      }
      case 'UPDATE_EXISTING_SHEET': {
        // This action updates an existing sheet's data without affecting other sheets
        const sheetIndex = draft.sheets.findIndex(s => s.id === action.sheetId);
        if (sheetIndex !== -1) {
          const sheet = draft.sheets[sheetIndex];
          // Update the sheet's data while preserving its structure
          if (action.cells) {
            sheet.cells = { ...action.cells };
          }
          if (action.rowCount) {
            sheet.rowCount = action.rowCount;
          }
          if (action.colCount) {
            sheet.colCount = action.colCount;
          }
          if (action.name) {
            sheet.name = action.name;
          }
          // Force a new reference for React to detect the change
          draft.sheets[sheetIndex] = { ...sheet };
        }
        break;
      }
      case 'REMOVE_SHEET': {
        draft.sheets = draft.sheets.filter(s => s.id !== action.sheetId);
        if (draft.activeSheetId === action.sheetId) {
          draft.activeSheetId = draft.sheets[0]?.id || '';
        }
        break;
      }
      case 'SET_ACTIVE_SHEET': {
        draft.activeSheetId = action.sheetId;
        break;
      }
      case 'UPDATE_CELL': {
        const sheetIndex = draft.sheets.findIndex(s => s.id === draft.activeSheetId);
        if (sheetIndex !== -1) {
          const sheet = draft.sheets[sheetIndex];
          sheet.cells = { ...sheet.cells }; // force new reference for React
          if (!sheet.cells[action.cellId]) {
            sheet.cells[action.cellId] = { value: action.value };
          } else {
            // Preserve existing properties like AI updates
            sheet.cells[action.cellId] = { ...sheet.cells[action.cellId], value: action.value };
          }
          // Force a new reference for the sheet object in the array
          draft.sheets[sheetIndex] = { ...sheet };
        }
        break;
      }
      case 'FORMAT_CELLS': {
        console.log('🎨 FORMAT_CELLS action received:', { cellIds: action.cellIds, style: action.style });
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          console.log('🎨 Found active sheet:', sheet.id);
          action.cellIds.forEach((cellId: string) => {
            if (!sheet.cells[cellId]) {
              sheet.cells[cellId] = { value: '' };
              console.log('🎨 Created new cell for:', cellId);
            }
            const oldStyle = sheet.cells[cellId].style;
            sheet.cells[cellId].style = {
              ...sheet.cells[cellId].style,
              ...action.style,
            };
            console.log('🎨 Updated cell style for:', cellId, 'from:', oldStyle, 'to:', sheet.cells[cellId].style);
          });
        } else {
          console.log('🎨 No active sheet found for formatting');
        }
        break;
      }
      case 'TOGGLE_MODE': {
        draft.isAIMode = !draft.isAIMode;
        break;
      }
      case 'TOGGLE_THEME': {
        draft.isDarkMode = !draft.isDarkMode;
        break;
      }
      case 'ADD_CHART': {
        draft.charts.push({ ...action.chart, id: `chart-${Date.now()}` });
        break;
      }
      case 'UPDATE_CHART': {
        const chart = draft.charts.find(c => c.id === action.chartId);
        if (chart) Object.assign(chart, action.updates);
        break;
      }
      case 'REMOVE_CHART': {
        draft.charts = draft.charts.filter(c => c.id !== action.chartId);
        break;
      }
      case 'LOAD_CSV_DATA': {
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          const cells: Record<string, Cell> = {};
          action.csvData.forEach((row: string[], rowIndex: number) => {
            row.forEach((cellValue: string, colIndex: number) => {
              const colLetter = String.fromCharCode(65 + colIndex);
              const cellId = `${colLetter}${rowIndex + 1}`;
              // Preserve existing AI update properties if they exist
              const existingCell = sheet.cells[cellId];
              cells[cellId] = existingCell ? { ...existingCell, value: cellValue } : { value: cellValue };
            });
          });
          sheet.cells = cells;
        }
        break;
      }
      case 'ADD_SHEET_FROM_CSV': {
        const proposedName = action.name || `Sheet ${state.sheets.length + 1}`;
        
        // Enhanced deduplication: Check by name AND CSV content similarity
        const existingSheet = state.sheets.find(sheet => {
          if (sheet.name !== proposedName) return false;
          
          // If names match, also check if CSV content is similar (same dimensions)
          const existingRowCount = sheet.rowCount;
          const existingColCount = sheet.colCount;
          const newRowCount = action.csvData.length;
          const newColCount = action.csvData[0]?.length || 0;
          
          // Consider sheets the same if they have the same name and similar dimensions
          const dimensionsMatch = Math.abs(existingRowCount - newRowCount) <= 1 && 
                                  Math.abs(existingColCount - newColCount) <= 1;
          
          console.log(`🔍 Comparing existing sheet "${sheet.name}" vs new "${proposedName}":`, {
            existing: { rows: existingRowCount, cols: existingColCount },
            new: { rows: newRowCount, cols: newColCount },
            dimensionsMatch,
            nameMatch: sheet.name === proposedName
          });
          
          return dimensionsMatch;
        });
        
        if (existingSheet) {
          console.log(`🔄 Sheet with name "${proposedName}" and similar dimensions already exists, skipping duplicate creation`);
          console.log(`📋 Switching to existing sheet: ${existingSheet.id}`);
          // Just switch to the existing sheet instead of creating a duplicate
          draft.activeSheetId = existingSheet.id;
          break;
        }
        
        // Generate unique ID by checking existing sheets
        let newId;
        let attempts = 0;
        do {
          newId = `sheet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          attempts++;
        } while (state.sheets.some(sheet => sheet.id === newId) && attempts < 10);
        
        const cells: Record<string, Cell> = {};
        action.csvData.forEach((row: string[], rowIndex: number) => {
          row.forEach((cellValue: string, colIndex: number) => {
            const colLetter = String.fromCharCode(65 + colIndex);
            const cellId = `${colLetter}${rowIndex + 1}`;
            cells[cellId] = { value: cellValue };
          });
        });
        const newSheet: SheetData = {
          id: newId,
          name: proposedName,
          cells,
          rowCount: Math.max(1000, action.csvData.length),
          colCount: Math.max(26, action.csvData[0]?.length || 0),
        };
        console.log(`✅ Creating new sheet "${proposedName}" with ID ${newId}`);
        draft.sheets.push(newSheet);
        draft.activeSheetId = newId;
        break;
      }
      case 'ADD_PREDEFINED_SHEET': {
        // Add a pre-created sheet (e.g., from research data)
        const newSheet = action.sheet;
        draft.sheets.push(newSheet);
        draft.activeSheetId = newSheet.id;
        break;
      }
      case 'ADD_MORE_ROWS': {
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          const newRowCount = Math.min(sheet.rowCount + 1000, 100000);
          sheet.rowCount = newRowCount;
        }
        break;
      }
      case '__SET_STATE__': {
        // This is handled by the patched reducer, but we'll add it here for completeness
        return action.payload;
      }
      case 'BULK_UPDATE_CELLS': {
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          action.updates.forEach(({ cellId, value }) => {
            if (!sheet.cells[cellId]) {
              sheet.cells[cellId] = { value };
            } else {
              // Preserve existing properties like AI updates
              sheet.cells[cellId] = { ...sheet.cells[cellId], value };
            }
          });
        }
        break;
      }
      case 'CREATE_AI_UPDATES': {
        console.log('🔄 CREATE_AI_UPDATES reducer called with', action.updates.length, 'updates');
        console.log('🔍 Action updates:', action.updates);
        // Create AI updates without applying them immediately
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          console.log('📊 Found active sheet:', sheet.name);
          console.log('🔍 Sheet cells count before updates:', Object.keys(sheet.cells).length);
          // Filter out updates where originalValue === aiValue (no actual change)
          // Also filter out updates for cells that already have AI updates
          const filteredUpdates = action.updates.filter((update: AIUpdate) => {
            const { cellId, originalValue, aiValue } = update;
            const hasActualChange = originalValue !== aiValue;
            const cellAlreadyHasUpdate = sheet.cells[cellId]?.hasAIUpdate;
            
            // Enhanced debugging for localStorage changes
            if (update.reasoning === 'Pending change from previous session') {
              console.log('🔍 Processing localStorage change for cell:', cellId);
              console.log('  - originalValue:', originalValue);
              console.log('  - aiValue:', aiValue);
              console.log('  - hasActualChange:', hasActualChange);
              console.log('  - cellAlreadyHasUpdate:', cellAlreadyHasUpdate);
              console.log('  - current cell value:', sheet.cells[cellId]?.value);
            }
            
            if (!hasActualChange) {
              console.log('🚫 Skipping AI update for cell:', cellId, '- no actual change (original === ai)');
              return false;
            }
            
            if (cellAlreadyHasUpdate) {
              console.log('🚫 Skipping AI update for cell:', cellId, '- cell already has pending AI update');
              return false;
            }
            
            return true;
          });
          
          const skippedCount = action.updates.length - filteredUpdates.length;
          console.log(`🔍 Filtered AI updates: ${action.updates.length} -> ${filteredUpdates.length} (removed ${skippedCount} unchanged/duplicate cells)`);
          
          if (skippedCount > 0) {
            console.log(`📊 Skipped ${skippedCount} updates (cells already have pending changes or no actual change)`);
          }
          
          // Limit the number of updates to prevent performance issues
          const maxUpdates = 50;
          const limitedUpdates = filteredUpdates.slice(0, maxUpdates);
          
          if (filteredUpdates.length > maxUpdates) {
            console.log(`⚠️ Limiting AI updates to ${maxUpdates} (was ${filteredUpdates.length}) to prevent performance issues`);
          }
          
          limitedUpdates.forEach((update: AIUpdate) => {
            const { cellId, originalValue, aiValue, timestamp, reasoning } = update;
            
            if (!sheet.cells[cellId]) {
              sheet.cells[cellId] = { 
                value: originalValue,
                originalValue,
                aiValue,
                hasAIUpdate: true,
                aiUpdateTimestamp: timestamp
              };
            } else {
              // Store original value if not already stored
              if (!sheet.cells[cellId].originalValue) {
                sheet.cells[cellId].originalValue = sheet.cells[cellId].value;
              }
              
              sheet.cells[cellId].aiValue = aiValue;
              sheet.cells[cellId].hasAIUpdate = true;
              sheet.cells[cellId].aiUpdateTimestamp = timestamp;
            }
          });
          
          draft.hasAIUpdates = limitedUpdates.length > 0;
          console.log('✅ Created', limitedUpdates.length, 'AI updates. Total cells with updates:', Object.keys(sheet.cells).filter(cellId => sheet.cells[cellId]?.hasAIUpdate).length);
          
          // Debug: Check if cells are properly marked with AI updates
          const cellsWithUpdates = Object.entries(sheet.cells).filter(([cellId, cell]) => cell.hasAIUpdate);
          console.log('🔍 Cells with AI updates:', cellsWithUpdates.slice(0, 3).map(([cellId, cell]) => ({
            cellId,
            hasAIUpdate: cell.hasAIUpdate,
            originalValue: cell.originalValue,
            aiValue: cell.aiValue
          })));
          
          // Only log sample updates if there are many
          if (limitedUpdates.length > 10) {
            console.log('📋 Sample AI Updates (first 5):', limitedUpdates.slice(0, 5).map(update => ({
              cellId: update.cellId,
              originalValue: update.originalValue,
              aiValue: update.aiValue,
              reasoning: update.reasoning
            })));
          } else {
            console.log('📋 AI Updates created:', limitedUpdates.map(update => ({
              cellId: update.cellId,
              originalValue: update.originalValue,
              aiValue: update.aiValue,
              reasoning: update.reasoning
            })));
          }
        }
        break;
      }
      case 'ACCEPT_AI_UPDATE': {
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet && sheet.cells[action.cellId]?.hasAIUpdate) {
          const cell = sheet.cells[action.cellId];
          cell.value = cell.aiValue!;
          cell.hasAIUpdate = false;
          cell.aiValue = undefined;
          cell.aiUpdateTimestamp = undefined;
          
          // Check if all AI updates are resolved
          const hasRemainingAIUpdates = Object.values(sheet.cells).some(c => c.hasAIUpdate);
          if (!hasRemainingAIUpdates) {
            draft.hasAIUpdates = false;
          }
        }
        break;
      }
      case 'REJECT_AI_UPDATE': {
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet && sheet.cells[action.cellId]?.hasAIUpdate) {
          const cell = sheet.cells[action.cellId];
          cell.hasAIUpdate = false;
          cell.aiValue = undefined;
          cell.aiUpdateTimestamp = undefined;
          
          // Check if all AI updates are resolved
          const hasRemainingAIUpdates = Object.values(sheet.cells).some(c => c.hasAIUpdate);
          if (!hasRemainingAIUpdates) {
            draft.hasAIUpdates = false;
          }
        }
        break;
      }
      case 'ACCEPT_ALL_AI_UPDATES': {
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          Object.values(sheet.cells).forEach(cell => {
            if (cell.hasAIUpdate && cell.aiValue !== undefined) {
              cell.value = cell.aiValue;
              cell.hasAIUpdate = false;
              cell.aiValue = undefined;
              cell.aiUpdateTimestamp = undefined;
            }
          });
          draft.hasAIUpdates = false;
        }
        break;
      }
      case 'REJECT_ALL_AI_UPDATES': {
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          Object.values(sheet.cells).forEach(cell => {
            if (cell.hasAIUpdate) {
              cell.hasAIUpdate = false;
              cell.aiValue = undefined;
              cell.aiUpdateTimestamp = undefined;
            }
          });
          draft.hasAIUpdates = false;
        }
        break;
      }
      case 'ACCEPT_COLUMN_AI_UPDATES': {
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          Object.entries(sheet.cells).forEach(([cellId, cell]) => {
            if (cell.hasAIUpdate && cell.aiValue !== undefined && cellId.startsWith(action.columnLetter)) {
              cell.value = cell.aiValue;
              cell.hasAIUpdate = false;
              cell.aiValue = undefined;
              cell.aiUpdateTimestamp = undefined;
            }
          });

          // Check if all AI updates are resolved
          const hasRemainingAIUpdates = Object.values(sheet.cells).some(c => c.hasAIUpdate);
          if (!hasRemainingAIUpdates) {
            draft.hasAIUpdates = false;
          }
        }
        break;
      }
      case 'REJECT_COLUMN_AI_UPDATES': {
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          Object.entries(sheet.cells).forEach(([cellId, cell]) => {
            if (cell.hasAIUpdate && cellId.startsWith(action.columnLetter)) {
              cell.hasAIUpdate = false;
              cell.aiValue = undefined;
              cell.aiUpdateTimestamp = undefined;
            }
          });

          // Check if all AI updates are resolved
          const hasRemainingAIUpdates = Object.values(sheet.cells).some(c => c.hasAIUpdate);
          if (!hasRemainingAIUpdates) {
            draft.hasAIUpdates = false;
          }
        }
        break;
      }
      case 'ACCEPT_ROW_AI_UPDATES': {
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          Object.entries(sheet.cells).forEach(([cellId, cell]) => {
            if (cell.hasAIUpdate && cell.aiValue !== undefined && cellId.match(new RegExp(`${action.rowNumber}$`))) {
              cell.value = cell.aiValue;
              cell.hasAIUpdate = false;
              cell.aiValue = undefined;
              cell.aiUpdateTimestamp = undefined;
            }
          });

          // Check if all AI updates are resolved
          const hasRemainingAIUpdates = Object.values(sheet.cells).some(c => c.hasAIUpdate);
          if (!hasRemainingAIUpdates) {
            draft.hasAIUpdates = false;
          }
        }
        break;
      }
      case 'REJECT_ROW_AI_UPDATES': {
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          Object.entries(sheet.cells).forEach(([cellId, cell]) => {
            if (cell.hasAIUpdate && cellId.match(new RegExp(`${action.rowNumber}$`))) {
              cell.hasAIUpdate = false;
              cell.aiValue = undefined;
              cell.aiUpdateTimestamp = undefined;
            }
          });

          // Check if all AI updates are resolved
          const hasRemainingAIUpdates = Object.values(sheet.cells).some(c => c.hasAIUpdate);
          if (!hasRemainingAIUpdates) {
            draft.hasAIUpdates = false;
            }
          }
        break;
      }
      default:
        break;
    }
  });
};

export const useSpreadsheet = () => {
  const [state, dispatch] = useReducer(spreadsheetReducer, {
    sheets: [createEmptySheet('sheet-1', 'Sheet 1')],
    activeSheetId: 'sheet-1',
    charts: [],
    isAIMode: false,
    isDarkMode: false,
    hasAIUpdates: false,
  });

  // Ensure we only apply manual updates from localStorage once on initial load
  const appliedManualOnLoad = useRef<boolean>(false);

  // Undo/redo state
  const [history, setHistory] = useState([state]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Helper to push new state to history
  const pushHistory = useCallback((newState) => {
    console.log('Pushing to history - current index:', historyIndex, 'history length:', history.length);
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newState);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    console.log('History updated - new length:', updatedHistory.length, 'new index:', updatedHistory.length - 1);
  }, [history, historyIndex]);

  // Wrap dispatch to push to history
  const dispatchWithHistory = useCallback((action) => {
    dispatch(action);
    setTimeout(() => {
      pushHistory(spreadsheetReducer(history[historyIndex], action));
    }, 0);
  }, [dispatch, pushHistory, history, historyIndex]);

  // Undo/redo handlers
  const undo = useCallback(() => {
    console.log('Undo called - historyIndex:', historyIndex, 'history length:', history.length);
    if (historyIndex > 0) {
      console.log('Performing undo - setting historyIndex to:', historyIndex - 1);
      setHistoryIndex(historyIndex - 1);
      dispatch({ type: '__SET_STATE__', payload: history[historyIndex - 1] });
    } else {
      console.log('Cannot undo - already at beginning');
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    console.log('Redo called - historyIndex:', historyIndex, 'history length:', history.length);
    if (historyIndex < history.length - 1) {
      console.log('Performing redo - setting historyIndex to:', historyIndex + 1);
      setHistoryIndex(historyIndex + 1);
      dispatch({ type: '__SET_STATE__', payload: history[historyIndex + 1] });
    } else {
      console.log('Cannot redo - already at end');
    }
  }, [history, historyIndex]);

  // Replace all dispatch calls with dispatchWithHistory for state-changing actions
  const addSheet = useCallback(() => {
    dispatchWithHistory({ type: 'ADD_SHEET' });
  }, [dispatchWithHistory]);

  const removeSheet = useCallback((sheetId: string) => {
    dispatchWithHistory({ type: 'REMOVE_SHEET', sheetId });
  }, [dispatchWithHistory]);

  const setActiveSheet = useCallback((sheetId: string) => {
    dispatchWithHistory({ type: 'SET_ACTIVE_SHEET', sheetId });
  }, [dispatchWithHistory]);

  const updateCell = useCallback((cellId: string, value: string | number) => {
    console.log('[updateCell] called with:', cellId, value);
    dispatchWithHistory({ type: 'UPDATE_CELL', cellId, value });
    setTimeout(() => {
      console.log('[updateCell] dispatched for:', cellId, value);
    }, 0);
  }, [dispatchWithHistory]);

  const formatCells = useCallback((cellIds: string[], style: Partial<CellStyle>) => {
    console.log('🎨 formatCells called with:', { cellIds, style });
    dispatchWithHistory({ type: 'FORMAT_CELLS', cellIds, style });
    console.log('🎨 formatCells action dispatched');
  }, [dispatchWithHistory]);

  const toggleMode = useCallback(() => {
    dispatchWithHistory({ type: 'TOGGLE_MODE' });
  }, [dispatchWithHistory]);

  const toggleTheme = useCallback(() => {
    dispatchWithHistory({ type: 'TOGGLE_THEME' });
  }, [dispatchWithHistory]);

  const addChart = useCallback((chart: Omit<Chart, 'id'>) => {
    dispatchWithHistory({ type: 'ADD_CHART', chart });
  }, [dispatchWithHistory]);

  const updateChart = useCallback((chartId: string, updates: Partial<Chart>) => {
    dispatchWithHistory({ type: 'UPDATE_CHART', chartId, updates });
  }, [dispatchWithHistory]);

  const removeChart = useCallback((chartId: string) => {
    dispatchWithHistory({ type: 'REMOVE_CHART', chartId });
  }, [dispatchWithHistory]);

  const loadCSVData = useCallback((csvData: string[][]) => {
    dispatchWithHistory({ type: 'LOAD_CSV_DATA', csvData });
  }, [dispatchWithHistory]);

  const addSheetFromCSV = useCallback((csvData: string[][], name?: string) => {
    dispatchWithHistory({ type: 'ADD_SHEET_FROM_CSV', csvData, name });
  }, [dispatchWithHistory]);

  const addPredefinedSheet = useCallback((sheet: SheetData) => {
    dispatchWithHistory({ type: 'ADD_PREDEFINED_SHEET', sheet });
  }, [dispatchWithHistory]);

  const addMoreRows = useCallback(() => {
    const currentSheet = state.sheets.find(s => s.id === state.activeSheetId);
    const currentRowCount = currentSheet?.rowCount || 0;
    const newRowCount = Math.min(currentRowCount + 1000, 100000);
    
    dispatchWithHistory({ type: 'ADD_MORE_ROWS' });
    
    // Show toast notification
    setTimeout(() => {
      toast({
        title: "Rows Added Successfully",
        description: `Added 1,000 more rows. Total rows: ${newRowCount.toLocaleString()}`,
        duration: 3000,
      });
    }, 0);
  }, [dispatchWithHistory, state.sheets, state.activeSheetId]);

  const bulkUpdateCells = useCallback((updates: { cellId: string, value: any }[]) => {
    dispatchWithHistory({ type: 'BULK_UPDATE_CELLS', updates });
  }, [dispatchWithHistory]);

  // New function to update existing sheets without affecting others
  const updateExistingSheet = useCallback((sheetId: string, updates: { cells?: any, rowCount?: number, colCount?: number, name?: string }) => {
    dispatchWithHistory({ type: 'UPDATE_EXISTING_SHEET', sheetId, ...updates });
  }, [dispatchWithHistory]);

  // Background sync: every 45s push manualUpdate_<SheetName> to IndexedDB and clear the key after successful sync
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const sheets = state.sheets; // capture latest via state dependency; interval remains stable
        if (!sheets || sheets.length === 0) return;

        // Build a normalized-name -> in-memory sheet map (consistent with manualUpdate key & IndexedDB cleaning)
        const normalize = (n: string) => n.replace(/[^a-zA-Z0-9\-_.]/g, '_').replace(/_{2,}/g, '_');
        const nameToInMemorySheet = new Map<string, typeof state.sheets[number]>();
        sheets.forEach(s => nameToInMemorySheet.set(normalize(s.name), s));

        // Iterate localStorage keys and find manualUpdate_*
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith('manualUpdate_')) continue;
          const sheetName = key.substring('manualUpdate_'.length);
          const inMemorySheet = nameToInMemorySheet.get(sheetName);
          // We still allow syncing to IndexedDB even if the in-memory sheet isn't mounted yet.

          const raw = localStorage.getItem(key);
          if (!raw) continue;
          let updatesObj: any;
          try { updatesObj = JSON.parse(raw); } catch { continue; }
          const entries = Object.entries(updatesObj) as Array<[string, any]>;
          if (entries.length === 0) continue;

          // Prepare changes list for IndexedDB simplified structure
          const changes = entries.map(([cellId, upd]) => ({
            cellId,
            previousValue: inMemorySheet?.cells[cellId]?.value || upd?.previousValue,
            newValue: upd?.value
          }));

          // Resolve the correct IndexedDB sheet record by cleaned name
          const allSheets = await indexedDBService.getAllSheets();
          const matchByName = allSheets.find(s => s.name === sheetName);
          let targetSheetRecordId: string;
          if (matchByName) {
            targetSheetRecordId = matchByName.id;
          } else {
            // Create a new sheet record with cleaned name; keep csvData intact (empty if unknown)
            targetSheetRecordId = await indexedDBService.saveSheet({
              name: inMemorySheet ? inMemorySheet.name : sheetName,
              csvData: '',
              isActive: false,
              metadata: {
                rowCount: inMemorySheet?.rowCount || 0,
                colCount: inMemorySheet?.colCount || 0,
                fileSize: 0,
                uploadDate: Date.now()
              }
            });
          }

        // Track manual changes in sync manager
        changes.forEach(change => {
          const sheetId = inMemorySheet?.id || targetSheetRecordId;
          const displayName = inMemorySheet?.name || sheetName;
          backblazeSyncManager.recordManualChange(
            sheetId,
            displayName,
            change.cellId,
            change.previousValue,
            change.newValue
          );
        });
        
        // Persist to IndexedDB: append changes AND update csvData if we have sheet data
        await indexedDBService.addChangesToSheet(targetSheetRecordId, changes);
        
        // Also update csvData from current sheet cells so reload works correctly
        if (inMemorySheet && inMemorySheet.cells && Object.keys(inMemorySheet.cells).length > 0) {
          // Use sheet dimensions if available, otherwise calculate from cells
          const rowCount = inMemorySheet.rowCount || 1000;
          const colCount = inMemorySheet.colCount || 26;
          
          // Helper to convert column index (1-based) to letter(s)
          const colIndexToLetter = (col: number): string => {
            let result = '';
            while (col > 0) {
              col--;
              result = String.fromCharCode(65 + (col % 26)) + result;
              col = Math.floor(col / 26);
            }
            return result;
          };
          
          // Build CSV from cells
          const csvRows: string[][] = [];
          // Build header row from first row
          const headerRow: string[] = [];
          for (let col = 0; col < colCount; col++) {
            const colLetter = colIndexToLetter(col + 1);
            const cellId = `${colLetter}1`;
            const cell = inMemorySheet.cells[cellId];
            headerRow.push(cell?.value !== undefined && cell?.value !== null ? String(cell.value) : colLetter);
          }
          if (headerRow.some(v => v !== '')) {
            csvRows.push(headerRow);
          }
          
          // Build data rows
          for (let row = 2; row <= Math.min(rowCount, 1000); row++) {
            const csvRow: string[] = [];
            let hasData = false;
            for (let col = 0; col < colCount; col++) {
              const colLetter = colIndexToLetter(col + 1);
              const cellId = `${colLetter}${row}`;
              const cell = inMemorySheet.cells[cellId];
              const value = cell?.value !== undefined && cell?.value !== null ? String(cell.value) : '';
              csvRow.push(value);
              if (value !== '') hasData = true;
            }
            if (hasData) {
              csvRows.push(csvRow);
            }
          }
          
          // Convert to CSV string with proper escaping (use CRLF line endings)
          const csvString = csvRows.map(row => row.map(val => {
            if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          }).join(',')).join('\r\n');
          
          // Update the sheet with csvData
          if (csvString && csvRows.length > 0) {
            const existingSheet = await indexedDBService.getSheet(targetSheetRecordId);
            if (existingSheet) {
              await indexedDBService.saveSheet({
                ...existingSheet,
                csvData: csvString,
                isActive: existingSheet.isActive
              });
              console.log(`✅ Updated csvData for sheet ${sheetName} (${csvRows.length} rows, ${csvString.length} chars)`);
            }
          }
        }

        // Verify DB write before clearing localStorage
        try {
          const verify = await indexedDBService.getSheet(targetSheetRecordId);
          const verifyOk = Array.isArray(verify?.changes) && changes.every(ch =>
            verify!.changes!.some(v => v.cellId === ch.cellId && v.newValue === ch.newValue)
          );
          if (!verifyOk) {
            console.warn('[manual-sync] DB verify failed, skipping clear for', key);
            continue;
          }
        } catch (e) {
          console.warn('[manual-sync] DB verify error, skipping clear for', key, e);
          continue;
        }

          // Apply to CSV the same way "Accept All Changes" does so reload shows updated data
          try {
            const { csvChangeManager } = await import('@/lib/csvChangeManager');
            const currentCSV = csvChangeManager.getCurrentCSV?.();
            if (currentCSV) {
              await csvChangeManager.applyChangesToCSV();
            }
          } catch (e) {
            console.warn('⚠️ CSV apply during background sync skipped:', e);
          }

          // Also update current UI state so values are consistent (if not already)
          if (inMemorySheet) {
            const nextCells: Record<string, any> = { ...inMemorySheet.cells };
            changes.forEach(c => {
              const prev = nextCells[c.cellId];
              nextCells[c.cellId] = prev ? { ...prev, value: c.newValue } : { value: c.newValue };
            });
            updateExistingSheet(inMemorySheet.id, { cells: nextCells });
          }

        // Clear the manual key after successful sync & verify
        localStorage.removeItem(key);
        }
      } catch (e) {
        console.error('❌ Background manualUpdate sync failed:', e);
      }
    };

    // Run every 5s to sync localStorage changes to IndexedDB quickly
    const interval = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [state.sheets, updateExistingSheet]);

  // One-time: apply persisted changes from IndexedDB (so reload reflects prior manual syncs)
  const appliedDBChangesOnLoad = useRef<boolean>(false);
  const hasAnyCells = useMemo(() => {
    return (state.sheets || []).some(s => s && s.cells && Object.keys(s.cells).length > 0);
  }, [state.sheets]);
  useEffect(() => {
    if (appliedDBChangesOnLoad.current) return;
    if (!state.sheets || state.sheets.length === 0) return;
    if (!hasAnyCells) return; // wait until cells are populated so overlay takes effect in UI
    (async () => {
      try {
        const records = await indexedDBService.getAllSheets();
        if (!records || records.length === 0) return;
        const normalize = (n: string) => n.replace(/[^a-zA-Z0-9\-_.]/g, '_').replace(/_{2,}/g, '_');
        const inMemoryByName = new Map<string, typeof state.sheets[number]>();
        state.sheets.forEach(s => inMemoryByName.set(normalize(s.name), s));
        let appliedCount = 0;
        records.forEach(rec => {
          if (!rec.changes || rec.changes.length === 0) return;
          const target = inMemoryByName.get(rec.name);
          if (!target) return;
          const nextCells: Record<string, any> = { ...target.cells };
          rec.changes.forEach(ch => {
            const prev = nextCells[ch.cellId];
            nextCells[ch.cellId] = prev ? { ...prev, value: ch.newValue } : { value: ch.newValue };
          });
          updateExistingSheet(target.id, { cells: nextCells });
          appliedCount++;
        });
        if (appliedCount > 0) {
          appliedDBChangesOnLoad.current = true;
        }
      } catch (e) {
        console.error('❌ Failed to apply persisted DB changes on load:', e);
      }
    })();
  }, [state.sheets.length, hasAnyCells, updateExistingSheet]);

  // Apply manual updates from localStorage for all sheets on load/when sheets list changes
  useEffect(() => {
    if (appliedManualOnLoad.current) return;
    try {
      const allUpdatesBySheet = manualUpdateStorage.getAllSheetsManualUpdates();
      const sheetNameToSheet = new Map<string, typeof state.sheets[number]>();
      const normalize = (n: string) => n.replace(/[^a-zA-Z0-9\-_.]/g, '_').replace(/_{2,}/g, '_');
      state.sheets.forEach(s => sheetNameToSheet.set(normalize(s.name), s));

      Object.keys(allUpdatesBySheet).forEach((sheetName) => {
        const targetSheet = sheetNameToSheet.get(sheetName);
        if (!targetSheet) return;

        const updatesForSheet = allUpdatesBySheet[sheetName];
        const currentCells = targetSheet.cells || {};
        const nextCells: Record<string, any> = { ...currentCells };

        Object.entries(updatesForSheet).forEach(([cellId, update]) => {
          const prev = nextCells[cellId];
          nextCells[cellId] = prev ? { ...prev, value: update.value } : { value: update.value };
        });

        updateExistingSheet(targetSheet.id, { cells: nextCells });
      });

      // Mark as applied; do NOT clear localStorage keys (user requested persistence)
      appliedManualOnLoad.current = true;
    } catch (e) {
      console.error('❌ Failed to apply manual updates from localStorage:', e);
    }
    // Only once after initial sheets list is available
  }, [state.sheets, updateExistingSheet]);

  // AI Update handlers
  // Rate limiting for AI updates
  const lastAIUpdateTime = useRef<number>(0);
  const AI_UPDATE_COOLDOWN = 2000; // 2 seconds
  
  // Track attempted changes to prevent repeated attempts
  const attemptedChanges = useRef<Set<string>>(new Set());

  const createAIUpdates = useCallback((updates: AIUpdate[]) => {
    const now = Date.now();
    
    console.log('🔄 createAIUpdates called with', updates.length, 'updates');
    
    // Check if this is from localStorage (by checking reasoning)
    const isFromLocalStorage = updates.some(u => u.reasoning === 'Pending change from previous session');
    
    if (isFromLocalStorage) {
      console.log('🔄 This is from localStorage, bypassing rate limits');
      console.log('🔍 Dispatching CREATE_AI_UPDATES with localStorage updates:', updates.length);
      console.log('🔍 Sample localStorage updates:', updates.slice(0, 3));
      // For localStorage changes, bypass rate limiting
      dispatchWithHistory({ type: 'CREATE_AI_UPDATES', updates });
      return;
    }
    
    // Check if we're in cooldown period
    if (now - lastAIUpdateTime.current < AI_UPDATE_COOLDOWN) {
      console.log('⏳ AI update cooldown active, skipping batch');
      return;
    }
    
    // Check if there are already many pending AI updates
    const currentPendingUpdates = Object.values(state.sheets.find(s => s.id === state.activeSheetId)?.cells || {})
      .filter(cell => cell.hasAIUpdate).length;
    
    if (currentPendingUpdates > 20) {
      console.log('⏳ Too many pending AI updates, skipping batch to prevent overload');
      return;
    }
    
    // Check if we've already attempted similar changes recently
    const changeSignature = updates.map(u => `${u.cellId}:${u.originalValue}->${u.aiValue}`).join('|');
    if (attemptedChanges.current.has(changeSignature)) {
      console.log('⏳ Similar changes already attempted, skipping batch');
      return;
    }
    
    // Track this attempt
    attemptedChanges.current.add(changeSignature);
    
    // Clear old attempts after 30 seconds
    setTimeout(() => {
      attemptedChanges.current.delete(changeSignature);
    }, 30000);
    
    lastAIUpdateTime.current = now;
    console.log('✅ Dispatching CREATE_AI_UPDATES with', updates.length, 'updates');
    dispatchWithHistory({ type: 'CREATE_AI_UPDATES', updates });
  }, [dispatchWithHistory]); // Remove state dependencies to prevent infinite loops

  const acceptAIUpdate = useCallback(async (cellId: string) => {
    // Get current sheet and cell values before accepting
    const currentSheet = state.sheets.find(s => s.id === state.activeSheetId);
    const cell = currentSheet?.cells[cellId];
    
    if (currentSheet && cell && cell.hasAIUpdate) {
      // Track AI change in sync manager
      backblazeSyncManager.recordAIChange(
        currentSheet.id,
        currentSheet.name,
        cellId,
        cell.value, // previous value
        cell.aiValue // new value
      );
    }
    
    dispatchWithHistory({ type: 'ACCEPT_AI_UPDATE', cellId });
    
    // Also apply this change to IndexedDB CSV if available
    try {
      const { csvChangeManager } = await import('@/lib/csvChangeManager');
      const currentCSV = csvChangeManager.getCurrentCSV();
      if (currentCSV) {
        // Apply all pending changes to IndexedDB (including this one)
        await csvChangeManager.applyChangesToCSV();
      }
    } catch (error) {
      console.error('❌ Error applying change to IndexedDB:', error);
    }
  }, [dispatchWithHistory, state.sheets, state.activeSheetId]);

  const rejectAIUpdate = useCallback((cellId: string) => {
    dispatchWithHistory({ type: 'REJECT_AI_UPDATE', cellId });
  }, [dispatchWithHistory]);

  const acceptAllAIUpdates = useCallback(async () => {
    console.log('🔄 acceptAllAIUpdates called');
    
    // Track all AI changes before accepting
    const currentSheet = state.sheets.find(s => s.id === state.activeSheetId);
    if (currentSheet) {
      Object.entries(currentSheet.cells).forEach(([cellId, cell]) => {
        if (cell.hasAIUpdate && cell.aiValue !== undefined) {
          backblazeSyncManager.recordAIChange(
            currentSheet.id,
            currentSheet.name,
            cellId,
            cell.value,
            cell.aiValue
          );
        }
      });
    }
    
    dispatchWithHistory({ type: 'ACCEPT_ALL_AI_UPDATES' });
    
    // Clear localStorage changes since they've been accepted
    try {
      console.log('🧹 Clearing localStorage changes after accepting AI updates...');
      const currentSheet = state.sheets.find(s => s.id === state.activeSheetId);
      if (currentSheet) {
        const fileName = currentSheet.name || `sheet-${currentSheet.id}`;
        const cleanName = fileName.replace(/[^a-zA-Z0-9\-_.]/g, '_').replace(/_{2,}/g, '_').toLowerCase();
        
        // Clear new filename-based storage
        const newAIDiffData = localStorage.getItem('sheet_ai_diff_by_filename');
        if (newAIDiffData) {
          const parsed = JSON.parse(newAIDiffData);
          if (parsed[cleanName]) {
            console.log(`🗑️ Removing accepted changes for sheet "${fileName}" (key: ${cleanName})`);
            delete parsed[cleanName];
            localStorage.setItem('sheet_ai_diff_by_filename', JSON.stringify(parsed));
          }
        }
        
        // Also clear sheet-name-based storage (current method)
        const sheetNameAIDiffData = localStorage.getItem('sheet_specific_ai_diff');
        if (sheetNameAIDiffData) {
          const parsed = JSON.parse(sheetNameAIDiffData);
          
          // Try to clear by sheet name (new method)
          if (parsed[fileName]) {
            console.log(`🗑️ Removing accepted changes for sheet name "${fileName}"`);
            delete parsed[fileName];
            localStorage.setItem('sheet_specific_ai_diff', JSON.stringify(parsed));
          }
          
          // Also try to clear by sheet ID (fallback for old data)
          if (parsed[state.activeSheetId]) {
            console.log(`🗑️ Removing accepted changes for sheet ID ${state.activeSheetId} (legacy)`);
            delete parsed[state.activeSheetId];
            localStorage.setItem('sheet_specific_ai_diff', JSON.stringify(parsed));
          }
        }
      }
    } catch (error) {
      console.error('❌ Error clearing localStorage:', error);
    }
    
    // Update IndexedDB with the accepted changes
    try {
      console.log('🔄 === STARTING INDEXEDDB UPDATE AFTER ACCEPTING CHANGES ===');
      console.log('📊 Current state info:', {
        activeSheetId: state.activeSheetId,
        totalSheets: state.sheets.length,
        hasAIUpdates: state.hasAIUpdates
      });
      
      const currentSheet = state.sheets.find(s => s.id === state.activeSheetId);
      if (!currentSheet) {
        console.log('❌ No active sheet found for ID:', state.activeSheetId);
        console.log('📋 Available sheets:', state.sheets.map(s => ({id: s.id, name: s.name})));
        return;
      }
      
      console.log('✅ Found active sheet:', {
        id: currentSheet.id,
        name: currentSheet.name,
        rowCount: currentSheet.rowCount,
        colCount: currentSheet.colCount,
        cellCount: Object.keys(currentSheet.cells).length
      });
      
      const fileName = currentSheet.name || `sheet-${currentSheet.id}`;
      console.log('📋 Using fileName for IndexedDB:', fileName);
      
      // Show current cell values (including any accepted AI changes)
      const cellsWithValues = Object.entries(currentSheet.cells)
        .filter(([_, cell]) => cell.value && cell.value.toString().trim() !== '')
        .slice(0, 10); // Show first 10 non-empty cells
      
      console.log('📊 Current sheet cells (sample):', cellsWithValues.map(([cellId, cell]) => ({
        cellId,
        value: cell.value,
        hadAIUpdate: cell.aiUpdateTimestamp ? 'Yes' : 'No'
      })));
      
      // Get the current sheet data and save it to IndexedDB
      console.log('📦 Importing indexedDBService...');
      const { indexedDBService } = await import('../lib/indexedDBService');
      console.log('✅ IndexedDBService imported successfully');
      
      // Initialize IndexedDB service
      console.log('🔧 Initializing IndexedDB service...');
      await indexedDBService.init();
      console.log('✅ IndexedDB service initialized');
      
      // Convert sheet cells to CSV format for IndexedDB storage
      console.log('📊 Converting sheet cells to CSV format...');
      const csvData: string[][] = [];
      const maxRow = currentSheet.rowCount;
      const maxCol = currentSheet.colCount;
      
      console.log('📊 Sheet dimensions:', { maxRow, maxCol });
      
      // Build header row from first row values; fallback to A..Z for empty headers
      const headerRow: string[] = [];
      for (let col = 0; col < maxCol; col++) {
        const colLetter = String.fromCharCode(65 + col);
        const headerCellId = `${colLetter}1`;
        const headerCell = currentSheet.cells[headerCellId];
        const headerValue = (headerCell?.value !== undefined && headerCell?.value !== null && String(headerCell?.value).trim() !== '')
          ? String(headerCell?.value)
          : colLetter;
        headerRow.push(headerValue);
      }
      csvData.push(headerRow);
      
      // Add data rows (rows 2..maxRow). Use final value = aiValue (if present) else value
      for (let row = 2; row <= maxRow; row++) {
        const rowData: string[] = [];
        for (let col = 0; col < maxCol; col++) {
          const colLetter = String.fromCharCode(65 + col);
          const cellId = `${colLetter}${row}`;
          const cell = currentSheet.cells[cellId];
          const finalValue = (cell && cell.hasAIUpdate && cell.aiValue !== undefined) ? cell.aiValue : cell?.value;
          rowData.push(finalValue !== undefined && finalValue !== null ? String(finalValue) : '');
        }
        // Only add non-empty rows
        if (rowData.some(cell => cell.trim() !== '')) {
          csvData.push(rowData);
        }
      }
      
      console.log('📊 Generated CSV data with', csvData.length, 'rows for IndexedDB');
      console.log('📋 Sample CSV data (first 3 rows):', csvData.slice(0, 3));
      
      // Convert CSV data to string format
      const csvString = csvData.map(row => row.join(',')).join('\n');
      console.log('📊 CSV string generated:', {
        length: csvString.length,
        lines: csvString.split('\n').length,
        preview: csvString.substring(0, 200)
      });
      
      // Save to IndexedDB
      console.log('💾 Saving sheet to IndexedDB...');
      const sheetRecord = {
        name: fileName,
        csvData: csvString,
        isActive: true,
        processedData: {
          totalRows: csvData.length - 1,
          totalColumns: csvData[0]?.length || 0
        }
      };
      
      console.log('📋 Sheet record to save:', {
        name: sheetRecord.name,
        csvDataLength: sheetRecord.csvData.length,
        isActive: sheetRecord.isActive,
        processedData: sheetRecord.processedData
      });
      
      const saveResult = await indexedDBService.saveSheet(sheetRecord);
      console.log('💾 IndexedDB save result:', saveResult);
      
      // Verify the save by reading it back
      console.log('🔍 Verifying IndexedDB save by reading back...');
      const allSheets = await indexedDBService.getAllSheets();
      console.log('📊 getAllSheets returned:', {
        type: typeof allSheets,
        isArray: Array.isArray(allSheets),
        length: allSheets.length,
        firstItem: allSheets[0] ? { name: allSheets[0].name, csvDataType: typeof allSheets[0].csvData } : null
      });
      
      // allSheets is directly an array of SheetRecord, not wrapped in .sheets
      const savedSheet = allSheets.find(s => s.name === fileName);
      
      if (savedSheet) {
        console.log('✅ Verification successful - Sheet found in IndexedDB:', {
          id: savedSheet.id,
          name: savedSheet.name,
          csvDataLength: savedSheet.csvData?.length || 0,
          lastModified: savedSheet.lastModified
        });
        
        // Show a sample of the saved data
        if (savedSheet.csvData) {
          // Handle different data formats (be liberal in reading back)
          let csvStringAny: any = savedSheet.csvData as any;
          if (typeof csvStringAny !== 'string') {
            console.log('⚠️ csvData is not a string, type:', typeof csvStringAny, 'value:', csvStringAny);
            if (Array.isArray(csvStringAny)) {
              csvStringAny = csvStringAny.map((row: any) => Array.isArray(row) ? row.join(',') : row).join('\n');
              console.log('🔄 Converted array to CSV string');
            } else {
              csvStringAny = JSON.stringify(csvStringAny);
              console.log('🔄 Converted object to JSON string');
            }
          }
          const savedLines = (csvStringAny as string).split('\n').slice(0, 3);
          console.log('📋 Saved CSV sample (first 3 lines):', savedLines);
        }
      } else {
        console.log('❌ Verification failed - Sheet not found in IndexedDB after save!');
        console.log('📋 Available sheets after save:', allSheets.map(s => s.name));
      }
      
      console.log('✅ === INDEXEDDB UPDATE PROCESS COMPLETED ===');
      
    } catch (error) {
      console.error('❌ Error updating IndexedDB with accepted changes:', error);
    }
    
    toast({
      title: "AI Updates Accepted",
      description: "All AI suggestions have been applied to the spreadsheet and saved to IndexedDB.",
      duration: 3000,
    });
  }, [dispatchWithHistory, state.activeSheetId]);

  const rejectAllAIUpdates = useCallback(async () => {
    dispatchWithHistory({ type: 'REJECT_ALL_AI_UPDATES' });
    
    // Clear localStorage changes since they've been rejected
    try {
      console.log('🧹 Clearing localStorage changes after rejecting AI updates...');
      const currentSheet = state.sheets.find(s => s.id === state.activeSheetId);
      if (currentSheet) {
        const fileName = currentSheet.name || `sheet-${currentSheet.id}`;
        const cleanName = fileName.replace(/[^a-zA-Z0-9\-_.]/g, '_').replace(/_{2,}/g, '_').toLowerCase();
        const sheetId = state.activeSheetId;
        
        // Clear new filename-based storage
        const newAIDiffData = localStorage.getItem('sheet_ai_diff_by_filename');
        if (newAIDiffData) {
          try {
            const parsed = JSON.parse(newAIDiffData);
            let updated = false;
            
            // Try to match by cleanName
            if (parsed[cleanName]) {
              console.log(`🗑️ Removing rejected changes for sheet "${fileName}" (key: ${cleanName})`);
              delete parsed[cleanName];
              updated = true;
            }
            
            // Also try to match by original fileName (in case it wasn't cleaned)
            if (parsed[fileName]) {
              console.log(`🗑️ Removing rejected changes for sheet "${fileName}" (original key)`);
              delete parsed[fileName];
              updated = true;
            }
            
            if (updated) {
              // If object is empty, remove the entire key, otherwise save it
              if (Object.keys(parsed).length === 0) {
                localStorage.removeItem('sheet_ai_diff_by_filename');
                console.log('🗑️ Removed empty sheet_ai_diff_by_filename key');
              } else {
                localStorage.setItem('sheet_ai_diff_by_filename', JSON.stringify(parsed));
              }
            }
          } catch (parseError) {
            console.error('❌ Error parsing sheet_ai_diff_by_filename:', parseError);
            // If parsing fails, remove the entire key
            localStorage.removeItem('sheet_ai_diff_by_filename');
            console.log('🗑️ Removed corrupted sheet_ai_diff_by_filename key');
          }
        }
        
        // Clear old sheet-ID-based storage for backward compatibility
        const oldAIDiffData = localStorage.getItem('sheet_specific_ai_diff');
        if (oldAIDiffData) {
          try {
            const parsed = JSON.parse(oldAIDiffData);
            let updated = false;
            
            // Try to match by sheet ID
            if (parsed[sheetId]) {
              console.log(`🗑️ Removing rejected changes for sheet ID ${sheetId} (legacy)`);
              delete parsed[sheetId];
              updated = true;
            }
            
            // Also try to match by sheet name (in case it was stored by name)
            if (parsed[fileName]) {
              console.log(`🗑️ Removing rejected changes for sheet name "${fileName}" (legacy)`);
              delete parsed[fileName];
              updated = true;
            }
            
            // Try to match by cleanName
            if (parsed[cleanName]) {
              console.log(`🗑️ Removing rejected changes for clean name "${cleanName}" (legacy)`);
              delete parsed[cleanName];
              updated = true;
            }
            
            if (updated) {
              // If object is empty, remove the entire key, otherwise save it
              if (Object.keys(parsed).length === 0) {
                localStorage.removeItem('sheet_specific_ai_diff');
                console.log('🗑️ Removed empty sheet_specific_ai_diff key');
              } else {
                localStorage.setItem('sheet_specific_ai_diff', JSON.stringify(parsed));
              }
            } else {
              // If no match found, check if we should remove the entire key anyway
              // (in case the structure is different than expected)
              console.log('⚠️ No matching entries found in sheet_specific_ai_diff, but key exists');
              console.log('🔍 Available keys:', Object.keys(parsed));
              console.log('🔍 Looking for:', { sheetId, fileName, cleanName });
              
              // If there's only one key and it doesn't match, it's likely for this sheet
              // Remove the entire key to be safe (user wants it cleared)
              const availableKeys = Object.keys(parsed);
              if (availableKeys.length === 1) {
                console.log('🗑️ Only one key found, removing entire sheet_specific_ai_diff key');
                localStorage.removeItem('sheet_specific_ai_diff');
              } else if (availableKeys.length === 0) {
                // Empty object, remove the key
                localStorage.removeItem('sheet_specific_ai_diff');
                console.log('🗑️ Empty object, removed sheet_specific_ai_diff key');
              } else {
                // Multiple keys - try to find any that might match (fuzzy match)
                const possibleMatch = availableKeys.find(key => 
                  key.includes(sheetId) || 
                  key.includes(fileName) || 
                  key.includes(cleanName) ||
                  fileName.includes(key) ||
                  sheetId.includes(key)
                );
                
                if (possibleMatch) {
                  console.log(`🗑️ Found fuzzy match "${possibleMatch}", removing it`);
                  delete parsed[possibleMatch];
                  if (Object.keys(parsed).length === 0) {
                    localStorage.removeItem('sheet_specific_ai_diff');
                  } else {
                    localStorage.setItem('sheet_specific_ai_diff', JSON.stringify(parsed));
                  }
                } else {
                  // No match found - user wants it cleared, so remove the entire key
                  console.log('🗑️ No match found, removing entire sheet_specific_ai_diff key as requested');
                  localStorage.removeItem('sheet_specific_ai_diff');
                }
              }
            }
          } catch (parseError) {
            console.error('❌ Error parsing sheet_specific_ai_diff:', parseError);
            // If parsing fails, remove the entire key
            localStorage.removeItem('sheet_specific_ai_diff');
            console.log('🗑️ Removed corrupted sheet_specific_ai_diff key');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error clearing localStorage:', error);
    }
    
    // Use unified change manager to clear rejected changes
    try {
      console.log('🔄 Using unified change manager to clear rejected changes...');
      const { unifiedChangeManager } = await import('@/lib/unifiedChangeManager');
      
      // Get the current sheet ID
      const currentSheetId = state.activeSheetId;
      if (!currentSheetId) {
        console.log('⚠️ No active sheet ID found');
        return;
      }
      
      // Clear all changes since they've been rejected
      await unifiedChangeManager.clearAllChanges(currentSheetId);
      console.log('✅ All changes cleared after rejection');
      
    } catch (error) {
      console.error('❌ Error clearing rejected changes with unified manager:', error);
      
      // Fallback to old method if unified manager fails
      try {
        console.log('🔄 Falling back to old change clearing method...');
        const { clearLocalStorageChanges } = await import('@/lib/localStorageToAIUpdates');
        const { clearPersistentAIDiffLog, clearAllPersistentAIDiffLogs } = await import('@/lib/aiChangeLogger');
        clearLocalStorageChanges();
        const activeSheet = state.sheets.find(s => s.id === state.activeSheetId);
        
        // Try to clear by sheet name
        if (activeSheet?.name) {
          clearPersistentAIDiffLog(activeSheet.name);
        }
        // Try to clear by sheet ID
        clearPersistentAIDiffLog(state.activeSheetId);
        
        // As a last resort, if the key still exists, remove it entirely
        const stillExists = localStorage.getItem('sheet_specific_ai_diff');
        if (stillExists) {
          console.log('⚠️ sheet_specific_ai_diff still exists after clearing, removing entire key');
          localStorage.removeItem('sheet_specific_ai_diff');
        }
        
        console.log('🧹 Cleared all AI change logs after rejection (fallback)');
      } catch (fallbackError) {
        console.error('❌ Fallback method also failed:', fallbackError);
        // Last resort: just remove the key entirely
        try {
          localStorage.removeItem('sheet_specific_ai_diff');
          localStorage.removeItem('sheet_ai_diff_by_filename');
          console.log('🗑️ Removed localStorage keys as last resort');
        } catch (removeError) {
          console.error('❌ Even last resort removal failed:', removeError);
        }
      }
    }
    
    toast({
      title: "AI Updates Rejected",
      description: "All AI suggestions have been discarded.",
      duration: 3000,
    });
  }, [dispatchWithHistory, state.activeSheetId]);

  // Column-level AI update functions
  const acceptColumnAIUpdates = useCallback(async (columnLetter: string) => {
    dispatchWithHistory({ type: 'ACCEPT_COLUMN_AI_UPDATES', columnLetter });
    
    // Also apply changes to IndexedDB CSV if available
    try {
      const { csvChangeManager } = await import('@/lib/csvChangeManager');
      const currentCSV = csvChangeManager.getCurrentCSV();
      if (currentCSV) {
        await csvChangeManager.applyChangesToCSV();
      }
    } catch (error) {
      console.error('❌ Error applying column changes to IndexedDB:', error);
    }
    
    toast({
      title: `Column ${columnLetter} Updates Accepted`,
      description: `All AI suggestions in column ${columnLetter} have been applied to the spreadsheet and CSV file.`,
      duration: 3000,
    });
  }, [dispatchWithHistory]);

  const rejectColumnAIUpdates = useCallback((columnLetter: string) => {
    dispatchWithHistory({ type: 'REJECT_COLUMN_AI_UPDATES', columnLetter });
    toast({
      title: `Column ${columnLetter} Updates Rejected`,
      description: `All AI suggestions in column ${columnLetter} have been discarded.`,
      duration: 3000,
    });
  }, [dispatchWithHistory]);

  // Row-level AI update functions
  const acceptRowAIUpdates = useCallback(async (rowNumber: number) => {
    dispatchWithHistory({ type: 'ACCEPT_ROW_AI_UPDATES', rowNumber });
    
    // Also apply changes to IndexedDB CSV if available
    try {
      const { csvChangeManager } = await import('@/lib/csvChangeManager');
      const currentCSV = csvChangeManager.getCurrentCSV();
      if (currentCSV) {
        await csvChangeManager.applyChangesToCSV();
      }
    } catch (error) {
      console.error('❌ Error applying row changes to IndexedDB:', error);
    }
    
    toast({
      title: `Row ${rowNumber} Updates Accepted`,
      description: `All AI suggestions in row ${rowNumber} have been applied to the spreadsheet and CSV file.`,
      duration: 3000,
    });
  }, [dispatchWithHistory]);

  const rejectRowAIUpdates = useCallback((rowNumber: number) => {
    dispatchWithHistory({ type: 'REJECT_ROW_AI_UPDATES', rowNumber });
    toast({
      title: `Row ${rowNumber} Updates Rejected`,
      description: `All AI suggestions in row ${rowNumber} have been discarded.`,
      duration: 3000,
    });
  }, [dispatchWithHistory]);


  const activeSheet = useMemo(() => {
    // Find the active sheet by ID
    const sheet = state.sheets.find(s => s.id === state.activeSheetId);
    // If not found, fall back to the first sheet
    // If no sheets exist, return undefined (shouldn't happen in normal operation)
    return sheet || state.sheets[0] || undefined;
  }, [state.sheets, state.activeSheetId]);

  return {
    state,
    activeSheet,
    addSheet,
    removeSheet,
    setActiveSheet,
    updateCell,
    formatCells,
    toggleMode,
    toggleTheme,
    addChart,
    updateChart,
    removeChart,
    loadCSVData,
    addSheetFromCSV,
    addPredefinedSheet,
    addMoreRows,
    bulkUpdateCells,
    updateExistingSheet,
    // AI Update methods
    createAIUpdates,
    acceptAIUpdate,
    rejectAIUpdate,
    acceptAllAIUpdates,
    rejectAllAIUpdates,
    acceptColumnAIUpdates,
    rejectColumnAIUpdates,
    acceptRowAIUpdates,
    rejectRowAIUpdates,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
};

export default useSpreadsheet;
