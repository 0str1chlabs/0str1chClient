import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// Add custom CSS for fade-in-up animation
const fadeInUpStyle = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-fade-in-up {
    animation: fadeInUp 1s ease-in-out;
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = fadeInUpStyle;
  document.head.appendChild(style);
}
import { Button } from '@/components/ui/button';
import { AIAssistant } from '@/components/AIAssistant';
import { MovableToolbar } from '@/components/MovableToolbar';
import { ModernSpreadsheet } from '@/components/ModernSpreadsheet';
import { PivotTableModal } from '@/components/PivotTableModal';
import { CellComparisonTooltip, ColumnAITooltip, RowAITooltip, SheetAIControl } from '@/components/CellComparisonTooltip';
import { InfiniteCanvas } from '@/components/InfiniteCanvas';
import { StatisticalSummary } from '@/components/StatisticalSummary';

import { AIReportGenerator } from '@/components/AIReportGenerator';
import { useAuth } from '@/components/auth/AuthContext';
import { SheetData } from '@/types/spreadsheet';
import { Upload, Plus, X, BarChart3, MessageCircle, ZoomIn, ZoomOut, RotateCcw, LayoutGrid, LoaderCircle, Database, Brain } from 'lucide-react';
import { useDuckDBUpdates } from '@/hooks/useDuckDBUpdates';
import { createDebouncedSelectionUpdater, SelectionPerformanceMonitor } from '@/lib/cellSelectionUtils';
import { useSpreadsheet } from '@/hooks/useSpreadsheet';
import MegaApiService from '../services/megaApiService';


