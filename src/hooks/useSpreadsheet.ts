import { useReducer, useCallback, useMemo, useState } from 'react';
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
        const newId = `sheet-${state.sheets.length + 1}`;
        const newSheet = createEmptySheet(newId, `Sheet ${state.sheets.length + 1}`);
        draft.sheets.push(newSheet);
        draft.activeSheetId = newId;
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
            sheet.cells[action.cellId].value = action.value;
          }
          // Force a new reference for the sheet object in the array
          draft.sheets[sheetIndex] = { ...sheet };
        }
        break;
      }
      case 'FORMAT_CELLS': {
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          action.cellIds.forEach((cellId: string) => {
            if (!sheet.cells[cellId]) {
              sheet.cells[cellId] = { value: '' };
            }
            sheet.cells[cellId].style = {
              ...sheet.cells[cellId].style,
              ...action.style,
            };
          });
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
              cells[cellId] = { value: cellValue };
            });
          });
          sheet.cells = cells;
        }
        break;
      }
      case 'ADD_SHEET_FROM_CSV': {
        const newId = `sheet-${state.sheets.length + 1}`;
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
          name: action.name || `Sheet ${state.sheets.length + 1}`,
          cells,
          rowCount: Math.max(1000, action.csvData.length),
          colCount: Math.max(26, action.csvData[0]?.length || 0),
        };
        draft.sheets.push(newSheet);
        draft.activeSheetId = newId;
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
              sheet.cells[cellId].value = value;
            }
          });
        }
        break;
      }
      case 'CREATE_AI_UPDATES': {
        // Create AI updates without applying them immediately
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          // Backup original state if not already backed up
          if (!draft.originalSheets) {
            draft.originalSheets = JSON.parse(JSON.stringify(draft.sheets));
          }
          
          action.updates.forEach((update: AIUpdate) => {
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
          
          draft.hasAIUpdates = true;
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
            draft.originalSheets = undefined; // Clear backup
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
            draft.originalSheets = undefined; // Clear backup
          }
        }
        break;
      }
      case 'ACCEPT_ALL_AI_UPDATES': {
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          Object.keys(sheet.cells).forEach(cellId => {
            const cell = sheet.cells[cellId];
            if (cell.hasAIUpdate && cell.aiValue !== undefined) {
              cell.value = cell.aiValue;
              cell.hasAIUpdate = false;
              cell.aiValue = undefined;
              cell.aiUpdateTimestamp = undefined;
            }
          });
          draft.hasAIUpdates = false;
          draft.originalSheets = undefined; // Clear backup
        }
        break;
      }
      case 'REJECT_ALL_AI_UPDATES': {
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          Object.keys(sheet.cells).forEach(cellId => {
            const cell = sheet.cells[cellId];
            if (cell.hasAIUpdate) {
              cell.hasAIUpdate = false;
              cell.aiValue = undefined;
              cell.aiUpdateTimestamp = undefined;
            }
          });
          draft.hasAIUpdates = false;
          draft.originalSheets = undefined; // Clear backup
        }
        break;
      }
      case 'RESTORE_ORIGINAL_STATE': {
        if (draft.originalSheets) {
          draft.sheets = JSON.parse(JSON.stringify(draft.originalSheets));
          draft.hasAIUpdates = false;
          draft.originalSheets = undefined;
        }
        break;
      }
      default:
        break;
    }
  });
};

export const useSpreadsheet = () => {
  // Patch reducer to handle __SET_STATE__
  const patchedReducer = (state: SpreadsheetState, action: any): SpreadsheetState => {
    if (action.type === '__SET_STATE__') return action.payload;
    return spreadsheetReducer(state, action);
  };

  const [state, dispatch] = useReducer(
    patchedReducer,
    undefined,
    () => ({
      sheets: [createEmptySheet('sheet-1', 'Sheet 1')],
      activeSheetId: 'sheet-1',
      charts: [],
      isAIMode: true,
      isDarkMode: false,
    })
  );

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
    dispatchWithHistory({ type: 'FORMAT_CELLS', cellIds, style });
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

  // AI Update handlers
  const createAIUpdates = useCallback((updates: AIUpdate[]) => {
    dispatchWithHistory({ type: 'CREATE_AI_UPDATES', updates });
  }, [dispatchWithHistory]);

  const acceptAIUpdate = useCallback((cellId: string) => {
    dispatchWithHistory({ type: 'ACCEPT_AI_UPDATE', cellId });
  }, [dispatchWithHistory]);

  const rejectAIUpdate = useCallback((cellId: string) => {
    dispatchWithHistory({ type: 'REJECT_AI_UPDATE', cellId });
  }, [dispatchWithHistory]);

  const acceptAllAIUpdates = useCallback(() => {
    dispatchWithHistory({ type: 'ACCEPT_ALL_AI_UPDATES' });
    toast({
      title: "AI Updates Accepted",
      description: "All AI suggestions have been applied to the spreadsheet.",
      duration: 3000,
    });
  }, [dispatchWithHistory]);

  const rejectAllAIUpdates = useCallback(() => {
    dispatchWithHistory({ type: 'REJECT_ALL_AI_UPDATES' });
    toast({
      title: "AI Updates Rejected",
      description: "All AI suggestions have been discarded.",
      duration: 3000,
    });
  }, [dispatchWithHistory]);

  const restoreOriginalState = useCallback(() => {
    dispatchWithHistory({ type: 'RESTORE_ORIGINAL_STATE' });
    toast({
      title: "State Restored",
      description: "Spreadsheet has been restored to its original state.",
      duration: 3000,
    });
  }, [dispatchWithHistory]);

  const activeSheet = useMemo(() => 
    state.sheets.find(s => s.id === state.activeSheetId),
    [state.sheets, state.activeSheetId]
  );

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
    addMoreRows,
    bulkUpdateCells,
    // AI Update methods
    createAIUpdates,
    acceptAIUpdate,
    rejectAIUpdate,
    acceptAllAIUpdates,
    rejectAllAIUpdates,
    restoreOriginalState,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
};
