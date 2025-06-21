import { useReducer, useCallback, useMemo, useState } from 'react';
import { SpreadsheetState, SheetData, Cell, Chart, CellStyle } from '@/types/spreadsheet';
import { produce } from 'immer';

const createEmptySheet = (id: string, name: string): SheetData => ({
  id,
  name,
  cells: {},
  rowCount: 100,
  colCount: 26,
});

const createMockSheet = (id: string, name: string): SheetData => {
  const cells: Record<string, Cell> = {};
  
  // Enhanced headers with ostrich-inspired styling
  cells['A1'] = { value: 'Product Category', style: { bold: true, backgroundColor: '#fef3c7', textColor: '#92400e' } };
  cells['B1'] = { value: 'Sales Revenue', style: { bold: true, backgroundColor: '#fef3c7', textColor: '#92400e' } };
  cells['C1'] = { value: 'Quarter', style: { bold: true, backgroundColor: '#fef3c7', textColor: '#92400e' } };
  cells['D1'] = { value: 'Region', style: { bold: true, backgroundColor: '#fef3c7', textColor: '#92400e' } };
  cells['E1'] = { value: 'Units Sold', style: { bold: true, backgroundColor: '#fef3c7', textColor: '#92400e' } };
  cells['F1'] = { value: 'Profit Margin', style: { bold: true, backgroundColor: '#fef3c7', textColor: '#92400e' } };
  
  // Realistic business data
  const products = [
    'Electronics', 'Clothing', 'Home & Garden', 'Sports Equipment', 
    'Books & Media', 'Automotive', 'Health & Beauty', 'Toys & Games',
    'Food & Beverages', 'Office Supplies', 'Pet Supplies', 'Jewelry',
    'Musical Instruments', 'Arts & Crafts', 'Travel Accessories'
  ];
  
  const regions = ['North America', 'Europe', 'Asia Pacific', 'South America', 'Middle East'];
  const quarters = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'];
  
  for (let i = 0; i < 30; i++) {
    const row = i + 2;
    const unitsSold = Math.floor(Math.random() * 2000) + 500;
    const pricePerUnit = Math.floor(Math.random() * 200) + 50;
    const salesRevenue = unitsSold * pricePerUnit;
    const profitMargin = (15 + Math.random() * 25).toFixed(1); // 15-40% profit margin
    
    cells[`A${row}`] = { value: products[i % products.length] };
    cells[`B${row}`] = { value: salesRevenue };
    cells[`C${row}`] = { value: quarters[i % quarters.length] };
    cells[`D${row}`] = { value: regions[i % regions.length] };
    cells[`E${row}`] = { value: unitsSold };
    cells[`F${row}`] = { value: `${profitMargin}%` };
  }
  
  // Add some summary rows with formulas
  cells['A32'] = { value: 'TOTAL', style: { bold: true, backgroundColor: '#fed7aa', textColor: '#9a3412' } };
  cells['B32'] = { value: '=SUM(B2:B31)', style: { bold: true, backgroundColor: '#fed7aa', textColor: '#9a3412' } };
  cells['E32'] = { value: '=SUM(E2:E31)', style: { bold: true, backgroundColor: '#fed7aa', textColor: '#9a3412' } };
  
  cells['A33'] = { value: 'AVERAGE', style: { bold: true, backgroundColor: '#fed7aa', textColor: '#9a3412' } };
  cells['B33'] = { value: '=AVERAGE(B2:B31)', style: { bold: true, backgroundColor: '#fed7aa', textColor: '#9a3412' } };
  cells['E33'] = { value: '=AVERAGE(E2:E31)', style: { bold: true, backgroundColor: '#fed7aa', textColor: '#9a3412' } };
  
  return {
    id,
    name,
    cells,
    rowCount: 100,
    colCount: 26,
  };
};

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
        const sheet = draft.sheets.find(s => s.id === draft.activeSheetId);
        if (sheet) {
          if (!sheet.cells[action.cellId]) {
            sheet.cells[action.cellId] = { value: action.value };
          } else {
            sheet.cells[action.cellId].value = action.value;
          }
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
      default:
        break;
    }
  });
};

export const useSpreadsheet = () => {
  const [state, dispatch] = useReducer(
    spreadsheetReducer,
    undefined,
    () => ({
      sheets: [createMockSheet('sheet-1', 'Sales Data 2024')],
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
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newState);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
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
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      dispatch({ type: '__SET_STATE__', payload: history[historyIndex - 1] });
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      dispatch({ type: '__SET_STATE__', payload: history[historyIndex + 1] });
    }
  }, [history, historyIndex]);

  // Patch reducer to handle __SET_STATE__
  const patchedReducer = (state, action) => {
    if (action.type === '__SET_STATE__') return action.payload;
    return spreadsheetReducer(state, action);
  };

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
    dispatchWithHistory({ type: 'UPDATE_CELL', cellId, value });
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
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
};