const Index: React.FC = () => {
  const { user, logout } = useAuth();
  
  // Use the new spreadsheet hook with dual-state system
  const {
    state,
    activeSheet,
    updateCell,
    bulkUpdateCells,
    createAIUpdates,
    acceptAIUpdate,
    rejectAIUpdate,
    acceptAllAIUpdates,
    rejectAllAIUpdates,
    acceptColumnAIUpdates,
    rejectColumnAIUpdates,
    acceptRowAIUpdates,
    rejectRowAIUpdates,
    restoreOriginalState,
    addSheet,
    addSheetFromCSV,
    removeSheet,
    setActiveSheet,
    addMoreRows,
    updateExistingSheet,
      undo,
    redo,
    canUndo,
    canRedo
  } = useSpreadsheet();
  
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [isAIMinimized, setIsAIMinimized] = useState(false);
  const [showPivotTable, setShowPivotTable] = useState(false);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [lastModifiedDate, setLastModifiedDate] = useState(null);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [showAIReportGenerator, setShowAIReportGenerator] = useState(false);

  // Column/Row AI Update Tooltip state
  const [columnTooltip, setColumnTooltip] = useState<{
    visible: boolean;
    columnLetter: string;
    updateCount: number;
    position: { x: number; y: number };
  }>({ visible: false, columnLetter: '', updateCount: 0, position: { x: 0, y: 0 } });

  const [rowTooltip, setRowTooltip] = useState<{
    visible: boolean;
    rowNumber: number;
    updateCount: number;
    position: { x: number; y: number };
  }>({ visible: false, rowNumber: 0, updateCount: 0, position: { x: 0, y: 0 } });
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const canvasRef = useRef<any>(null);
  const [embeddedCharts, setEmbeddedCharts] = useState<Array<{
    id: string;
    type: string;
    data: any;
    chartSpec: any;
    position: { x: number; y: number };
    size: { width: number; height: number };
  }>>([]);

  // State to track CSV processing and upload flag
  const [isProcessingCSV, setIsProcessingCSV] = useState(false);
  const [csvUploaded, setCsvUploaded] = useState(false);

  // Loading state management
  const [isCheckingMegaData, setIsCheckingMegaData] = useState(true);
  const [hasCheckedMegaData, setHasCheckedMegaData] = useState(false);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Sheet cache management (max 3 sheets on client side)
  const [sheetCache, setSheetCache] = useState<Map<string, any>>(new Map());
  const [cacheTimestamps, setCacheTimestamps] = useState<Map<string, number>>(new Map());
  const MAX_CACHE_SIZE = 3;

  // MEGA storage state


  // Hook for efficient DuckDB updates
  const { updateCell: updateDuckDBCell, batchUpdateCells: batchUpdateDuckDBCells } = useDuckDBUpdates();

  // Performance monitoring for selections
  const performanceMonitor = useRef(new SelectionPerformanceMonitor());
  
  // Debounced selection updater to prevent excessive re-renders
  const debouncedSelectionUpdater = useRef(
    createDebouncedSelectionUpdater((selection: string[]) => {
      const stopTimer = performanceMonitor.current.startTimer('selection-update');
      setSelectedCells(selection);
      stopTimer();
    }, 16) // 60fps
  );

  // Sync activeSheetIndex with hook's activeSheetId when sheets change
  useEffect(() => {
    const activeSheetInHook = state.sheets.find(s => s.id === state.activeSheetId);
    if (activeSheetInHook) {
      const index = state.sheets.findIndex(s => s.id === state.activeSheetId);
      if (index !== activeSheetIndex) {
        setActiveSheetIndex(index);
      }
    }
  }, [state.sheets, state.activeSheetId]); // Removed activeSheetIndex from dependencies to prevent infinite loop

  // Loading state management
  const [isProcessingSchema, setIsProcessingSchema] = useState(false);
  const [isSchemaReady, setIsSchemaReady] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Animated loading messages - different sets for different stages
  const initialLoadingMessages = [
    'Ostrich is running...',
    'Ostrich is sprinting...',
    'Ostrich is accelerating...',
    'Ostrich is powering through...',
    'Ostrich is charging ahead...'
  ];

  const schemaProcessingMessages = [
    'Ostrich is analyzing your data...',
    'Ostrich is generating insights...',
    'Ostrich is preparing AI analysis...',
    'Ostrich is optimizing performance...',
    'Ostrich is ready to assist...'
  ];

  // Choose message set based on current state
  const loadingMessages = isProcessingSchema ? schemaProcessingMessages : initialLoadingMessages;

  // Animate loading messages with slower transitions
  useEffect(() => {
    if (isLoadingSheets || isCheckingMegaData || isProcessingSchema) {
      const interval = setInterval(() => {
        setCurrentMessageIndex(prev => (prev + 1) % loadingMessages.length);
      }, 2000); // Change message every 2 seconds (slower)

      return () => clearInterval(interval);
    } else {
      // Reset message index when not loading
      setCurrentMessageIndex(0);
    }
  }, [isLoadingSheets, isCheckingMegaData, isProcessingSchema, loadingMessages.length]);

  // Monitor AI Assistant processing state
  useEffect(() => {
    // Listen for schema processing events from AI Assistant
    const handleSchemaProcessing = (event: CustomEvent) => {
      const { processing, ready } = event.detail;
      setIsProcessingSchema(processing);
      setIsSchemaReady(ready);

      // If schema is ready, clear all loading states
      if (ready) {
        setIsCheckingMegaData(false);
        setIsLoadingSheets(false);
        setIsProcessingSchema(false);
      }
    };

    // Listen for DuckDB processing events
    const handleDuckDBProcessing = (event: CustomEvent) => {
      setIsProcessingSchema(event.detail.processing);
    };

    window.addEventListener('schemaProcessing' as any, handleSchemaProcessing);
    window.addEventListener('duckdbProcessing' as any, handleDuckDBProcessing);

    return () => {
      window.removeEventListener('schemaProcessing' as any, handleSchemaProcessing);
      window.removeEventListener('duckdbProcessing' as any, handleDuckDBProcessing);
    };
  }, []);

  // Check for existing sheet data in MEGA cloud storage on page load
  useEffect(() => {
    const checkExistingSheetData = async () => {
      setIsCheckingMegaData(true);
      setIsLoadingSheets(true);

      if (user?.email) {
        try {
          console.log('🔍 Checking for existing sheet data in MEGA cloud storage...');

          // Check MEGA service status via backend
          const megaStatus = await MegaApiService.checkMegaStatus();
          if (!megaStatus.success) {
            console.log('🔐 MEGA service not available');
            setIsCheckingMegaData(false);
            setHasCheckedMegaData(true);
            setIsLoadingSheets(false);
            return;
          }

          const result = await MegaApiService.checkUserSheetData(user.email);

          if (result.success && result.hasData) {
            console.log('📊 Found existing sheet data in MEGA cloud:', result.data);
            console.log('🎯 Loading only the most recent sheet for optimal startup performance...');

            // Load existing data directly without confirmation
            await loadExistingSheetData(user.email);
          } else {
            console.log('📭 No existing sheet data found for user in MEGA cloud');
            console.log('📄 Starting with empty sheet - user can load sheets via "+" tab when needed');
          }
        } catch (error) {
          console.error('❌ Error checking for existing sheet data:', error);
        }
      } else {
        // No user logged in, show empty sheet
        setIsCheckingMegaData(false);
        setHasCheckedMegaData(true);
        setIsLoadingSheets(false);
      }

      setIsCheckingMegaData(false);
      setHasCheckedMegaData(true);
      setIsLoadingSheets(false);
    };

    checkExistingSheetData();
  }, [user?.email]);

  // Add global click handler to deselect cells when clicking on sheet/canvas area
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is on a spreadsheet cell (should NOT deselect - cell selection will handle this)
      const isOnSpreadsheetCell = target.closest('.spreadsheet-cell') ||
                                  target.closest('.cell-input');
      
      // Check if click is on elements that should NOT deselect cells (preserve selection)
      const isOnUIElement = target.closest('.ai-assistant') ||
                            target.closest('.ai-chatbot') ||
                            target.closest('[data-ai-component]') ||
                            target.closest('[data-ai-chatbox]') ||
                            target.closest('.movable-toolbar') ||
                            target.closest('.toolbar-component') ||
                            target.closest('.statistical-summary') ||
                            target.closest('.MuiMenu-root') ||
                            target.closest('.MuiMenuItem-root') ||
                            target.closest('[role="menu"]') ||
                            target.closest('[role="menuitem"]') ||
                            target.closest('.embedded-chart') || // Embedded charts on canvas
                            target.closest('.chart-renderer') || // Chart components
                            target.tagName === 'INPUT' ||
                            target.tagName === 'TEXTAREA' ||
                            target.closest('input') ||
                            target.closest('textarea') ||
                            target.closest('.no-drag') ||
                            target.closest('button') ||
                            target.closest('.card') ||
                            target.closest('.dialog') ||
                            target.closest('.modal');
      
      // Check if click is on sheet/canvas background areas (should deselect)
      const isOnSheetBackground = target.closest('.modern-spreadsheet') && !isOnSpreadsheetCell;
      const isOnCanvasBackground = target.closest('.infinite-canvas') && !target.closest('.react-draggable');
      const isSpreadsheet = target.closest('.z-10 react-draggable');
      // Also check for main canvas container clicks (empty areas)
      const isOnMainCanvasArea = !isOnUIElement && !isOnSpreadsheetCell && 
                                 (target.classList.contains('main-canvas-area') || 
                                  target.closest('.main-canvas-area'));
      
      // Only deselect if clicking on sheet/canvas background, not on cells or UI elements
      if (( isOnCanvasBackground ) && selectedCells.length > 0) {
        console.log('Clicked on sheet/canvas background - deselecting cells');
        // Use debounced updater for better performance
        debouncedSelectionUpdater.current([]);
      }
    };

    // Add event listener to document with capture phase to handle it early
    document.addEventListener('click', handleGlobalClick, true);

    // Cleanup
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [selectedCells]);

  // Function to manually trigger full DuckDB reload
  const triggerDuckDBReload = useCallback(async () => {
    if (!activeSheet) return;
    
    try {
      // Import the DuckDB utilities
      const { loadSheetToDuckDB } = await import('@/lib/utils');
      
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
      
      // Create data rows
      for (let row = 2; row <= rowCount; row++) {
        const dataRow: string[] = [];
        for (let col = 0; col < colCount; col++) {
          const colLetter = String.fromCharCode(65 + col);
          const cellId = `${colLetter}${row}`;
          const cell = activeSheet.cells[cellId];
          const cellValue = cell && cell.value !== undefined ? String(cell.value) : '';
          dataRow.push(cellValue);
        }
        sheetData.push(dataRow);
      }
      
      // Load data into DuckDB
      await loadSheetToDuckDB('sheet_data', sheetData);
      console.log('Manual DuckDB reload completed');
    } catch (error) {
      console.error('Error in manual DuckDB reload:', error);
    }
      }, [activeSheet]);

  // Function to reset CSV upload flag after DuckDB reload
  const resetCsvUploadFlag = useCallback(() => {
    setCsvUploaded(false);
    setIsProcessingCSV(false);
  }, []);

  // Initialize first sheet - start completely empty
  useEffect(() => {
    if (state.sheets.length > 0 && Object.keys(state.sheets[0].cells).length === 0) {
      // Keep the sheet completely empty - no pre-created cells
      // Cells will be created dynamically as users type
      // This is now handled by the useSpreadsheet hook
    }
  }, []); // Empty dependency array - only run once on mount

  // Initial sheet positioning effect
  useEffect(() => {
    // Wait for DOM to be ready
    const timer = setTimeout(() => {
      const sheetContainer = document.getElementById('spreadsheet-container') as HTMLElement;
      if (sheetContainer) {
        // Set initial positioning based on toolbar and header
        const toolbar = document.querySelector('.movable-toolbar') as HTMLElement;
        const header = document.querySelector('header') as HTMLElement;
        
        const leftGap = 20;
        const topGap = header ? header.offsetHeight + 20 : 100;
        const toolbarWidth = toolbar ? toolbar.offsetWidth : 200;
        
        const sheetStartX = leftGap + toolbarWidth + 20;
        const sheetStartY = topGap;
        
        sheetContainer.style.left = `${sheetStartX}px`;
        sheetContainer.style.top = `${sheetStartY}px`;
        sheetContainer.style.right = '20px';
        sheetContainer.style.bottom = '20px';
        
        console.log('Initial sheet positioning:', { left: sheetStartX, top: sheetStartY });
      }
    }, 100); // Small delay to ensure DOM elements are rendered
    
    return () => clearTimeout(timer);
  }, []); // Empty dependency array - only run once on mount

  const handleUpdateCell = useCallback(async (cellId: string, value: string | number) => {
    // Update local state immediately using the new hook
    updateCell(cellId, value);

    // Skip individual DuckDB updates for now - they will be handled on next full reload
    // This keeps things simple and avoids the rowid() error
    console.log(`Cell ${cellId} updated locally - DuckDB will be updated on next full reload`);
  }, [updateCell]);

  const handleBulkUpdateCells = useCallback(async (updates: { cellId: string, value: any }[]) => {
    // Update local state immediately using the new hook
    bulkUpdateCells(updates);

    // Skip DuckDB batch updates for now - they will be handled on next full reload
    console.log(`${updates.length} cells updated locally - DuckDB will be updated on next full reload`);
  }, [bulkUpdateCells]);

  // Sheet cache management functions
  const updateSheetCache = useCallback((sheetId: string, sheetData: any) => {
    setSheetCache(prev => {
      const newCache = new Map(prev);
      newCache.set(sheetId, sheetData);
      return newCache;
    });

    // Update timestamp for LRU tracking
    setCacheTimestamps(prev => {
      const newTimestamps = new Map(prev);
      newTimestamps.set(sheetId, Date.now());
      return newTimestamps;
    });

    // Implement LRU eviction if cache exceeds max size
    if (sheetCache.size >= MAX_CACHE_SIZE) {
      const sortedTimestamps = Array.from(cacheTimestamps.entries())
        .sort(([,a], [,b]) => a - b); // Sort by timestamp (oldest first)

      if (sortedTimestamps.length > 0) {
        const oldestSheetId = sortedTimestamps[0][0];
        console.log(`🗑️ Evicting sheet ${oldestSheetId} from cache (LRU)`);

        setSheetCache(prev => {
          const newCache = new Map(prev);
          newCache.delete(oldestSheetId);
          return newCache;
        });

        setCacheTimestamps(prev => {
          const newTimestamps = new Map(prev);
          newTimestamps.delete(oldestSheetId);
          return newTimestamps;
        });
      }
    }
  }, [sheetCache.size, cacheTimestamps, MAX_CACHE_SIZE]);

  const getSheetFromCache = useCallback((sheetId: string) => {
    return sheetCache.get(sheetId);
  }, [sheetCache]);

  // Helper functions for bulk AI update operations
  const getColumnAIUpdateCount = useCallback((columnLetter: string) => {
    if (!activeSheet) return 0;
    return Object.entries(activeSheet.cells).filter(([cellId, cell]) =>
      cellId.startsWith(columnLetter) && cell.hasAIUpdate
    ).length;
  }, [activeSheet]);

  const getRowAIUpdateCount = useCallback((rowNumber: number) => {
    if (!activeSheet) return 0;
    const rowRegex = new RegExp(`${rowNumber}$`);
    return Object.entries(activeSheet.cells).filter(([cellId, cell]) =>
      rowRegex.test(cellId) && cell.hasAIUpdate
    ).length;
  }, [activeSheet]);

  const getTotalAIUpdateCount = useCallback(() => {
    if (!activeSheet) return 0;
    return Object.values(activeSheet.cells).filter(cell => cell.hasAIUpdate).length;
  }, [activeSheet]);

  // Column tooltip handlers
  const handleColumnHover = useCallback((columnLetter: string, position: { x: number; y: number }) => {
    const updateCount = getColumnAIUpdateCount(columnLetter);
    if (updateCount > 0) {
      setColumnTooltip({
        visible: true,
        columnLetter,
        updateCount,
        position
      });
    }
  }, [getColumnAIUpdateCount]);

  const handleColumnLeave = useCallback(() => {
    setColumnTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  // Row tooltip handlers
  const handleRowHover = useCallback((rowNumber: number, position: { x: number; y: number }) => {
    const updateCount = getRowAIUpdateCount(rowNumber);
    if (updateCount > 0) {
      setRowTooltip({
        visible: true,
        rowNumber,
        updateCount,
        position
      });
    }
  }, [getRowAIUpdateCount]);

  const handleRowLeave = useCallback(() => {
    setRowTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  const handleSheetSelection = useCallback(async (selectedSheet) => {
    try {
      setIsLoadingSheets(true);
      console.log(`📂 Loading sheet from cloud: ${selectedSheet.fileName}`);

      const result = await MegaApiService.retrieveSheetData(user?.email, selectedSheet.fileName);

      if (result.success && result.data?.sheetData) {
        const { sheetData } = result.data;
        const fileName = result.data.fileName || selectedSheet.fileName; // Use backend fileName or fallback to original

        // Convert sheet data to CSV format for addSheetFromCSV
        const csvData: string[][] = [];
        const { colCount, rowCount } = sheetData;

        // Create header row
        const headerRow: string[] = [];
        for (let col = 0; col < colCount; col++) {
          const colLetter = String.fromCharCode(65 + col);
          const cellId = `${colLetter}1`;
          const cell = sheetData.cells[cellId];
          const headerValue = cell && cell.value ? String(cell.value) : colLetter;
          headerRow.push(headerValue);
        }
        csvData.push(headerRow);

        // Create data rows
        for (let row = 2; row <= rowCount; row++) {
          const dataRow: string[] = [];
          for (let col = 0; col < colCount; col++) {
            const colLetter = String.fromCharCode(65 + col);
            const cellId = `${colLetter}${row}`;
            const cell = sheetData.cells[cellId];
            const cellValue = cell && cell.value !== undefined ? String(cell.value) : '';
            dataRow.push(cellValue);
          }
          csvData.push(dataRow);
        }

        // Ensure fileName is valid before using
        if (!fileName) {
          console.error('❌ Invalid fileName received from backend, using fallback');
          setShowSheetSelector(false);
          return;
        }

        // Add the sheet using the hook method
        addSheetFromCSV(csvData, fileName.replace('.csv.gz', ''));

        // Cache the sheet data (using the current active sheet ID)
        if (state.activeSheetId) {
          updateSheetCache(state.activeSheetId, sheetData);
        }

        console.log(`✅ Loaded and cached sheet: ${fileName}`);
        setShowSheetSelector(false);

        // Trigger DuckDB reload
        setCsvUploaded(true);
      } else {
        console.error(`❌ Failed to load sheet data for ${selectedSheet.fileName}:`, result.message);
      }
    } catch (error) {
      console.error(`❌ Error loading sheet ${selectedSheet.fileName}:`, error);
    } finally {
      setIsLoadingSheets(false);
    }
  }, [user?.email, addSheetFromCSV, updateSheetCache]);

  const handleAddSheet = useCallback(() => {
    // Check if there are unloaded sheets from storage that we haven't loaded yet
    const loadedSheetNames = state.sheets.map(sheet => sheet.name.toLowerCase());
    const unloadedSheets = availableSheets.filter(sheet => {
      const cleanName = sheet.fileName.replace(/\.(csv|gz|csv\.gz)$/i, '').toLowerCase();
      return !loadedSheetNames.includes(cleanName);
    });

    if (unloadedSheets.length > 0) {
      // Show sheet selector modal for unloaded sheets
      console.log(`📋 Found ${unloadedSheets.length} unloaded sheets, showing selector modal`);
      setShowSheetSelector(true);
    } else {
      // No unloaded sheets, create new empty sheet
      console.log('📄 No unloaded sheets, creating new empty sheet');
      addSheet();
    }
  }, [addSheet, state.sheets, availableSheets]);

  const handleTabSwitch = useCallback((index: number) => {
    // Bounds checking
    if (index >= 0 && index < state.sheets.length) {
      const targetSheet = state.sheets[index];
      if (targetSheet) {
        // Update both local state and hook state
        setActiveSheetIndex(index);
        setActiveSheet(targetSheet.id);

        // Update cache timestamp for LRU tracking
        setCacheTimestamps(prev => {
          const newTimestamps = new Map(prev);
          newTimestamps.set(targetSheet.id, Date.now());
          return newTimestamps;
        });

        console.log(`🔄 Switched to sheet: ${targetSheet.name} (index: ${index})`);
      }
    }
  }, [state.sheets, setActiveSheet]);

  const handleRemoveSheet = useCallback((index: number) => {
    if (state.sheets.length > 1) {
      const sheetToRemove = state.sheets[index];
      removeSheet(sheetToRemove.id);

      // Calculate new active index after removal
      let newActiveIndex = activeSheetIndex;
      if (activeSheetIndex >= index && activeSheetIndex > 0) {
        newActiveIndex = activeSheetIndex - 1;
      } else if (activeSheetIndex === index && index === 0) {
        newActiveIndex = 0;
      }

      // Update both local state and hook state
      setActiveSheetIndex(newActiveIndex);
      if (state.sheets[newActiveIndex]) {
        setActiveSheet(state.sheets[newActiveIndex].id);
      }
    }
  }, [state.sheets, activeSheetIndex, removeSheet, setActiveSheet]);

  const handleSheetNameChange = useCallback((index: number, newName: string) => {
    // This would need to be implemented in the useSpreadsheet hook
    // For now, we'll keep the old implementation
    console.log(`Sheet name change not yet implemented in new system: ${newName}`);
  }, []);

  const handleUploadCSV = useCallback(() => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const csv = event.target?.result as string;
          const lines = csv.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const dataRows = lines.slice(1).filter(line => line.trim());
          
          // Create cells for all data
          const cells: { [key: string]: { value: string } } = {};
          
          // Add headers
          headers.forEach((header, colIndex) => {
            const colLetter = String.fromCharCode(65 + colIndex);
            cells[`${colLetter}1`] = { value: header };
          });
          
          // Add data rows
          dataRows.forEach((line, rowIndex) => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            values.forEach((value, colIndex) => {
              const colLetter = String.fromCharCode(65 + colIndex);
              const row = rowIndex + 2; // Start from row 2 (after headers)
              cells[`${colLetter}${row}`] = { value };
            });
          });
          
          // Fill empty cells for complete coverage
          const maxRow = dataRows.length + 1;
          const maxCol = Math.max(headers.length, 26); // At least 26 columns (A-Z)
          
          for (let row = 1; row <= maxRow; row++) {
            for (let col = 0; col < maxCol; col++) {
              const colLetter = String.fromCharCode(65 + col);
              const cellId = `${colLetter}${row}`;
              if (!cells[cellId]) {
                cells[cellId] = { value: '' };
              }
            }
          }
          
          // Update the active sheet with CSV data using the new hook
          const updates = Object.entries(cells).map(([cellId, cell]) => ({
            cellId,
            value: cell.value
          }));
          bulkUpdateCells(updates);

          // Store compressed sheet data in MEGA cloud storage
          if (user?.email) {
            try {
              // Check MEGA service status via backend
              const megaStatus = await MegaApiService.checkMegaStatus();
              if (!megaStatus.success) {
                console.log('🔐 MEGA service not available');
                return;
              }
              
              console.log('🔄 Storing compressed sheet data via backend MEGA API...');
              
              const metadata = {
                totalRows: dataRows.length,
                totalColumns: headers.length,
                headers: headers,
                dataTypes: headers.map(header => {
                  const sampleValues = dataRows.slice(0, 10).map(row => {
                    const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
                    const colIndex = headers.indexOf(header);
                    return values[colIndex] || '';
                  }).filter(v => v !== '');
                  
                  const hasNumbers = sampleValues.some(v => !isNaN(Number(v)) && v !== '');
                  const hasDates = sampleValues.some(v => !isNaN(Date.parse(v)) && v !== '');
                  
                  if (hasNumbers && !hasDates) return 'numeric';
                  if (hasDates) return 'date';
                  return 'text';
                })
              };

              const result = await MegaApiService.storeSheetData(
                user.email,
                file.name,
                { cells, rowCount: maxRow, colCount: maxCol },
                metadata
              );

              if (result.success) {
                console.log('✅ Sheet data successfully stored in MEGA cloud storage with proper folder structure');
              } else {
                console.error('❌ Failed to store sheet data in MEGA cloud storage:', result.message);
              }
            } catch (error) {
              console.error('❌ Error storing sheet data in MEGA cloud storage:', error);
            }
          }

          // Generate summary for AI processing
          try {
            console.log('Generating CSV summary for AI processing...');
            
            // Create a comprehensive summary
            const summary = {
              fileName: file.name,
              totalRows: dataRows.length,
              totalColumns: headers.length,
              headers: headers,
              sampleData: dataRows.slice(0, 3), // First 3 rows as sample
              dataTypes: headers.map(header => {
                const sampleValues = dataRows.slice(0, 10).map(row => {
                  const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
                  const colIndex = headers.indexOf(header);
                  return values[colIndex] || '';
                }).filter(v => v !== '');
                
                // Determine data type
                const hasNumbers = sampleValues.some(v => !isNaN(Number(v)) && v !== '');
                const hasDates = sampleValues.some(v => !isNaN(Date.parse(v)) && v !== '');
                
                if (hasNumbers && !hasDates) return 'numeric';
                if (hasDates) return 'date';
                return 'text';
              }),
              timestamp: new Date().toISOString()
            };
            
            console.log('Generated summary:', summary);
            
            // Send summary to backend for AI processing and Qdrant storage
            const userEmail = user?.email || 'anonymous@example.com';
            const resp = await fetch('/api/sheet-profile', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: JSON.stringify({ 
                summary: JSON.stringify(summary),
                userEmail: userEmail
              }),
            });
            
            const result = await resp.json();
            console.log('Backend AI processing response:', result);
            
            if (result.success) {
              console.log('✅ CSV summary successfully processed and stored in Qdrant');
            } else {
              console.error('❌ Failed to process CSV summary:', result.error);
            }
            
          } catch (err) {
            console.error('❌ Error generating/sending CSV summary:', err);
          }

          // Use the original working logic - just trigger a flag for AIAssistant to handle
          console.log('CSV uploaded - triggering DuckDB reload via AIAssistant');
          setCsvUploaded(true);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [activeSheetIndex, user?.email]);

  const handleGenerateChart = useCallback((type: 'bar' | 'line' | 'pie' | 'area') => {
    console.log(`Generating ${type} chart from pivot table`);
    // Chart generation logic would go here
  }, []);

  const handleExportPivot = useCallback(() => {
    console.log('Exporting pivot table data');
    // Export logic would go here
  }, []);

  const handleSavePivot = useCallback((pivotTable: any) => {
    console.log('Saving pivot table configuration:', pivotTable);
    // Save logic would go here
  }, []);

  // Load existing sheet data from MEGA cloud storage
  const loadExistingSheetData = useCallback(async (userEmail: string) => {
    try {
      setIsLoadingSheets(true);
      console.log('🔄 Loading existing sheet data from MEGA cloud storage...');

      // Get list of user files to let them choose
      const filesResult = await MegaApiService.listUserFiles(userEmail);

      if (filesResult.success && filesResult.data && filesResult.data.length > 0) {
        console.log(`📁 Found ${filesResult.data.length} files in MEGA cloud storage`);

        // Sort files by last modified date (most recent first)
        const sortedFiles = filesResult.data.sort((a: any, b: any) => {
          const dateA = new Date(a.lastModified || a.timestamp || 0);
          const dateB = new Date(b.lastModified || b.timestamp || 0);
          return dateB.getTime() - dateA.getTime();
        });

        // Only load the most recent sheet on startup for better performance
        const sheetsToLoad = 1; // Only load the most recent sheet initially
        console.log(`📊 Loading only the most recent sheet on startup (for better performance)`);

        // Load only the most recent sheet
        for (let i = 0; i < sheetsToLoad; i++) {
          const file = sortedFiles[i];
          try {
            const result = await MegaApiService.retrieveSheetData(userEmail, file.fileName);

                        if (result.success && result.data?.sheetData) {
              const { sheetData } = result.data;
              const fileName = result.data.fileName || file.fileName; // Use backend fileName or fallback to original

              // Convert sheet data to CSV format for addSheetFromCSV
              const csvData: string[][] = [];
              const { colCount, rowCount } = sheetData;

              // Create header row
              const headerRow: string[] = [];
              for (let col = 0; col < colCount; col++) {
                const colLetter = String.fromCharCode(65 + col);
                const cellId = `${colLetter}1`;
                const cell = sheetData.cells[cellId];
                const headerValue = cell && cell.value ? String(cell.value) : colLetter;
                headerRow.push(headerValue);
              }
              csvData.push(headerRow);

              // Create data rows
              for (let row = 2; row <= rowCount; row++) {
                const dataRow: string[] = [];
                for (let col = 0; col < colCount; col++) {
                  const colLetter = String.fromCharCode(65 + col);
                  const cellId = `${colLetter}${row}`;
                  const cell = sheetData.cells[cellId];
                  const cellValue = cell && cell.value !== undefined ? String(cell.value) : '';
                  dataRow.push(cellValue);
                }
                csvData.push(dataRow);
              }

              // Ensure fileName is valid before using
              if (!fileName) {
                console.error(`❌ Invalid fileName received from backend for ${file.fileName}, skipping`);
                continue; // Skip this file and continue with others
              }

              // Add the new sheet using the hook method
              addSheetFromCSV(csvData, fileName.replace('.csv.gz', ''));

              // Cache the sheet data for future use (using the current active sheet ID)
              if (state.activeSheetId) {
                updateSheetCache(state.activeSheetId, sheetData);
              }

              console.log(`✅ Loaded and cached sheet: ${fileName} (last modified: ${file.lastModified || 'unknown'})`);
            } else {
              console.error(`❌ Failed to load sheet data for ${file.fileName}:`, result.message);
            }
          } catch (error) {
            console.error(`❌ Error loading sheet ${file.fileName}:`, error);
          }
        }

        // Store all available sheets for later reference (popup selection)
        setAvailableSheets(sortedFiles.map(file => ({
          fileName: file.fileName,
          lastModified: file.lastModified || file.timestamp,
          // We'll load sheetData on demand
        })));

        // Log what sheets are available vs loaded
        const loadedSheetNames = state.sheets.map(sheet => sheet.name.toLowerCase());
        const availableSheetNames = sortedFiles.map(file =>
          file.fileName.replace(/\.(csv|gz|csv\.gz)$/i, '').toLowerCase()
        );

        console.log(`📋 Available sheets in cloud: ${availableSheetNames.join(', ')}`);
        console.log(`📊 Currently loaded sheets: ${loadedSheetNames.join(', ')}`);
        console.log(`🎯 Active sheet: ${state.sheets.length > 0 ? state.sheets[0].name : 'None'}`);

        // Set the most recent sheet as active (should be the first one loaded)
        console.log('✅ Most recent sheet loaded as active sheet on startup');

        // Trigger DuckDB reload
        setCsvUploaded(true);

      } else {
        console.log('📭 No files found in MEGA cloud storage');
        setAvailableSheets([]); // Clear any stale data
      }
    } catch (error) {
      console.error('❌ Error loading existing sheet data:', error);
    } finally {
      setIsLoadingSheets(false);
    }
  }, [MAX_CACHE_SIZE, updateSheetCache]);

  const handleFormat = useCallback((action: string, value?: string) => {
    console.log('Format action:', action, value);
    
    if (!selectedCells || selectedCells.length === 0) {
      console.log('No cells selected for formatting');
      return;
    }

        // TODO: Update to use new state management system
    console.log('Formatting not yet implemented in new state management system');
  }, [selectedCells, activeSheetIndex]);

  const handleCalculate = useCallback((operation: string) => {
    console.log('Calculate operation:', operation);
    // Calculate logic would go here
  }, []);

  const handleCreateCustom = useCallback(() => {
    console.log('Create custom');
    // Custom creation logic would go here
  }, []);

  const handleRearrangeLayout = useCallback(() => {
    console.log('Rearranging layout...');
    
    // Get the canvas reference
    if (canvasRef.current) {
      // Dynamically calculate proper positioning based on actual elements
      const toolbar = document.querySelector('.movable-toolbar') as HTMLElement;
      const header = document.querySelector('header') as HTMLElement;
      
      // Calculate gaps and positioning
      const leftGap = 20; // Gap from left edge
      const topGap = header ? header.offsetHeight + 20 : 100; // Gap below header
      const toolbarWidth = toolbar ? toolbar.offsetWidth : 200; // Actual toolbar width
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Position the sheet to start after the toolbar with proper spacing
      const sheetStartX = leftGap + toolbarWidth + 20; // 20px gap after toolbar
      const sheetStartY = topGap;
      
      // Calculate sheet dimensions to fit viewport
      const sheetWidth = viewportWidth - sheetStartX - 20; // 20px right margin
      const sheetHeight = viewportHeight - topGap - 20; // 20px bottom margin
      
      // Center the view on the properly positioned sheet
      canvasRef.current.centerView(sheetStartX + (sheetWidth / 2), sheetStartY + (sheetHeight / 2), 1000);
      
      // Update the sheet container positioning to match the calculated values
      const sheetContainer = document.getElementById('spreadsheet-container') as HTMLElement;
      if (sheetContainer) {
        sheetContainer.style.left = `${sheetStartX}px`;
        sheetContainer.style.top = `${sheetStartY}px`;
        sheetContainer.style.right = '20px';
        sheetContainer.style.bottom = '20px';
        console.log('Sheet container repositioned to:', { left: sheetStartX, top: sheetStartY });
      }
      
      // Zoom out to fit everything in view
      canvasRef.current.zoomTo(0.6, 1000);
      
      // After zoom animation, adjust the view to show everything
      setTimeout(() => {
        if (canvasRef.current) {
          canvasRef.current.fitToView(500);
        }
      }, 1200);
    }
    
    // Reposition AI chatbox to left side if not pinned
    const aiChatbox = document.querySelector('.ai-chatbox') as HTMLElement;
    
    // Note: Toolbar positioning is now handled by the MovableToolbar component itself
    // The toolbar will maintain its current position (fixed or movable) based on user preference
    
    // Reposition embedded charts below the sheet with proper spacing
    // Calculate chart positions based on actual sheet positioning
    const sheetContainer = document.getElementById('spreadsheet-container') as HTMLElement;
    if (sheetContainer) {
      const sheetRect = sheetContainer.getBoundingClientRect();
      const chartStartX = sheetRect.left + 20; // 20px gap from sheet left edge
      const chartStartY = sheetRect.bottom + 20; // 20px gap below sheet
      
      setEmbeddedCharts(prev => prev.map((chart, index) => ({
        ...chart,
        position: {
          x: chartStartX + (index * 50), // Spread charts horizontally
          y: chartStartY + (index * 100) // Stack charts vertically
        },
        size: {
          width: 350,
          height: 250
        }
      })));
    }
    
    // Force a re-render to ensure proper positioning
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    
    console.log('Layout rearrangement completed');
  }, []);

  const handleEmbedChart = useCallback((chartData: any, chartSpec: any) => {
    const newChart = {
      id: `chart-${Date.now()}`,
      type: chartSpec.type || 'bar',
      data: chartData,
      chartSpec: chartSpec,
      position: { x: Math.random() * 2000, y: Math.random() * 1000 }, // Random position on canvas
      size: { width: 400, height: 300 }
    };
    setEmbeddedCharts(prev => [...prev, newChart]);
    console.log('Chart embedded on canvas:', newChart);
  }, []);

  const handleRemoveChart = useCallback((chartId: string) => {
    setEmbeddedCharts(prev => prev.filter(chart => chart.id !== chartId));
  }, []);

  const handleExpandChart = useCallback((chartId: string) => {
    setEmbeddedCharts(prev => prev.map(chart => 
      chart.id === chartId 
        ? {
            ...chart,
            size: {
              width: Math.round(chart.size.width * 1.25),
              height: Math.round(chart.size.height * 1.25)
            }
          }
        : chart
    ));
    console.log('Chart expanded by 25%:', chartId);
  }, []);

  const handleShrinkChart = useCallback((chartId: string) => {
    setEmbeddedCharts(prev => prev.map(chart => 
      chart.id === chartId 
        ? {
            ...chart,
            size: {
              width: Math.max(200, Math.round(chart.size.width * 0.8)), // Minimum width of 200px
              height: Math.max(150, Math.round(chart.size.height * 0.8)) // Minimum height of 150px
            }
          }
        : chart
    ));
    console.log('Chart shrunk by 20%:', chartId);
  }, []);

  // Handle chart movement events from InfiniteCanvas
  useEffect(() => {
    const handleChartMoved = (event: CustomEvent) => {
      const { chartId, newPosition, updatedCharts } = event.detail;
      setEmbeddedCharts(updatedCharts);
    };

    window.addEventListener('chartMoved', handleChartMoved as EventListener);
    
    return () => {
      window.removeEventListener('chartMoved', handleChartMoved as EventListener);
    };
  }, []);

  // Handle window resize to maintain proper sheet positioning
  useEffect(() => {
    const handleResize = () => {
      // Only adjust if we have a canvas reference and the sheet is positioned
      if (canvasRef.current) {
        const sheetContainer = document.getElementById('spreadsheet-container') as HTMLElement;
        if (sheetContainer && sheetContainer.style.left !== '') {
          // Recalculate positioning based on new viewport size
          const toolbar = document.querySelector('.movable-toolbar') as HTMLElement;
          const header = document.querySelector('header') as HTMLElement;
          
          const leftGap = 20;
          const topGap = header ? header.offsetHeight + 20 : 100;
          const toolbarWidth = toolbar ? toolbar.offsetWidth : 200;
          const viewportWidth = window.innerWidth;
          
          const sheetStartX = leftGap + toolbarWidth + 20;
          const sheetStartY = topGap;
          
          // Update sheet container positioning
          sheetContainer.style.left = `${sheetStartX}px`;
          sheetContainer.style.top = `${sheetStartY}px`;
          sheetContainer.style.right = '20px';
          sheetContainer.style.bottom = '20px';
          
          console.log('Sheet repositioned on resize:', { left: sheetStartX, top: sheetStartY });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Ostr1ch</h1>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Welcome, {user.email}</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Canvas Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => canvasRef.current?.zoomIn()}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => canvasRef.current?.zoomOut()}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => canvasRef.current?.resetTransform()}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={handleRearrangeLayout}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Rearrange Layout"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={triggerDuckDBReload}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Reload DuckDB"
              >
                <Database className="h-4 w-4" />
              </button>
              
              {/* CSV Processing Loader */}
              {isProcessingCSV && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">Processing CSV...</span>
                </div>
              )}
            </div>
            
            {/* Rearrange Layout Button */}
            <Button
              onClick={handleRearrangeLayout}
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Rearrange Layout
            </Button>
            
            {/* Upload CSV Button */}
            <Button
              onClick={handleUploadCSV}
              disabled={isProcessingCSV}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="h-4 w-4" />
              Upload CSV
            </Button>
            
            {/* Pivot Table Button */}
            <Button
              onClick={() => {
                setShowPivotTable(true);
                setIsAIMinimized(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:scale-105"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Pivot Table
            </Button>
            
            {/* AI Report Generator Button */}
            <Button
              onClick={() => {
                setShowAIReportGenerator(true);
                setIsAIMinimized(true);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white transition-all duration-200 hover:scale-105"
            >
              <Brain className="h-4 w-4 mr-2" />
              AI Report
            </Button>
            
            {/* AI Chatbox Toggle */}
            <Button
              variant="ghost"
              onClick={() => setIsAIMinimized(!isAIMinimized)}
              className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" onClick={logout} className="transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700">
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Sheet Tabs */}
      <div className="fixed top-20 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6">
        <div className="flex items-center gap-2 py-2">
          {state.sheets.map((sheet, index) => (
            <div
              key={sheet.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 transition-all duration-200 cursor-pointer ${
                index === activeSheetIndex
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
              onClick={() => handleTabSwitch(index)}
            >
              <span className="text-sm font-medium">{sheet.name}</span>
              {state.sheets.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveSheet(index);
                  }}
                  className="ml-2 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          
          {/* Add New Sheet Button */}
          <button
            onClick={handleAddSheet}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">Add Sheet</span>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="relative h-[calc(100vh-120px)] mt-20 main-canvas-area">
        {/* Full Screen Loading Overlay */}
        {(isCheckingMegaData || isLoadingSheets || isProcessingSchema) && !isSchemaReady && (
          <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 z-[100] flex items-center justify-center">
            <div className="text-center">
              {/* Animated Ostrich Logo/Icon */}
              <div className="relative mb-6">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <div className="text-white text-2xl font-bold">🦅</div>
                </div>
                {/* Animated dots */}
                <div className="flex justify-center space-x-1 mt-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>

              <div className="relative h-8 mb-3 overflow-hidden">
                <h3
                  key={currentMessageIndex}
                  className="text-2xl font-bold text-gray-900 dark:text-white absolute inset-0 transform transition-all duration-1000 ease-in-out animate-fade-in-up"
                >
                  {loadingMessages[currentMessageIndex]}
                </h3>
              </div>

              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping" style={{animationDelay: '200ms'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" style={{animationDelay: '400ms'}}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping" style={{animationDelay: '600ms'}}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" style={{animationDelay: '800ms'}}></div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-sm transition-all duration-500 ease-in-out">
                {isCheckingMegaData
                  ? 'Connecting to your cloud storage...'
                  : isProcessingSchema
                    ? 'Generating AI schema and preparing analysis...'
                    : 'Preparing your spreadsheets...'
                }
              </p>

              {/* Progress indicator */}
              <div className="mt-6 w-64 mx-auto">
                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: isCheckingMegaData ? '40%' : isProcessingSchema ? '70%' : '95%',
                      animation: isSchemaReady ? 'pulse 2s infinite' : 'none'
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 transition-all duration-500 ease-in-out">
                  {isCheckingMegaData
                    ? 'Checking your data...'
                    : isProcessingSchema
                      ? 'Processing schema...'
                      : isSchemaReady
                        ? 'Ready to analyze!'
                        : 'Almost ready...'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mega Cloud Data Loading Overlay (smaller, for specific operations) */}
        {isCheckingMegaData && !isLoadingSheets && (
          <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 z-50 flex items-center justify-center">
            <div className="text-center">
              <LoaderCircle className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Checking Cloud Storage
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Loading your sheets from MEGA cloud storage...
              </p>
            </div>
          </div>
        )}

        {/* CSV Processing Overlay */}
        {isProcessingCSV && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-50 flex items-center justify-center">
            <div className="text-center">
              <LoaderCircle className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Processing CSV Data
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Loading data into DuckDB... Please wait.
              </p>
            </div>
          </div>
        )}

        {/* Infinite Canvas with Zoom and Pan */}
        <InfiniteCanvas 
          onAddSheet={handleAddSheet} 
          ref={canvasRef} 
          embeddedCharts={embeddedCharts}
          onRemoveChart={handleRemoveChart}
          onExpandChart={handleExpandChart}
          onShrinkChart={handleShrinkChart}
        >
          {/* Spreadsheet Area - Positioned with proper spacing from toolbar and header */}
          <div 
            className="absolute z-10"
            style={{
              left: '280px', // Start after toolbar (20px + 200px toolbar + 20px gap)
              top: '100px',  // Start below header with gap
              right: '20px',  // Right margin
              bottom: '20px'  // Bottom margin
            }}
            id="spreadsheet-container"
          >
            {activeSheet ? (
              <ModernSpreadsheet
                sheet={activeSheet}
                updateCell={handleUpdateCell}
                bulkUpdateCells={handleBulkUpdateCells}
                onSelectionChange={setSelectedCells}
                selectedCells={selectedCells}
                onAddMoreRows={addMoreRows}
                onSheetNameChange={(newName) => handleSheetNameChange(activeSheetIndex, newName)}
                acceptAIUpdate={acceptAIUpdate}
                rejectAIUpdate={rejectAIUpdate}
                onColumnHover={handleColumnHover}
                onColumnLeave={handleColumnLeave}
                onRowHover={handleRowHover}
                onRowLeave={handleRowLeave}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p className="text-lg">Loading sheet...</p>
                  <p className="text-sm mt-2">Please wait while we initialize your spreadsheet.</p>
                </div>
              </div>
            )}
          </div>
        </InfiniteCanvas>
        
        {/* AI Chatbox - Positioned outside canvas with higher z-index */}
        {!isAIMinimized && (
                <AIAssistant
          onGenerateChart={handleGenerateChart}
          onCalculate={handleCalculate}
          activeSheet={activeSheet}
          selectedCells={selectedCells}
          isMinimized={isAIMinimized}
          onToggleMinimize={() => setIsAIMinimized(!isAIMinimized)}
          onUploadCSV={handleUploadCSV}
          onCreateCustom={handleCreateCustom}
          updateCell={handleUpdateCell}
          bulkUpdateCells={handleBulkUpdateCells}
          onEmbedChart={handleEmbedChart}
          csvUploaded={csvUploaded}
          resetCsvUploadFlag={resetCsvUploadFlag}
          setIsProcessingCSV={setIsProcessingCSV}
          createAIUpdates={createAIUpdates}
          onDeselectCells={() => setSelectedCells([])}

        />
        )}

        {/* Movable Toolbar - Positioned outside canvas with higher z-index */}
        <MovableToolbar
          onFormat={handleFormat}
          selectedCells={selectedCells}
          activeSheet={activeSheet}
          onCellSelect={(cellId) => setSelectedCells([cellId])}
          onAddSheet={handleAddSheet}
          onRearrange={handleRearrangeLayout}
        />

        {/* Statistical Summary - Shows stats for selected cells */}
        <StatisticalSummary
          selectedCells={selectedCells}
          activeSheet={activeSheet}
          isVisible={selectedCells && selectedCells.length > 0}
        />
      </div>

      {/* Pivot Table Modal */}
      <PivotTableModal
        sheet={activeSheet}
        isVisible={showPivotTable}
        onClose={() => {
          setShowPivotTable(false);
        }}
        onGenerateChart={handleGenerateChart}
        onExportCSV={handleExportPivot}
        onSavePivot={handleSavePivot}
      />



      {/* Sheet Selector Modal */}
      {showSheetSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Load Sheet from Cloud Storage
            </h3>

            <div className="space-y-2 mb-4">
              {availableSheets
                .filter(sheet => {
                  const cleanName = sheet.fileName.replace(/\.(csv|gz|csv\.gz)$/i, '').toLowerCase();
                  const loadedNames = state.sheets.map(s => s.name.toLowerCase());
                  return !loadedNames.includes(cleanName);
                })
                .map((sheet, index) => (
                  <button
                    key={`unloaded-${index}`}
                    onClick={() => handleSheetSelection({ fileName: sheet.fileName })}
                    className="w-full text-left p-3 rounded border hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {sheet.fileName.replace(/\.(csv|gz|csv\.gz)$/i, '')}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {sheet.lastModified ? new Date(sheet.lastModified).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                  </button>
                ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  addSheet();
                  setShowSheetSelector(false);
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Create Empty Sheet
              </button>
              <button
                onClick={() => setShowSheetSelector(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Report Generator Modal */}
      <AIReportGenerator
        activeSheet={activeSheet}
        isOpen={showAIReportGenerator}
        onClose={() => {
          setShowAIReportGenerator(false);
        }}
      />

      {/* Column AI Update Tooltip */}
      <ColumnAITooltip
        columnLetter={columnTooltip.columnLetter}
        updateCount={columnTooltip.updateCount}
        onAcceptAll={(columnLetter) => acceptColumnAIUpdates(columnLetter)}
        onRejectAll={(columnLetter) => rejectColumnAIUpdates(columnLetter)}
        position={columnTooltip.position}
        isVisible={columnTooltip.visible}
      />

      {/* Row AI Update Tooltip */}
      <RowAITooltip
        rowNumber={rowTooltip.rowNumber}
        updateCount={rowTooltip.updateCount}
        onAcceptAll={(rowNumber) => acceptRowAIUpdates(rowNumber)}
        onRejectAll={(rowNumber) => rejectRowAIUpdates(rowNumber)}
        position={rowTooltip.position}
        isVisible={rowTooltip.visible}
      />

      {/* Sheet-level AI Update Control */}
      {getTotalAIUpdateCount() > 0 && (
        <SheetAIControl
          totalUpdates={getTotalAIUpdateCount()}
          onAcceptAll={acceptAllAIUpdates}
          onRejectAll={rejectAllAIUpdates}
          onRestoreOriginal={restoreOriginalState}
          className="fixed top-20 right-4 z-40 max-w-sm"
        />
      )}

    </div>
  );
};

export default Index;
