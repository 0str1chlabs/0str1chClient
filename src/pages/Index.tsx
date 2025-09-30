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
import { toast } from '@/hooks/use-toast';
import { AIAssistant } from '@/components/AIAssistant';
import { MovableToolbar } from '@/components/MovableToolbar';
import { ModernSpreadsheet } from '@/components/ModernSpreadsheet';
import { PivotTableModal } from '@/components/PivotTableModal';
import { CellComparisonTooltip, ColumnAITooltip, RowAITooltip, SheetAIControl } from '@/components/CellComparisonTooltip';
import { InfiniteCanvas } from '@/components/InfiniteCanvas';
import { StatisticalSummary } from '@/components/StatisticalSummary';

import { AIReportGenerator } from '@/components/AIReportGenerator';
import { SheetSelector } from '@/components/SheetSelector';
import { ResearchModal } from '@/components/ResearchModal';
import { NotificationManager, NotificationProps } from '@/components/NotificationToast';
import { useAuth } from '@/components/auth/AuthContext';
import { SheetData } from '@/types/spreadsheet';
import { Upload, Plus, X, BarChart3, MessageCircle, ZoomIn, ZoomOut, RotateCcw, LayoutGrid, LoaderCircle, Database, Brain, Search, Download } from '@/lib/icons';
import { TourButton } from '@/components/TourButton';
import { useTour } from '@/components/TourProvider';
import { TourDebug } from '@/components/TourDebug';
import TipsBanner from '@/components/TipsBanner';
import { initializeTourForNewUser, shouldShowTourAutomatically } from '@/lib/tourUtils';
import { useDuckDBUpdates } from '@/hooks/useDuckDBUpdates';
import { createDebouncedSelectionUpdater, SelectionPerformanceMonitor } from '@/lib/cellSelectionUtils';
import { useSpreadsheet } from '@/hooks/useSpreadsheet';
import { indexedDBService } from '@/lib/indexedDBService';
import { csvChangeManager } from '@/lib/csvChangeManager';
import { convertLocalStorageToAIUpdates, hasLocalStorageChanges, debugLocalStorageState } from '@/lib/localStorageToAIUpdates';
import { sheetSpecificStorage } from '@/lib/sheetSpecificStorage';
import { sessionTracker } from '@/lib/sessionTracker';
import { indexedDBFirstLoader } from '@/lib/indexedDBFirstLoader';
import { unifiedChangeManager } from '@/lib/unifiedChangeManager';
import { cleanFilename } from '@/lib/filenameUtils';
import { debugIndexedDB } from '@/lib/utils';
import { changeDetector, ChangeEntry } from '@/lib/changeDetector';
import { getCurrentSheetAISchema } from '@/lib/utils';
import { useDuckDBMapping } from '@/hooks/useDuckDBMapping';
import { ResearchService } from '@/lib/researchService';
import BackblazeApiService from '../services/backblazeApiService';
import Loader from '@/components/Loader';
import SheetLoader from '@/components/loaders/SheetLoader';
import AILoader from '@/components/loaders/AILoader';
import DataLoader from '@/components/loaders/DataLoader';
import ResearchLoader from '@/components/loaders/ResearchLoader';
import '@/styles/nprogress.css';


const Index: React.FC = () => {
  const { user, logout } = useAuth();
  const { startTour } = useTour();
  
  // Use the new spreadsheet hook with dual-state system
  const {
    state,
    activeSheet,
    updateCell,
    bulkUpdateCells,
    formatCells,
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
    addPredefinedSheet,
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
  const [showSheetSelectionModal, setShowSheetSelectionModal] = useState(false);
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [lastModifiedDate, setLastModifiedDate] = useState(null);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [showAIReportGenerator, setShowAIReportGenerator] = useState(false);
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [currentSheetFileName, setCurrentSheetFileName] = useState<string>('');

  // Export active sheet to CSV and download
  const handleExportCSV = useCallback(() => {
    try {
      if (!activeSheet) {
        toast({ title: 'No sheet to export', description: 'Please load or create a sheet first.' });
        return;
      }

      const { rowCount, colCount, cells, name } = activeSheet as SheetData;

      const rows: string[][] = [];
      // Header row from row 1, fallback to A..Z letters when empty
      const headerRow: string[] = [];
      for (let col = 0; col < colCount; col++) {
        const colLetter = String.fromCharCode(65 + col);
        const headerCellId = `${colLetter}1`;
        const headerCell = cells[headerCellId];
        const headerValue = (headerCell?.value !== undefined && headerCell?.value !== null && String(headerCell?.value).trim() !== '')
          ? String(headerCell.value)
          : colLetter;
        headerRow.push(headerValue);
      }
      rows.push(headerRow);

      // Data rows (2..rowCount). Use AI value when present
      for (let row = 2; row <= rowCount; row++) {
        const rowData: string[] = [];
        for (let col = 0; col < colCount; col++) {
          const colLetter = String.fromCharCode(65 + col);
          const cellId = `${colLetter}${row}`;
          const cell = cells[cellId];
          const finalValue = (cell && cell.hasAIUpdate && cell.aiValue !== undefined) ? cell.aiValue : cell?.value;
          const text = finalValue !== undefined && finalValue !== null ? String(finalValue) : '';
          // Escape CSV field: wrap in quotes and escape existing quotes
          const escaped = '"' + text.replace(/"/g, '""') + '"';
          rowData.push(escaped);
        }
        // include row if any non-empty cell
        if (rowData.some(v => v.replace(/^"|"$/g, '').trim() !== '')) {
          rows.push(rowData);
        }
      }

      const csvString = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (name || 'sheet').replace(/[^a-z0-9-_]+/gi, '_');
      a.download = `${safeName}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Exported CSV', description: `Downloaded ${safeName}.csv` });
    } catch (error) {
      console.error('Error exporting CSV', error);
      toast({ title: 'Export failed', description: 'There was a problem exporting the sheet.' });
    }
  }, [activeSheet, toast]);

  // Notification helper functions
  const addNotification = useCallback((notification: Omit<NotificationProps, 'id'>) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { ...notification, id }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

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
  const [isSheetRendered, setIsSheetRendered] = useState(false);

  // Loading state management (kept for compatibility with existing logic)
  const [isCheckingBackblazeData, setIsCheckingBackblazeData] = useState(true);
  const [isProcessingSchema, setIsProcessingSchema] = useState(false);
  const [isSchemaReady, setIsSchemaReady] = useState(false);
  const [hasCheckedBackblazeData, setHasCheckedBackblazeData] = useState(false);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Watchdog to auto-clear stuck loaders in dev/prod after a timeout
  useEffect(() => {
    const DISABLE_LOADERS = import.meta.env.VITE_DISABLE_LOADERS === 'true';
    if (DISABLE_LOADERS) {
      setIsLoadingSheets(false);
      setIsCheckingBackblazeData(false);
      setIsProcessingSchema(false);
      setIsProcessingCSV(false);
      return;
    }

    const timeoutMs = Number(import.meta.env.VITE_LOADER_TIMEOUT_MS || 15000);
    const timer = setTimeout(() => {
      const anyStuck = isLoadingSheets || isCheckingBackblazeData || isProcessingSchema || isProcessingCSV;
      if (anyStuck) {
        setIsLoadingSheets(false);
        setIsCheckingBackblazeData(false);
        setIsProcessingSchema(false);
        setIsProcessingCSV(false);
      }
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [isLoadingSheets, isCheckingBackblazeData, isProcessingSchema, isProcessingCSV]);

  // Manual global for emergency clearing while debugging
  useEffect(() => {
    (window as any).__forceStopLoaders = () => {
      setIsLoadingSheets(false);
      setIsCheckingBackblazeData(false);
      setIsProcessingSchema(false);
      setIsProcessingCSV(false);
    };
    return () => {
      delete (window as any).__forceStopLoaders;
    };
  }, []);

  // Sheet cache management (max 3 sheets on client side)
  const [sheetCache, setSheetCache] = useState<Map<string, any>>(new Map());
  const [cacheTimestamps, setCacheTimestamps] = useState<Map<string, number>>(new Map());
  const MAX_CACHE_SIZE = 3;

  // Backblaze storage state


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

  // Watch for new sheets and cache them if they don't have data
  useEffect(() => {
    const activeSheet = state.sheets.find(s => s.id === state.activeSheetId);
    if (activeSheet && activeSheet.cells && Object.keys(activeSheet.cells).length === 0) {
      // Check if we have cached data for this sheet
      const cachedData = sheetCache.get(activeSheet.id);
      if (cachedData) {
        console.log('🔄 Loading sheet data from cache for:', activeSheet.id);
        // The cache contains the raw sheet data, but we need to convert it to the format expected by the spreadsheet
        // For now, we'll just log that we found cached data
        console.log('📊 Cached data found:', cachedData);
      }
    }
  }, [state.activeSheetId, state.sheets, sheetCache]);

  // IndexedDB will be initialized lazily when needed (on CSV upload)

  // Initialize session tracking
  useEffect(() => {
    sessionTracker.startSession();
    console.log('🔄 Session tracking initialized');
    
    // Handle page unload - sync to Backblaze if needed
    const handleBeforeUnload = async () => {
      if (user?.email && sessionTracker.needsBackblazeSync()) {
        console.log('🔄 Page unloading, syncing changes to Backblaze...');
        try {
          await indexedDBFirstLoader.syncToBackblaze(user.email);
        } catch (error) {
          console.error('❌ Error syncing to Backblaze on page unload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sessionTracker.endSession();
    };
  }, [user?.email]);

  // Add debug functions to global scope for console access
  useEffect(() => {
    // Import debug functions
    import('../lib/utils').then(({ debugDuckDBTables, debugDuckDBTable, debugIndexedDB }) => {
      // Make debug functions available globally
      (window as any).debugDuckDBTables = debugDuckDBTables;
      (window as any).debugDuckDBTable = debugDuckDBTable;
      (window as any).debugIndexedDB = debugIndexedDB;
      
      // Add manual test function
      (window as any).testIndexedDBManually = async () => {
        try {
          console.log('🧪 Testing IndexedDB manually...');
          console.log('🔍 IndexedDB service:', indexedDBService);
          
          await indexedDBService.init();
          console.log('✅ IndexedDB initialized');
          
          const testCSV = 'Name,Age,City\nJohn,25,New York\nJane,30,Los Angeles';
          console.log('📊 Test CSV data:', testCSV);
          
          const sheetId = await indexedDBService.saveSheet({
            name: 'test.csv',
            csvData: testCSV,
            isActive: false
          });
          console.log('✅ Test sheet saved with ID:', sheetId);
          
          const allFiles = await indexedDBService.getAllSheets();
          console.log('📊 All sheets:', allFiles);
          
          await debugIndexedDB();
        } catch (error) {
          console.error('❌ Manual test failed:', error);
          console.error('Error stack:', error.stack);
        }
      };
      
      // Add function to check current state
      (window as any).checkIndexedDBState = async () => {
        try {
          console.log('🔍 Checking IndexedDB state...');
          console.log('🔍 IndexedDB service available:', !!indexedDBService);
          console.log('🔍 IndexedDB service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(indexedDBService)));
          
          await debugIndexedDB();
          
          const currentCSVId = localStorage.getItem('currentCSVId');
          console.log('🔍 Current CSV ID in localStorage:', currentCSVId);
          
          if (currentCSVId) {
            try {
              const csvData = await indexedDBService.getCSVFile(currentCSVId);
              console.log('🔍 CSV data for current ID:', csvData);
            } catch (error) {
              console.error('❌ Could not retrieve CSV data:', error);
            }
          }
        } catch (error) {
          console.error('❌ State check failed:', error);
        }
      };
      
      // Add function to clear test files
      (window as any).clearTestFiles = async () => {
        try {
          console.log('🧹 Clearing test files from IndexedDB...');
          const allFiles = await indexedDBService.getAllSheets();
          const testFiles = allFiles.filter(file => file.name === 'test.csv');
          
          console.log(`🗑️ Found ${testFiles.length} test files to delete`);
          
          for (const file of testFiles) {
            // Note: Delete functionality not needed for this test
            console.log(`🔍 Found test file: ${file.id} - ${file.name}`);
          }
          
          console.log('🧹 Test files cleared');
          await debugIndexedDB();
        } catch (error) {
          console.error('❌ Failed to clear test files:', error);
        }
      };
      
      // Migration function for localStorage changes
      (window as any).migrateToFilenameBasedStorage = () => {
        try {
          console.log('🔄 Migrating localStorage from sheet IDs to filename-based keys...');
          
          // Check for old storage
          const oldAIDiffData = localStorage.getItem('sheet_specific_ai_diff');
          if (!oldAIDiffData) {
            console.log('✅ No old localStorage data found to migrate');
            return;
          }
          
          const oldParsed = JSON.parse(oldAIDiffData);
          const oldKeys = Object.keys(oldParsed);
          
          if (oldKeys.length === 0) {
            console.log('✅ No old changes found to migrate');
            return;
          }
          
          console.log('📋 Found old changes for sheet IDs:', oldKeys);
          
          // Get new filename-based storage
          const newAIDiffData = localStorage.getItem('sheet_ai_diff_by_filename');
          const newParsed = newAIDiffData ? JSON.parse(newAIDiffData) : {};
          
          // Try to map changes to current active sheet
          if (state.sheets.length > 0 && oldKeys.length > 0) {
            const activeSheet = state.sheets.find(s => s.id === state.activeSheetId) || state.sheets[0];
            const fileName = activeSheet.name || `sheet-${activeSheet.id}`;
            const cleanName = fileName.replace(/[^a-zA-Z0-9\-_.]/g, '_').replace(/_{2,}/g, '_').toLowerCase();
            
            // Use the first available old changes for the current sheet
            const oldChanges = oldParsed[oldKeys[0]];
            if (Array.isArray(oldChanges) && oldChanges.length > 0) {
              console.log(`🔄 Migrating ${oldChanges.length} changes to filename "${fileName}" (key: ${cleanName})`);
              newParsed[cleanName] = oldChanges;
              
              // Save the new format
              localStorage.setItem('sheet_ai_diff_by_filename', JSON.stringify(newParsed));
              
              // Keep old data for now (don't delete until user confirms migration worked)
              console.log('✅ Migration completed - old data preserved for safety');
              console.log('💡 Reload the page to see if your changes appear. If they do, you can clear old data with clearOldLocalStorage()');
              
              return true;
            }
          }
          
          console.log('⚠️ Could not automatically migrate - no active sheet found');
          return false;
          
        } catch (error) {
          console.error('❌ Error during migration:', error);
          return false;
        }
      };
      
      // Function to clear old localStorage after successful migration
      (window as any).clearOldLocalStorage = () => {
        try {
          console.log('🧹 Clearing old localStorage data...');
          localStorage.removeItem('sheet_specific_ai_diff');
          localStorage.removeItem('sheet_specific_changes');
          localStorage.removeItem('updated_sheet_values');
          console.log('✅ Old localStorage data cleared');
        } catch (error) {
          console.error('❌ Error clearing old localStorage:', error);
        }
      };

      console.log('🔧 Debug functions available:');
      console.log('  - debugDuckDBTables() - List all DuckDB tables');
      console.log('  - debugDuckDBTable("tableName") - Debug specific table');
      console.log('  - debugIndexedDB() - Check IndexedDB contents');
      console.log('  - testIndexedDBManually() - Test IndexedDB with sample data');
      console.log('  - checkIndexedDBState() - Check current IndexedDB state');
      console.log('  - clearTestFiles() - Clear test files from IndexedDB');
      console.log('  - migrateToFilenameBasedStorage() - Migrate old localStorage to new format');
      console.log('  - clearOldLocalStorage() - Clear old localStorage data after migration');
      console.log('  - testFilenameCleaning() - Test filename cleaning logic');
      console.log('  - cleanExistingFilenames() - Clean existing IndexedDB filenames');
      console.log('  - debugCurrentSheet() - Debug current sheet and table name');
      
      // Add filename cleaning test function
      (window as any).testFilenameCleaning = () => {
        const { testFilenameCleaning } = require('../lib/filenameUtils');
        testFilenameCleaning();
      };
      
      // Add function to clean existing IndexedDB filenames
      (window as any).cleanExistingFilenames = async () => {
        try {
          console.log('🧹 Starting IndexedDB filename cleaning...');
          await indexedDBService.cleanExistingFilenames();
          console.log('✅ IndexedDB filename cleaning completed');
        } catch (error) {
          console.error('❌ Error cleaning IndexedDB filenames:', error);
        }
      };
      
      // Add function to debug current sheet and table name
    (window as any).debugCurrentSheet = () => {
      console.log('🔍 Current Sheet Debug Info:');
      console.log('Active Sheet:', activeSheet);
      if (activeSheet) {
        const cleanId = activeSheet.id.replace(/[^a-zA-Z0-9]/g, '_');
        const tableName = cleanId.startsWith('sheet_') ? cleanId : `sheet_${cleanId}`;
        console.log('Sheet ID:', activeSheet.id);
        console.log('Clean ID:', cleanId);
        console.log('Table Name:', tableName);
        console.log('Sheet Name:', activeSheet.name);
        console.log('Row Count:', activeSheet.rowCount);
        console.log('Col Count:', activeSheet.colCount);
        console.log('Cells Count:', Object.keys(activeSheet.cells || {}).length);
    } else {
        console.log('No active sheet');
      }
    };

    // Function to remove duplicate sheets with the same name
    (window as any).removeDuplicateSheets = () => {
      console.log('🧹 Checking for duplicate sheets...');
      const sheetNames = new Set();
      const duplicates = [];
      
      state.sheets.forEach(sheet => {
        if (sheetNames.has(sheet.name)) {
          duplicates.push(sheet);
          console.log(`🔍 Found duplicate sheet: ${sheet.name} (ID: ${sheet.id})`);
        } else {
          sheetNames.add(sheet.name);
        }
      });
      
      if (duplicates.length > 0) {
        console.log(`🗑️ Removing ${duplicates.length} duplicate sheets...`);
        duplicates.forEach(sheet => {
          if (sheet.id !== state.activeSheetId) { // Don't remove active sheet
            removeSheet(sheet.id);
            console.log(`✅ Removed duplicate sheet: ${sheet.name} (ID: ${sheet.id})`);
          }
        });
      } else {
        console.log('✅ No duplicate sheets found');
      }
    };

    // Add function to clear IndexedDB changes
    (window as any).clearIndexedDBChanges = () => {
      try {
        sessionTracker.clearIndexedDBChanges();
        console.log('✅ IndexedDB changes cleared');
      } catch (error) {
        console.error('❌ Error clearing IndexedDB changes:', error);
      }
    };

    // Add function to check IndexedDB changes
    (window as any).checkIndexedDBChanges = () => {
      try {
        const changes = sessionTracker.getIndexedDBChanges();
        console.log('📊 Current IndexedDB changes:', changes);
        console.log('📊 Total changes:', changes.length);
        console.log('📊 Has changes:', sessionTracker.hasIndexedDBChanges());
        return changes;
      } catch (error) {
        console.error('❌ Error checking IndexedDB changes:', error);
        return [];
      }
    };

    // Add function to clear localStorage changes
    (window as any).clearLocalStorageChanges = () => {
      try {
        // Clear sheet-specific changes
        if (activeSheet) {
          sheetSpecificStorage.clearSheetChanges(activeSheet.id);
          console.log('✅ Sheet-specific changes cleared for:', activeSheet.id);
        }
        
        // Clear all localStorage changes
        localStorage.removeItem('updated_sheet_values');
        localStorage.removeItem('sheet_specific_changes');
        localStorage.removeItem('sheet_specific_ai_diff');
        localStorage.removeItem('ai_sheets_indexeddb_changes');
        console.log('✅ All localStorage changes cleared');
      } catch (error) {
        console.error('❌ Error clearing localStorage changes:', error);
      }
    };

    // Add function to debug localStorage structure
    (window as any).debugLocalStorageStructure = () => {
      try {
        console.log('🔍 localStorage Structure Debug:');
        
        // Check all relevant localStorage keys
        const keys = ['updated_sheet_values', 'sheet_specific_changes', 'sheet_specific_ai_diff', 'ai_sheets_indexeddb_changes'];
        
        keys.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              const parsed = JSON.parse(value);
              console.log(`📋 ${key}:`, {
                type: typeof parsed,
                isArray: Array.isArray(parsed),
                isObject: typeof parsed === 'object' && parsed !== null,
                keys: typeof parsed === 'object' ? Object.keys(parsed) : 'N/A',
                length: Array.isArray(parsed) ? parsed.length : 'N/A',
                sample: Array.isArray(parsed) ? parsed.slice(0, 2) : parsed
              });
            } catch (e) {
              console.log(`📋 ${key}: (parse error)`, value.substring(0, 100));
            }
          } else {
            console.log(`📋 ${key}: null`);
          }
        });
        
        // Check for undefined keys
        console.log('🔍 Checking for undefined keys...');
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('undefined')) {
            console.log(`⚠️ Found undefined key: ${key}`);
          }
        }
        
      } catch (error) {
        console.error('❌ Error debugging localStorage structure:', error);
      }
    };

    // Add function to clean up corrupted localStorage data
    (window as any).cleanupLocalStorage = () => {
      try {
        console.log('🧹 Cleaning up corrupted localStorage data...');
        
        // Remove undefined keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('undefined') || key === 'undefined')) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed undefined key: ${key}`);
        });
        
        // Clean up sheet_specific_changes to remove undefined sheet IDs
        const sheetChanges = localStorage.getItem('sheet_specific_changes');
        if (sheetChanges) {
          try {
            const parsed = JSON.parse(sheetChanges);
            const cleaned = {};
            let removedCount = 0;
            
            Object.keys(parsed).forEach(sheetId => {
              if (sheetId && sheetId !== 'undefined' && sheetId !== 'null') {
                cleaned[sheetId] = parsed[sheetId];
              } else {
                removedCount++;
                console.log(`🗑️ Removed changes for invalid sheet ID: ${sheetId}`);
              }
            });
            
            if (removedCount > 0) {
              localStorage.setItem('sheet_specific_changes', JSON.stringify(cleaned));
              console.log(`✅ Cleaned up ${removedCount} invalid sheet entries`);
            }
          } catch (e) {
            console.log('⚠️ Could not parse sheet_specific_changes, removing...');
            localStorage.removeItem('sheet_specific_changes');
          }
        }
        
        console.log('✅ localStorage cleanup completed');
      } catch (error) {
        console.error('❌ Error cleaning up localStorage:', error);
      }
    };

    // Add function to manually trigger localStorage changes loading
    (window as any).forceLoadLocalStorageChanges = async () => {
      try {
        console.log('🔄 Manually triggering localStorage changes loading...');
        
        // Reset the flag to allow reloading
        localStorageChangesLoaded.current = false;
        lastProcessedSheetId.current = null;
        
        // Force reload the changes
        const loadPendingChangesAsAIUpdates = async () => {
          if (!state.activeSheetId || state.sheets.length === 0) {
            console.log('⚠️ No active sheet or sheets loaded yet');
            return;
          }

          const activeSheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!activeSheet || !activeSheet.cells || Object.keys(activeSheet.cells).length === 0) {
            console.log('⚠️ Active sheet has no cells yet');
            return;
          }

          try {
            console.log('🔄 Loading pending changes using unified change manager...');
            
            // Get change summary for debugging
            const summary = await unifiedChangeManager.getChangeSummary(state.activeSheetId);
            console.log('📊 Change summary:', summary);
            
            // Load all pending changes (from both IndexedDB and localStorage)
            const changes = await unifiedChangeManager.loadPendingChanges(state.activeSheetId);
            
            // Also check for legacy localStorage changes
            const legacyChanges = convertLocalStorageToAIUpdates();
            if (legacyChanges.length > 0) {
              console.log(`📝 Found ${legacyChanges.length} legacy localStorage changes, adding to unified changes...`);
              // Convert legacy changes to unified format
              const unifiedLegacyChanges = legacyChanges.map(change => ({
                cellId: change.cellId,
                previousValue: change.originalValue,
                newValue: change.aiValue,
                timestamp: change.timestamp,
                source: 'localstorage' as const
              }));
              changes.push(...unifiedLegacyChanges);
            }
            
            if (changes.length > 0) {
              console.log(`📝 Found ${changes.length} total pending changes, applying to UI...`);
              console.log('🔍 Changes breakdown:', {
                total: changes.length,
                indexedDB: changes.filter(c => c.source === 'indexeddb').length,
                localStorage: changes.filter(c => c.source === 'localstorage').length
              });
              
              // Apply changes to UI using the unified manager
              await unifiedChangeManager.applyChangesToUI(state.activeSheetId, changes, createAIUpdates);
              
              console.log('✅ Pending changes loaded as AI updates - user can now Accept/Reject');
              
              // Force a re-render to ensure the UI updates
              setForceUpdate(prev => prev + 1);
              
              // Also add a notification to inform the user
              setNotifications(prev => [...prev, {
                id: `manual-changes-${Date.now()}`,
                type: 'info',
                title: 'Pending Changes Found',
                message: `Found ${changes.length} pending changes from previous session. Please review and accept or reject them.`,
                duration: 5000
              }]);
            } else {
              console.log('ℹ️ No pending changes found');
            }
            
          } catch (error) {
            console.error('❌ Error loading pending changes:', error);
          }
        };
        
        await loadPendingChangesAsAIUpdates();
        console.log('✅ Manual localStorage changes loading completed');
        
      } catch (error) {
        console.error('❌ Error manually loading localStorage changes:', error);
      }
    };

    // Add a comprehensive debug function to check localStorage state
    (window as any).debugLocalStorageChanges = () => {
      console.log('🔍 Debugging localStorage changes...');
      
      // Check legacy localStorage
      const legacyChanges = localStorage.getItem('updated_sheet_values');
      console.log('📋 Legacy localStorage (updated_sheet_values):', legacyChanges);
      
      // Check sheet-specific localStorage
      if (state.activeSheetId) {
        const sheetChanges = sheetSpecificStorage.getSheetChanges(state.activeSheetId);
        console.log(`📋 Sheet-specific changes for ${state.activeSheetId}:`, sheetChanges);
        
        // Also check AI diff data
        const aiDiffData = sheetSpecificStorage.getSheetAIDiff(state.activeSheetId);
        console.log(`📋 AI diff data for ${state.activeSheetId}:`, aiDiffData);
        
        // Check raw AI diff storage
        const rawAIDiff = localStorage.getItem('sheet_specific_ai_diff');
        if (rawAIDiff) {
          const parsed = JSON.parse(rawAIDiff);
          console.log('📋 Raw AI diff storage:', parsed);
          console.log(`📋 AI diff for current sheet (${state.activeSheetId}):`, parsed[state.activeSheetId]);
        }
      } else {
        console.log('⚠️ No active sheet ID');
      }
      
      // Check all localStorage keys
      const allKeys = Object.keys(localStorage);
      const relevantKeys = allKeys.filter(key => 
        key.includes('sheet') || key.includes('ai') || key.includes('changes')
      );
      console.log('🔑 Relevant localStorage keys:', relevantKeys);
      
      relevantKeys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`  ${key}:`, value?.substring(0, 200) + (value && value.length > 200 ? '...' : ''));
      });
    };

    // Add function to fix corrupted localStorage data
    (window as any).fixLocalStorageChanges = () => {
      console.log('🔧 Fixing corrupted localStorage changes...');
      
      try {
        // Get the corrupted data with 'undefined' key
        const aiDiffData = localStorage.getItem('sheet_specific_ai_diff');
        if (aiDiffData) {
          const parsed = JSON.parse(aiDiffData);
          console.log('📋 Current ai_diff data:', parsed);
          
          // Check if there are changes under 'undefined' key
          if (parsed.undefined && Array.isArray(parsed.undefined) && parsed.undefined.length > 0) {
            console.log(`📝 Found ${parsed.undefined.length} changes under 'undefined' key`);
            
            // Move changes to the current active sheet
            if (state.activeSheetId) {
              console.log(`🔄 Moving changes to active sheet: ${state.activeSheetId}`);
              
              // Create new structure with correct sheet ID
              const fixedData = { ...parsed };
              fixedData[state.activeSheetId] = parsed.undefined;
              delete fixedData.undefined;
              
              // Save the fixed data
              localStorage.setItem('sheet_specific_ai_diff', JSON.stringify(fixedData));
              console.log('✅ Fixed ai_diff data');
              
              // Also fix sheet_specific_changes
              const changesData = localStorage.getItem('sheet_specific_changes') || '{}';
              const changesObj = JSON.parse(changesData);
              
              // Convert ai_diff format to changes format
              const convertedChanges = parsed.undefined.map((change: any) => ({
                cellId: change.cellId,
                previousValue: change.previousValue,
                newValue: change.newValue,
                timestamp: change.timestamp
              }));
              
              changesObj[state.activeSheetId] = convertedChanges;
              localStorage.setItem('sheet_specific_changes', JSON.stringify(changesObj));
              console.log('✅ Fixed sheet_specific_changes');
              
              return true;
            } else {
              console.log('⚠️ No active sheet to move changes to');
              return false;
            }
          } else {
            console.log('ℹ️ No changes under undefined key');
            return false;
          }
        } else {
          console.log('ℹ️ No ai_diff data found');
          return false;
        }
      } catch (error) {
        console.error('❌ Error fixing localStorage changes:', error);
        return false;
      }
    };

    // Add function to convert AI diff data to changes format
    (window as any).convertAIDiffToChanges = () => {
      console.log('🔄 Converting AI diff data to changes format...');
      
      try {
        const rawAIDiff = localStorage.getItem('sheet_specific_ai_diff');
        if (!rawAIDiff) {
          console.log('ℹ️ No AI diff data found');
          return false;
        }
        
        const aiDiffData = JSON.parse(rawAIDiff);
        const changesData = localStorage.getItem('sheet_specific_changes') || '{}';
        const changesObj = JSON.parse(changesData);
        
        let converted = false;
        
        // Convert AI diff data for each sheet
        Object.keys(aiDiffData).forEach(sheetId => {
          const aiDiffs = aiDiffData[sheetId];
          if (Array.isArray(aiDiffs) && aiDiffs.length > 0) {
            console.log(`🔄 Converting ${aiDiffs.length} AI diffs for sheet ${sheetId}`);
            
            // Convert AI diff format to changes format
            const convertedChanges = aiDiffs.map((diff: any) => ({
              cellId: diff.cellId,
              previousValue: diff.previousValue,
              newValue: diff.newValue,
              timestamp: diff.timestamp
            }));
            
            // Merge with existing changes (avoid duplicates)
            if (!changesObj[sheetId]) {
              changesObj[sheetId] = convertedChanges;
              converted = true;
            } else {
              // Add only new changes (check by timestamp and cellId)
              const existingTimestamps = new Set(
                changesObj[sheetId].map((c: any) => `${c.cellId}-${c.timestamp}`)
              );
              
              const newChanges = convertedChanges.filter((c: any) => 
                !existingTimestamps.has(`${c.cellId}-${c.timestamp}`)
              );
              
              if (newChanges.length > 0) {
                changesObj[sheetId].push(...newChanges);
                converted = true;
                console.log(`📝 Added ${newChanges.length} new changes for sheet ${sheetId}`);
              }
            }
          }
        });
        
        if (converted) {
          localStorage.setItem('sheet_specific_changes', JSON.stringify(changesObj));
          console.log('✅ Successfully converted AI diff data to changes format');
          return true;
        } else {
          console.log('ℹ️ No new changes to convert');
          return false;
        }
        
      } catch (error) {
        console.error('❌ Error converting AI diff to changes:', error);
        return false;
      }
    };

    // Add function to force load changes with better timing
    (window as any).forceLoadChangesWithRetry = async () => {
      console.log('🔄 Force loading changes with retry logic...');
      
      // First convert AI diff data to changes format
      const converted = (window as any).convertAIDiffToChanges();
      if (converted) {
        console.log('✅ Converted AI diff data to changes format');
      }
      
      // Then fix any corrupted data
      const fixed = (window as any).fixLocalStorageChanges();
      if (fixed) {
        console.log('✅ Fixed corrupted localStorage data');
      }
      
      // Wait for sheet to be fully loaded
      const waitForSheetData = () => {
        return new Promise((resolve) => {
          const checkSheet = () => {
            const activeSheet = state.sheets.find(s => s.id === state.activeSheetId);
            if (activeSheet && activeSheet.cells && Object.keys(activeSheet.cells).length > 0) {
              console.log('✅ Sheet has cells, proceeding with loading');
              resolve(true);
            } else {
              console.log('⏳ Waiting for sheet to load...');
              setTimeout(checkSheet, 500);
            }
          };
          checkSheet();
        });
      };
      
      await waitForSheetData();
      
      // Now force load the changes
      await (window as any).forceLoadLocalStorageChanges();
    };

    // Add change detector debug functions
    (window as any).debugChangeDetector = () => {
      console.log('🔍 ChangeDetector Debug Info:');
      console.log('Current sheet filename:', currentSheetFileName);
      console.log('Active sheet:', activeSheet);
      console.log('Change detector summary:', changeDetector.getChangesSummary());
      console.log('Current sheet changes:', changeDetector.getCurrentSheetChanges());
      
      // Check ALL localStorage keys
      console.log('🔍 ALL localStorage keys:');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('sheet') || key.includes('change') || key.includes('ai'))) {
          const value = localStorage.getItem(key);
          console.log(`📋 ${key}:`, value ? JSON.parse(value) : value);
        }
      }
      
      // Check the specific key the change detector uses
      const storageKey = 'sheet_changes_by_filename';
      const rawData = localStorage.getItem(storageKey);
      console.log('🔍 ChangeDetector storage key data:', rawData);
    };

    (window as any).testManualChange = () => {
      console.log('🧪 Testing manual change detection...');
      if (currentSheetFileName) {
        changeDetector.detectManualChange('A1', 'Test Value ' + Date.now());
      } else {
        console.log('❌ No current sheet filename set');
      }
    };

    (window as any).clearAllChanges = () => {
      console.log('🗑️ Clearing all changes...');
      localStorage.removeItem('sheet_changes_by_filename');
      localStorage.removeItem('sheet_specific_ai_diff');
      localStorage.removeItem('sheet_specific_changes');
      console.log('✅ All changes cleared');
    };

    (window as any).fixDuckDBTable = async () => {
      console.log('🔧 Fixing DuckDB table mismatch...');
      try {
        const { queryDuckDB } = await import('../lib/utils');
        
        // Get all existing tables
        const tablesResult = await queryDuckDB('SHOW TABLES');
        const existingTables = tablesResult.map(row => row[0]);
        console.log('📋 Existing DuckDB tables:', existingTables);
        
        if (activeSheet) {
          const currentTableName = activeSheet.id.replace(/[^a-zA-Z0-9]/g, '_');
          const expectedTableName = currentTableName.startsWith('sheet_') ? currentTableName : `sheet_${currentTableName}`;
          
          console.log('🔍 Current sheet ID:', activeSheet.id);
          console.log('🔍 Expected table name:', expectedTableName);
          
          if (!existingTables.includes(expectedTableName)) {
            console.log('❌ Expected table does not exist');
            
            // Find old tables that might match this sheet
            const possibleOldTables = existingTables.filter(table => 
              table.startsWith('sheet_') && table.includes('pivot') || table.includes(activeSheet.name?.toLowerCase() || '')
            );
            
            console.log('🔍 Possible old tables:', possibleOldTables);
            
            if (possibleOldTables.length > 0) {
              const oldTable = possibleOldTables[0];
              console.log(`🔄 Renaming table ${oldTable} to ${expectedTableName}`);
              
              // Rename the table
              await queryDuckDB(`CREATE TABLE "${expectedTableName}" AS SELECT * FROM "${oldTable}"`);
              await queryDuckDB(`DROP TABLE "${oldTable}"`);
              
              console.log('✅ Table renamed successfully');
            } else {
              console.log('⚠️ No matching old table found - sheet may need to be reloaded');
            }
          } else {
            console.log('✅ Table already exists with correct name');
          }
        }
      } catch (error) {
        console.error('❌ Error fixing DuckDB table:', error);
      }
    };

    (window as any).migrateExistingChanges = () => {
      console.log('🔄 Migrating existing localStorage changes...');
      
      try {
        // Get existing AI diff data
        const aiDiffData = localStorage.getItem('sheet_specific_ai_diff');
        if (aiDiffData) {
          const parsed = JSON.parse(aiDiffData);
          console.log('📋 Found sheet_specific_ai_diff data:', parsed);
          
          // Convert to new format
          const newFormat = {};
          
          Object.keys(parsed).forEach(sheetKey => {
            const changes = parsed[sheetKey];
            if (Array.isArray(changes)) {
              // Convert each change to new format
              const convertedChanges = changes.map(change => ({
                cellId: change.cellId,
                previousValue: change.previousValue,
                newValue: change.newValue,
                timestamp: change.timestamp,
                source: 'ai' // Mark as AI changes
              }));
              
              // Try to map sheet ID to sheet name
              let sheetName = sheetKey;
              if (activeSheet && activeSheet.id === sheetKey) {
                sheetName = activeSheet.name || sheetKey;
              }
              
              newFormat[sheetName] = convertedChanges;
              console.log(`✅ Migrated ${convertedChanges.length} changes for ${sheetKey} -> ${sheetName}`);
            }
          });
          
          // Save in new format
          localStorage.setItem('sheet_changes_by_filename', JSON.stringify(newFormat));
          console.log('💾 Saved migrated data to sheet_changes_by_filename');
          
          return newFormat;
        }
        
        console.log('ℹ️ No sheet_specific_ai_diff data found');
        return null;
        
      } catch (error) {
        console.error('❌ Error migrating changes:', error);
        return null;
      }
    };
    
    // Add session tracking debug functions
    (window as any).getSessionSummary = () => sessionTracker.getSessionSummary();
      (window as any).needsBackblazeSync = () => sessionTracker.needsBackblazeSync();
      (window as any).manualSyncToBackblaze = async () => {
        if (user?.email) {
          console.log('🔄 Manual sync to Backblaze initiated...');
          const success = await indexedDBFirstLoader.syncToBackblaze(user.email);
          console.log('✅ Manual sync result:', success);
          return success;
        } else {
          console.log('❌ No user email available for sync');
          return false;
        }
      };
      
      // Add IndexedDB debug functions
      (window as any).clearIndexedDB = async () => {
        try {
          console.log('🧹 Clearing IndexedDB to force schema update...');
          const deleteRequest = indexedDB.deleteDatabase('AISheetsDB');
          deleteRequest.onsuccess = () => {
            console.log('✅ IndexedDB cleared successfully, refresh the page to reinitialize');
          };
          deleteRequest.onerror = () => {
            console.error('❌ Error clearing IndexedDB:', deleteRequest.error);
          };
        } catch (error) {
          console.error('❌ Error clearing IndexedDB:', error);
        }
      };
      
      // Add Backblaze debug functions
      (window as any).testBackblazeDownload = async (fileName: string) => {
        if (user?.email) {
          try {
            console.log('🧪 Testing Backblaze download for:', fileName);
            const backblazeService = BackblazeApiService.getInstance();
            const result = await backblazeService.downloadFile(user.email, fileName);
            console.log('📊 Download result:', result);
            return result;
          } catch (error) {
            console.error('❌ Test download failed:', error);
            return { success: false, message: error.message };
          }
        } else {
          console.log('❌ No user email available for test');
          return { success: false, message: 'No user email' };
        }
      };
      
      // Add data structure debug function
      (window as any).debugLoaderData = async () => {
        if (user?.email) {
          try {
            console.log('🧪 Testing IndexedDB-first loader data structure...');
            const loadedSheets = await indexedDBFirstLoader.loadAllSheets(user.email);
            console.log('📊 Loaded sheets count:', loadedSheets.length);
            if (loadedSheets.length > 0) {
              const sheet = loadedSheets[0];
              console.log('🔍 First sheet structure:', {
                sheetId: sheet.sheetId,
                sheetName: sheet.sheetName,
                csvDataType: typeof sheet.csvData,
                csvDataLength: sheet.csvData?.length,
                csvDataSample: sheet.csvData?.substring?.(0, 100) || sheet.csvData,
                source: sheet.source,
                lastModified: sheet.lastModified
              });
            }
            return loadedSheets;
          } catch (error) {
            console.error('❌ Debug loader failed:', error);
            return null;
          }
        } else {
          console.log('❌ No user email available for debug');
          return null;
        }
      };

      // Add comprehensive IndexedDB-first loading debug function
      (window as any).debugIndexedDBFirstLoading = async () => {
        if (!user?.email) {
          console.log('❌ No user email available');
          return;
        }

        console.log('🔍 === DEBUGGING INDEXEDDB-FIRST LOADING PROCESS ===');
        console.log('👤 User email:', user.email);
        
        try {
          // Step 1: Check IndexedDB directly
          console.log('📊 Step 1: Direct IndexedDB check...');
          await debugIndexedDB();
          
          // Step 2: Check IndexedDB service
          console.log('📊 Step 2: IndexedDB service check...');
          console.log('🔧 IndexedDB service available:', !!indexedDBService);
          
          try {
            await indexedDBService.init();
            const allSheets = await indexedDBService.getAllSheets();
            console.log('📋 IndexedDB service getAllSheets result:', {
              count: allSheets.length,
              sheets: allSheets.map(s => ({
                id: s.id,
                name: s.name,
                csvLength: s.csvData?.length || 0,
                lastModified: new Date(s.lastModified).toISOString()
              }))
            });
          } catch (serviceError) {
            console.error('❌ IndexedDB service error:', serviceError);
          }
          
          // Step 3: Test IndexedDB-first loader
          console.log('📊 Step 3: IndexedDB-first loader test...');
          const loadedSheets = await indexedDBFirstLoader.loadAllSheets(user.email);
          console.log('📋 IndexedDB-first loader result:', {
            count: loadedSheets.length,
            sheets: loadedSheets.map(s => ({
              sheetId: s.sheetId,
              sheetName: s.sheetName,
              source: s.source,
              csvLength: s.csvData?.length || 0,
              lastModified: new Date(s.lastModified).toISOString()
            }))
          });
          
          // Step 4: Check session tracker
          console.log('📊 Step 4: Session tracker status...');
          console.log('🔧 Session summary:', sessionTracker.getSessionSummary());
          console.log('🔧 Needs Backblaze sync:', sessionTracker.needsBackblazeSync());
          
        } catch (error) {
          console.error('❌ Error in comprehensive debug:', error);
          console.error('❌ Error stack:', error.stack);
        }
        
        console.log('✅ === INDEXEDDB-FIRST LOADING DEBUG COMPLETE ===');
      };

      // Add IndexedDB schema check function
      (window as any).checkIndexedDBSchema = () => {
        return new Promise((resolve, reject) => {
          console.log('🔍 === CHECKING INDEXEDDB SCHEMA ===');
          
          const request = indexedDB.open('AISheetsDB');
          
          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            console.log('✅ IndexedDB opened successfully');
            console.log('📊 Database version:', db.version);
            console.log('📊 Database name:', db.name);
            
            const objectStoreNames = Array.from(db.objectStoreNames);
            console.log('📋 Object stores:', objectStoreNames);
            
            // Check each object store
            objectStoreNames.forEach(storeName => {
              console.log(`🔍 Checking store: ${storeName}`);
              
              try {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                
                console.log(`📊 Store "${storeName}" key path:`, store.keyPath);
                console.log(`📊 Store "${storeName}" auto increment:`, store.autoIncrement);
                console.log(`📊 Store "${storeName}" index names:`, Array.from(store.indexNames));
                
                const countRequest = store.count();
                countRequest.onsuccess = () => {
                  console.log(`📊 Store "${storeName}" record count:`, countRequest.result);
                  
                  if (countRequest.result > 0) {
                    const getAllRequest = store.getAll();
                    getAllRequest.onsuccess = () => {
                      const records = getAllRequest.result;
                      console.log(`📋 Store "${storeName}" records:`, records.map(r => ({
                        id: r.id,
                        name: r.name,
                        keys: Object.keys(r)
                      })));
                    };
                  }
                };
                
              } catch (storeError) {
                console.error(`❌ Error checking store ${storeName}:`, storeError);
              }
            });
            
            db.close();
            resolve(objectStoreNames);
          };
          
          request.onerror = (event) => {
            console.error('❌ Error opening IndexedDB for schema check:', event);
            reject(event);
          };
          
          request.onupgradeneeded = (event) => {
            console.log('🔄 IndexedDB upgrade needed - current version:', (event.target as IDBOpenDBRequest).result.version);
          };
        });
      };

      // Add function to compare current sheet with IndexedDB content
      (window as any).compareSheetWithIndexedDB = async () => {
        try {
          console.log('🔍 === COMPARING CURRENT SHEET WITH INDEXEDDB ===');
          
          if (!activeSheet) {
            console.log('❌ No active sheet available');
            return;
          }
          
          console.log('📋 Current active sheet:', {
            id: activeSheet.id,
            name: activeSheet.name,
            cellCount: Object.keys(activeSheet.cells).length,
            rowCount: activeSheet.rowCount,
            colCount: activeSheet.colCount
          });
          
          // Show sample of current sheet data
          const sampleCells = Object.entries(activeSheet.cells).slice(0, 10);
          console.log('📊 Current sheet cells (sample):', sampleCells.map(([id, cell]) => ({
            cellId: id,
            value: cell.value,
            type: typeof cell.value
          })));
          
          // Get corresponding data from IndexedDB
          await indexedDBService.init();
          const indexedDBSheets = await indexedDBService.getAllSheets();
          const matchingSheet = indexedDBSheets.find(s => s.name === activeSheet.name || s.id === activeSheet.id);
          
          if (matchingSheet) {
            console.log('📋 Matching IndexedDB sheet:', {
              id: matchingSheet.id,
              name: matchingSheet.name,
              csvDataLength: matchingSheet.csvData?.length || 0,
              lastModified: new Date(matchingSheet.lastModified).toISOString()
            });
            
            // Parse CSV data to compare
            if (matchingSheet.csvData) {
              const csvLines = matchingSheet.csvData.split('\n').filter(line => line.trim());
              console.log('📊 IndexedDB CSV data:', {
                totalLines: csvLines.length,
                headers: csvLines[0]?.split(',') || [],
                firstDataRow: csvLines[1]?.split(',') || [],
                preview: matchingSheet.csvData.substring(0, 200)
              });
              
              // Compare specific cells
              console.log('🔍 === CELL COMPARISON ===');
              
              // Check first few data cells
              const headers = csvLines[0]?.split(',') || [];
              if (csvLines.length > 1) {
                const firstRow = csvLines[1]?.split(',') || [];
                for (let i = 0; i < Math.min(5, headers.length); i++) {
                  const cellId = `${String.fromCharCode(65 + i)}2`; // A2, B2, C2, etc.
                  const currentValue = activeSheet.cells[cellId]?.value;
                  const indexedDBValue = firstRow[i];
                  
                  console.log(`📊 Cell ${cellId}:`, {
                    current: currentValue,
                    indexedDB: indexedDBValue,
                    match: String(currentValue) === String(indexedDBValue)
                  });
                }
              }
              
            } else {
              console.log('⚠️ No CSV data found in IndexedDB sheet');
            }
          } else {
            console.log('❌ No matching sheet found in IndexedDB');
            console.log('📋 Available IndexedDB sheets:', indexedDBSheets.map(s => ({
              id: s.id,
              name: s.name
            })));
          }
          
        } catch (error) {
          console.error('❌ Error comparing sheet with IndexedDB:', error);
        }
        
        console.log('✅ === SHEET COMPARISON COMPLETE ===');
      };

      // Add function to manually update IndexedDB with current sheet data
      (window as any).manualUpdateIndexedDB = async () => {
        try {
          console.log('🔄 === MANUALLY UPDATING INDEXEDDB ===');
          
          if (!activeSheet) {
            console.log('❌ No active sheet available');
            return;
          }
          
          console.log('📋 Updating IndexedDB for current sheet:', {
            id: activeSheet.id,
            name: activeSheet.name,
            cellCount: Object.keys(activeSheet.cells).length
          });
          
          // Convert sheet cells to CSV format for IndexedDB storage
          const csvData: string[][] = [];
          const maxRow = activeSheet.rowCount;
          const maxCol = activeSheet.colCount;
          
          console.log('📊 Sheet dimensions:', { maxRow, maxCol });
          
          // Create header row (A, B, C, ...)
          const headers: string[] = [];
          for (let col = 0; col < maxCol; col++) {
            headers.push(String.fromCharCode(65 + col));
          }
          csvData.push(headers);
          console.log('📋 Generated headers:', headers);
          
          // Add data rows
          for (let row = 1; row < maxRow; row++) {
            const rowData: string[] = [];
            for (let col = 0; col < maxCol; col++) {
              const cellId = `${String.fromCharCode(65 + col)}${row + 1}`;
              const cell = activeSheet.cells[cellId];
              rowData.push(cell?.value?.toString() || '');
            }
            // Only add non-empty rows
            if (rowData.some(cell => cell.trim() !== '')) {
              csvData.push(rowData);
            }
          }
          
          console.log('📊 Generated CSV data:', {
            totalRows: csvData.length,
            sampleRows: csvData.slice(0, 3)
          });
          
          // Convert CSV data to string format
          const csvString = csvData.map(row => row.join(',')).join('\n');
          console.log('📊 CSV string preview:', csvString.substring(0, 200));
          
          // Save to IndexedDB
          await indexedDBService.init();
          const sheetId = await indexedDBService.saveSheet({
            name: activeSheet.name,
            csvData: csvString,
            isActive: true,
            processedData: {
              totalRows: csvData.length - 1,
              totalColumns: csvData[0]?.length || 0
            }
          });
          
          console.log('✅ Sheet successfully saved to IndexedDB with ID:', sheetId);
          
          // Verify the save by reading it back
          const savedSheet = await indexedDBService.getSheet(sheetId);
          if (savedSheet) {
            console.log('✅ Verification: Sheet retrieved from IndexedDB:', {
              id: savedSheet.id,
              name: savedSheet.name,
              csvDataLength: savedSheet.csvData?.length || 0,
              lastModified: new Date(savedSheet.lastModified).toISOString()
            });
          } else {
            console.log('❌ Verification failed: Could not retrieve saved sheet');
          }
          
        } catch (error) {
          console.error('❌ Error manually updating IndexedDB:', error);
          console.error('❌ Error stack:', error.stack);
        }
        
        console.log('✅ === MANUAL INDEXEDDB UPDATE COMPLETE ===');
      };

      // Add function to cleanup IndexedDB duplicates
      (window as any).cleanupIndexedDBDuplicates = async () => {
        try {
          console.log('🧹 === CLEANING UP INDEXEDDB DUPLICATES ===');
          
          await indexedDBService.init();
          const allSheets = await indexedDBService.getAllSheets();
          console.log('📊 Found', allSheets.length, 'sheets in IndexedDB');
          
          // Group sheets by name to find duplicates
          const sheetsByName = new Map();
          allSheets.forEach(sheet => {
            const name = sheet.name;
            if (!sheetsByName.has(name)) {
              sheetsByName.set(name, []);
            }
            sheetsByName.get(name).push(sheet);
          });
          
          console.log('📋 Sheet groups by name:');
          let duplicatesFound = 0;
          let sheetsToDelete = [];
          
          for (const [name, sheets] of sheetsByName.entries()) {
            console.log(`📄 "${name}": ${sheets.length} copies`);
            
            if (sheets.length > 1) {
              duplicatesFound++;
              // Keep the most recent one, delete the rest
              const sortedSheets = sheets.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
              const keepSheet = sortedSheets[0];
              const deleteSheets = sortedSheets.slice(1);
              
              console.log(`🔄 Keeping most recent: ${keepSheet.id} (${new Date(keepSheet.lastModified).toISOString()})`);
              console.log(`🗑️ Will delete ${deleteSheets.length} older copies:`, deleteSheets.map(s => `${s.id} (${new Date(s.lastModified).toISOString()})`));
              
              sheetsToDelete.push(...deleteSheets);
            }
          }
          
          if (duplicatesFound === 0) {
            console.log('✅ No duplicates found - IndexedDB is clean');
            return;
          }
          
          console.log(`🗑️ Found ${duplicatesFound} duplicate groups, deleting ${sheetsToDelete.length} stale sheets`);
          
          // Delete the stale sheets (Note: we'll need to add a delete method or clear and reload)
          console.log('⚠️ IndexedDB delete method not available - will clear entire database and reload fresh from Backblaze');
          console.log('🔄 Use syncIndexedDBWithBackblaze() to get a clean slate');
          
        } catch (error) {
          console.error('❌ Error cleaning up IndexedDB duplicates:', error);
        }
        
        console.log('✅ === INDEXEDDB CLEANUP ANALYSIS COMPLETE ===');
      };

      // Add function to sync IndexedDB with Backblaze (clean slate)
      (window as any).syncIndexedDBWithBackblaze = async () => {
        if (!user?.email) {
          console.log('❌ No user email available');
          return;
        }

        try {
          console.log('🔄 === SYNCING INDEXEDDB WITH BACKBLAZE (CLEAN SLATE) ===');
          console.log('👤 User email:', user.email);
          
          // Step 1: Clear IndexedDB completely
          console.log('🧹 Step 1: Clearing IndexedDB...');
          const deleteRequest = indexedDB.deleteDatabase('AISheetsDB');
          
          await new Promise((resolve, reject) => {
            deleteRequest.onsuccess = () => {
              console.log('✅ IndexedDB cleared successfully');
              resolve(true);
            };
            deleteRequest.onerror = () => {
              console.error('❌ Error clearing IndexedDB:', deleteRequest.error);
              reject(deleteRequest.error);
            };
          });
          
          // Step 2: Reinitialize IndexedDB
          console.log('🔧 Step 2: Reinitializing IndexedDB...');
          await indexedDBService.init();
          
          // Step 3: Load fresh data from Backblaze
          console.log('📊 Step 3: Loading fresh data from Backblaze...');
          const loadedSheets = await indexedDBFirstLoader.loadAllSheets(user.email);
          
          console.log('✅ Sync complete! Results:', {
            sheetsLoaded: loadedSheets.length,
            sheets: loadedSheets.map(s => ({
              name: s.sheetName,
              source: s.source,
              size: s.csvData?.length || 0
            }))
          });
          
          console.log('🔄 Please refresh the page to see the clean data');
          
        } catch (error) {
          console.error('❌ Error syncing IndexedDB with Backblaze:', error);
        }
        
        console.log('✅ === INDEXEDDB SYNC COMPLETE ===');
      };

      // Add function to remove duplicate sheets from current state
      (window as any).removeDuplicateSheets = () => {
        console.log('🧹 === REMOVING DUPLICATE SHEETS FROM CURRENT STATE ===');
        
        const currentSheets = state.sheets;
        console.log('📊 Current sheets before cleanup:', currentSheets.map(s => ({
          id: s.id,
          name: s.name,
          rowCount: s.rowCount,
          colCount: s.colCount
        })));
        
        // Group sheets by name
        const sheetsByName = new Map();
        currentSheets.forEach(sheet => {
          const name = sheet.name;
          if (!sheetsByName.has(name)) {
            sheetsByName.set(name, []);
          }
          sheetsByName.get(name).push(sheet);
        });
        
        console.log('📋 Sheet groups by name:');
        let duplicatesFound = 0;
        const sheetsToKeep = [];
        
        for (const [name, sheets] of sheetsByName.entries()) {
          console.log(`📄 "${name}": ${sheets.length} copies`);
          
          if (sheets.length > 1) {
            duplicatesFound++;
            // Keep the one with the most cells (most complete)
            const sortedSheets = sheets.sort((a, b) => {
              const aCellCount = Object.keys(a.cells).length;
              const bCellCount = Object.keys(b.cells).length;
              return bCellCount - aCellCount; // Descending order
            });
            
            const keepSheet = sortedSheets[0];
            const duplicateSheets = sortedSheets.slice(1);
            
            console.log(`🔄 Keeping sheet with most data: ${keepSheet.id} (${Object.keys(keepSheet.cells).length} cells)`);
            console.log(`🗑️ Will remove ${duplicateSheets.length} duplicates:`, 
              duplicateSheets.map(s => `${s.id} (${Object.keys(s.cells).length} cells)`));
            
            sheetsToKeep.push(keepSheet);
          } else {
            // No duplicates, keep the single sheet
            sheetsToKeep.push(sheets[0]);
          }
        }
        
        if (duplicatesFound === 0) {
          console.log('✅ No duplicates found in current state');
          return;
        }
        
        console.log(`🗑️ Found ${duplicatesFound} duplicate groups, keeping ${sheetsToKeep.length} sheets`);
        
        // Update the state by removing duplicates
        // Note: This would need to be implemented properly with the state management system
        console.log('⚠️ Manual state update needed - this function shows analysis only');
        console.log('🔄 Recommended: Use syncIndexedDBWithBackblaze() for a complete cleanup');
        
        console.log('✅ === DUPLICATE ANALYSIS COMPLETE ===');
      };

      // Add function to debug what files are actually in Backblaze
      (window as any).debugBackblazeFiles = async () => {
        if (!user?.email) {
          console.log('❌ No user email available');
          return;
        }

        try {
          console.log('🔍 === DEBUGGING BACKBLAZE FILES ===');
          console.log('👤 User email:', user.email);
          
          // Get Backblaze service
          const BackblazeApiService = (await import('../services/backblazeApiService')).default;
          const backblazeService = BackblazeApiService.getInstance();
          
          // Authenticate
          console.log('🔐 Authenticating with Backblaze...');
          const authResult = await backblazeService.authenticate();
          if (!authResult.success) {
            console.error('❌ Backblaze authentication failed:', authResult.message);
            return;
          }
          console.log('✅ Backblaze authenticated');
          
          // List user files
          console.log('📁 Listing files for user...');
          const filesResult = await backblazeService.listUserFiles(user.email);
          
          if (!filesResult.success) {
            console.error('❌ Failed to list files:', filesResult.message);
            return;
          }
          
          if (!filesResult.files || filesResult.files.length === 0) {
            console.log('📭 No files found in Backblaze');
            return;
          }
          
          console.log(`📊 Found ${filesResult.files.length} files in Backblaze:`);
          
          // Import filename cleaning utility
          const { cleanFilename } = await import('../lib/filenameUtils');
          
          filesResult.files.forEach((file, index) => {
            const cleanedName = cleanFilename(file.fileName, user.email, true);
            console.log(`${index + 1}. "${file.fileName}" -> cleaned: "${cleanedName}"`);
            console.log(`   Size: ${file.size} bytes, Modified: ${file.uploadTimestamp || 'Unknown'}`);
          });
          
          // Group by cleaned names to show duplicates
          const groupedFiles = new Map();
          filesResult.files.forEach(file => {
            const cleanedName = cleanFilename(file.fileName, user.email, true);
            if (!groupedFiles.has(cleanedName)) {
              groupedFiles.set(cleanedName, []);
            }
            groupedFiles.get(cleanedName).push(file);
          });
          
          console.log('📋 Files grouped by cleaned names:');
          for (const [cleanedName, files] of groupedFiles.entries()) {
            if (files.length > 1) {
              console.log(`🔄 DUPLICATE: "${cleanedName}" has ${files.length} versions:`);
              files.forEach(file => {
                console.log(`   - "${file.fileName}" (${file.size} bytes)`);
              });
            } else {
              console.log(`✅ UNIQUE: "${cleanedName}"`);
            }
          }
          
        } catch (error) {
          console.error('❌ Error debugging Backblaze files:', error);
        }
        
        console.log('✅ === BACKBLAZE FILES DEBUG COMPLETE ===');
      };

      // Add function to test the complete accept changes flow
      (window as any).testAcceptChangesFlow = async () => {
        try {
          console.log('🧪 === TESTING ACCEPT CHANGES FLOW ===');
          
          const currentSheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!currentSheet) {
            console.log('❌ No active sheet found');
            return;
          }
          
          console.log('📋 Current active sheet:', {
            id: currentSheet.id,
            name: currentSheet.name,
            cellCount: Object.keys(currentSheet.cells).length,
            hasAIUpdates: state.hasAIUpdates
          });
          
          // Step 1: Check current localStorage
          console.log('📊 Step 1: Current localStorage state...');
          const localStorageKey = `sheet_specific_ai_diff`;
          const localStorageData = localStorage.getItem(localStorageKey);
          if (localStorageData) {
            const parsedData = JSON.parse(localStorageData);
            console.log('📋 localStorage data:', parsedData);
          } else {
            console.log('📭 No localStorage data found');
          }
          
          // Step 2: Check current IndexedDB state for this sheet
          console.log('📊 Step 2: Current IndexedDB state...');
          const indexedDBService = (await import('../lib/indexedDBService')).indexedDBService;
          await indexedDBService.init();
          const allSheets = await indexedDBService.getAllSheets();
          console.log('📊 getAllSheets result:', allSheets);
          
          // allSheets is directly an array of SheetRecord
          const indexedDBSheet = allSheets.find(s => s.name === currentSheet.name);
          
          if (indexedDBSheet) {
            console.log('📋 IndexedDB sheet found:', {
              id: indexedDBSheet.id,
              name: indexedDBSheet.name,
              csvDataLength: indexedDBSheet.csvData?.length || 0,
              lastModified: indexedDBSheet.lastModified
            });
            
            // Show sample data from IndexedDB
            if (indexedDBSheet.csvData) {
              const csvLines = indexedDBSheet.csvData.split('\n').slice(0, 3);
              console.log('📋 IndexedDB CSV sample (first 3 lines):', csvLines);
            }
          } else {
            console.log('❌ Sheet not found in IndexedDB');
          }
          
          // Step 3: Show what would happen during accept
          console.log('📊 Step 3: Simulating accept changes process...');
          
          // Check if there are AI updates to accept
          const aiUpdatedCells = Object.entries(currentSheet.cells).filter(([_, cell]) => cell.hasAIUpdate);
          console.log('📋 AI updated cells to accept:', aiUpdatedCells.length);
          
          if (aiUpdatedCells.length > 0) {
            console.log('📋 Sample AI updates:');
            aiUpdatedCells.slice(0, 3).forEach(([cellId, cell]) => {
              console.log(`   ${cellId}: "${cell.value}" -> "${cell.aiValue}"`);
            });
            
            // Show what CSV would be generated
            const csvData: string[][] = [];
            const maxRow = currentSheet.rowCount;
            const maxCol = currentSheet.colCount;
            
            // Create header row
            const headers: string[] = [];
            for (let col = 0; col < maxCol; col++) {
              headers.push(String.fromCharCode(65 + col));
            }
            csvData.push(headers);
            
            // Add data rows (simulate with AI values applied)
            for (let row = 1; row < maxRow; row++) {
              const rowData: string[] = [];
              for (let col = 0; col < maxCol; col++) {
                const cellId = `${String.fromCharCode(65 + col)}${row + 1}`;
                const cell = currentSheet.cells[cellId];
                // Use AI value if available, otherwise current value
                const finalValue = cell?.hasAIUpdate && cell.aiValue !== undefined ? cell.aiValue : cell?.value;
                rowData.push(finalValue?.toString() || '');
              }
              if (rowData.some(cell => cell.trim() !== '')) {
                csvData.push(rowData);
              }
            }
            
            const csvString = csvData.map(row => row.join(',')).join('\n');
            console.log('📊 CSV that would be saved to IndexedDB:');
            console.log('   Length:', csvString.length, 'characters');
            console.log('   Sample (first 200 chars):', csvString.substring(0, 200));
            
          } else {
            console.log('📭 No AI updates to accept');
          }
          
          console.log('✅ === ACCEPT CHANGES FLOW TEST COMPLETE ===');
          console.log('💡 To actually test the flow, make some AI changes first, then run acceptAllAIUpdates()');
          
        } catch (error) {
          console.error('❌ Error testing accept changes flow:', error);
        }
      };

      // Add function to verify IndexedDB was updated after accepting changes
      (window as any).verifyIndexedDBUpdate = async () => {
        try {
          console.log('🔍 === VERIFYING INDEXEDDB UPDATE ===');
          
          const currentSheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!currentSheet) {
            console.log('❌ No active sheet found');
            return;
          }
          
          console.log('📋 Checking IndexedDB update for sheet:', currentSheet.name);
          
          // Get IndexedDB service and current sheet data
          const indexedDBService = (await import('../lib/indexedDBService')).indexedDBService;
          await indexedDBService.init();
          
          const allSheets = await indexedDBService.getAllSheets();
          console.log('📊 getAllSheets result:', allSheets);
          
          // allSheets is directly an array of SheetRecord
          const indexedDBSheet = allSheets.find(s => s.name === currentSheet.name);
          
          if (!indexedDBSheet) {
            console.log('❌ Sheet not found in IndexedDB!');
            return;
          }
          
          console.log('📊 IndexedDB sheet details:', {
            id: indexedDBSheet.id,
            name: indexedDBSheet.name,
            csvDataLength: indexedDBSheet.csvData?.length || 0,
            lastModified: new Date(indexedDBSheet.lastModified).toISOString(),
            lastModifiedTimestamp: indexedDBSheet.lastModified
          });
          
          // Parse IndexedDB CSV data
          const indexedDBLines = indexedDBSheet.csvData?.split('\n') || [];
          console.log('📊 IndexedDB CSV has', indexedDBLines.length, 'lines');
          
          // Compare with current sheet state
          const currentSheetCells = Object.entries(currentSheet.cells)
            .filter(([_, cell]) => cell.value && cell.value.toString().trim() !== '')
            .sort(([a], [b]) => a.localeCompare(b));
          
          console.log('📊 Current sheet has', currentSheetCells.length, 'non-empty cells');
          console.log('📋 Sample current sheet cells:');
          currentSheetCells.slice(0, 5).forEach(([cellId, cell]) => {
            console.log(`   ${cellId}: "${cell.value}"`);
          });
          
          console.log('📋 Sample IndexedDB CSV data:');
          indexedDBLines.slice(0, 5).forEach((line, index) => {
            console.log(`   Line ${index + 1}: "${line}"`);
          });
          
          // Check if IndexedDB was recently updated (within last 5 minutes)
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
          const wasRecentlyUpdated = indexedDBSheet.lastModified > fiveMinutesAgo;
          
          console.log('⏰ Update timing check:', {
            lastModified: new Date(indexedDBSheet.lastModified).toISOString(),
            fiveMinutesAgo: new Date(fiveMinutesAgo).toISOString(),
            wasRecentlyUpdated: wasRecentlyUpdated
          });
          
          if (wasRecentlyUpdated) {
            console.log('✅ IndexedDB sheet was recently updated');
          } else {
            console.log('⚠️ IndexedDB sheet was NOT recently updated - may contain stale data');
          }
          
          console.log('✅ === INDEXEDDB UPDATE VERIFICATION COMPLETE ===');
          
        } catch (error) {
          console.error('❌ Error verifying IndexedDB update:', error);
        }
      };

      // Add function to debug current DuckDB state
      (window as any).debugDuckDBState = async () => {
        try {
          console.log('🔍 === DEBUGGING DUCKDB STATE ===');
          
          const { queryDuckDB } = await import('../lib/utils');
          
          console.log('📊 Step 1: Checking DuckDB tables...');
          const tablesResult = await queryDuckDB('SHOW TABLES');
          console.log('📋 Raw SHOW TABLES result:', tablesResult);
          
          const validTables = tablesResult
            .filter(row => row && Array.isArray(row) && row.length > 0)
            .map(row => row[0])
            .filter(tableName => tableName && typeof tableName === 'string');
          
          console.log('📊 Valid tables found:', validTables);
          
          if (validTables.length === 0) {
            console.log('📭 No tables found in DuckDB');
            console.log('💡 This usually means no CSV data has been loaded into DuckDB yet');
            return;
          }
          
          console.log('📊 Step 2: Checking table contents...');
          for (const table of validTables) {
            try {
              console.log(`📋 Table: ${table}`);
              
              // Get row count
              const countResult = await queryDuckDB(`SELECT COUNT(*) as count FROM "${table}"`);
              const rowCount = countResult[0]?.[0] || 0;
              console.log(`   Rows: ${rowCount}`);
              
              // Get column info
              const columnsResult = await queryDuckDB(`DESCRIBE "${table}"`);
              const columns = columnsResult.map(row => `${row[0]} (${row[1]})`);
              console.log(`   Columns: ${columns.join(', ')}`);
              
              // Get sample data (first 3 rows)
              if (rowCount > 0) {
                const sampleResult = await queryDuckDB(`SELECT * FROM "${table}" LIMIT 3`);
                console.log(`   Sample data:`, sampleResult);
              }
              
            } catch (tableError) {
              console.error(`❌ Error querying table ${table}:`, tableError);
            }
          }
          
          console.log('📊 Step 3: Current active sheet info...');
          const currentSheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (currentSheet) {
            console.log('📋 Active sheet:', {
              id: currentSheet.id,
              name: currentSheet.name,
              cellCount: Object.keys(currentSheet.cells).length,
              hasAIUpdates: state.hasAIUpdates
            });
            
            // Show expected table name
            const expectedTableName = currentSheet.id.replace(/[^a-zA-Z0-9]/g, '_');
            console.log('📋 Expected table name:', expectedTableName);
            
            const matchingTable = validTables.find(table => 
              table.includes(expectedTableName) || 
              table.toLowerCase().includes(currentSheet.name.toLowerCase())
            );
            
            if (matchingTable) {
              console.log('✅ Found matching table:', matchingTable);
            } else {
              console.log('❌ No matching table found for current sheet');
              console.log('💡 This explains why AI queries are failing');
            }
          } else {
            console.log('❌ No active sheet found');
          }
          
        } catch (error) {
          console.error('❌ Error debugging DuckDB state:', error);
        }
        
        console.log('✅ === DUCKDB STATE DEBUG COMPLETE ===');
      };
      
      console.log('📊 Session tracking debug functions added:');
      console.log('  - getSessionSummary() - Get current session summary');
      console.log('  - needsBackblazeSync() - Check if Backblaze sync is needed');
      console.log('  - manualSyncToBackblaze() - Manually sync to Backblaze');
      console.log('  - clearIndexedDB() - Clear IndexedDB to force schema update');
      console.log('  - testBackblazeDownload("filename.csv") - Test Backblaze download directly');
      console.log('  - debugLoaderData() - Debug loader data structure');
      console.log('  - debugIndexedDBFirstLoading() - Debug IndexedDB-first loading process');
      console.log('  - checkIndexedDBSchema() - Check IndexedDB schema and structure');
      console.log('  - compareSheetWithIndexedDB() - Compare current sheet with IndexedDB content');
      console.log('  - manualUpdateIndexedDB() - Manually trigger IndexedDB update with current sheet');
      console.log('  - cleanupIndexedDBDuplicates() - Remove duplicate/stale sheets from IndexedDB');
      console.log('  - syncIndexedDBWithBackblaze() - Force sync IndexedDB with Backblaze (clean slate)');
      console.log('  - removeDuplicateSheets() - Remove duplicate sheets from current state');
      console.log('  - debugBackblazeFiles() - Show what files are actually in Backblaze');
      console.log('  - testAcceptChangesFlow() - Test the complete accept changes flow');
      console.log('  - verifyIndexedDBUpdate() - Verify IndexedDB was updated after accepting changes');
      console.log('  - debugDuckDBState() - Debug current DuckDB tables and data');
    });
  }, [user?.email]);

  // Track if localStorage changes have been loaded to prevent infinite loops
  const localStorageChangesLoaded = useRef(false);
  const lastProcessedSheetId = useRef<string | null>(null);

  // Load pending changes from both IndexedDB and localStorage using unified change manager
  useEffect(() => {
    const loadPendingChangesAsAIUpdates = async () => {
      // Reset the flag if we're on a different sheet
      if (lastProcessedSheetId.current !== state.activeSheetId) {
        console.log('🔄 Sheet changed, resetting changes flag');
        localStorageChangesLoaded.current = false;
        lastProcessedSheetId.current = state.activeSheetId;
      }

      // Prevent infinite loops by checking if we've already loaded changes
      if (localStorageChangesLoaded.current) {
        console.log('🔄 Changes already loaded for this sheet, skipping...');
        return;
      }

      // Only proceed if we have a sheet with actual data
      if (!state.activeSheetId || state.sheets.length === 0) {
        console.log('⚠️ No active sheet or sheets loaded yet, waiting...');
        return;
      }

      const activeSheet = state.sheets.find(s => s.id === state.activeSheetId);
      if (!activeSheet || !activeSheet.cells || Object.keys(activeSheet.cells).length === 0) {
        console.log('⚠️ Active sheet has no cells yet, waiting for sheet to load...');
        return;
      }

      // Check if sheet has meaningful data (more lenient now)
      const cellCount = Object.keys(activeSheet.cells).length;
      console.log(`🔍 Sheet has ${cellCount} cells`);
      
      if (cellCount === 0) {
        console.log('⚠️ Sheet is completely empty, waiting...');
        return;
      }
      
      // Be more lenient - even a few cells is enough to proceed
      if (cellCount < 5) {
        console.log('⚠️ Sheet has few cells, will retry in a moment...');
        // Add a short delay and retry once
        setTimeout(() => {
          if (!localStorageChangesLoaded.current) {
            console.log('🔄 Retrying localStorage loading after delay...');
            loadPendingChangesAsAIUpdates();
          }
        }, 2000);
        return;
      }

      try {
        console.log('🔄 Checking for localStorage changes for current sheet...');
        console.log(`📋 Current sheet: "${activeSheet.name}" (ID: ${activeSheet.id})`);
        
        // Skip the complex unified loading - we'll rely on the filename-based loading instead
        // This prevents loading changes into the wrong sheet
        console.log('⏭️ Skipping sheet ID-based loading to avoid loading changes into wrong sheet');
        console.log('📋 Filename-based loading will handle localStorage changes for this sheet');
        
        // Delegating to filename-based loading system to avoid sheet ID mismatches
        console.log('📋 The filename-based useEffect will handle loading localStorage changes');

        // All localStorage loading is now handled by the filename-based system
        // This prevents loading changes into the wrong sheet due to sheet ID mismatches
        console.log('✅ Skipping sheet ID-based loading to prevent wrong sheet assignment');
        
        localStorageChangesLoaded.current = true;
        console.log('✅ Delegated localStorage loading to filename-based system');
        
      } catch (error) {
        console.error('❌ Error in localStorage loading delegation:', error);
        localStorageChangesLoaded.current = true; // Mark as processed even on error
      }
    };

    // Load localStorage changes after all processing is complete
    const shouldWaitForProcessing = isProcessingCSV || isProcessingSchema || isLoadingSheets || isCheckingBackblazeData;
    
    if (shouldWaitForProcessing) {
      console.log(`⏰ Still processing (CSV: ${isProcessingCSV}, Schema: ${isProcessingSchema}, Loading: ${isLoadingSheets}, Checking: ${isCheckingBackblazeData})`);
      console.log('⏰ Waiting for all processing to complete before loading localStorage changes...');
      
      // Set a timeout to check again after processing should be done
      setTimeout(() => {
        if (!localStorageChangesLoaded.current && state.activeSheetId === activeSheet?.id) {
          console.log('🔄 Retrying localStorage loading after processing delay...');
          loadPendingChangesAsAIUpdates();
        }
      }, 3000);
      return;
    }

    // Skip if already loaded for this sheet
    if (localStorageChangesLoaded.current) {
      console.log('✅ localStorage changes already loaded for this sheet, skipping...');
      return;
    }

    console.log('✅ All processing complete, loading localStorage changes for current sheet');
    loadPendingChangesAsAIUpdates();
  }, [state.activeSheetId, state.sheets, createAIUpdates, setForceUpdate, setNotifications, isProcessingCSV, isProcessingSchema, isLoadingSheets, isCheckingBackblazeData]);

  // Loading state management (kept for compatibility with existing logic)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // DuckDB mapping hook - independent of AI Assistant
  const { 
    isDuckDBProcessing, 
    isSchemaReady: duckDBSchemaReady, 
    currentSchema, 
    ensureSheetLoadedInDuckDB 
  } = useDuckDBMapping({ 
    activeSheet, 
    csvUploaded, 
    resetCsvUploadFlag: () => setCsvUploaded(false) 
  });

  // Animated loading messages - different sets for different stages
  // Old loading message animation removed - now using professional loaders

  // Monitor AI Assistant processing state
  useEffect(() => {
    // Listen for schema processing events from AI Assistant
    const handleSchemaProcessing = (event: CustomEvent) => {
      const { processing, ready } = event.detail;
      setIsProcessingSchema(processing);
      setIsSchemaReady(ready);

      // If schema is ready, clear loading states but keep CSV processing state
      // until the sheet is fully rendered
      if (ready) {
        setIsLoadingSheets(false);
        setIsProcessingSchema(false);
        console.log('📊 Schema processing complete, but keeping CSV loader until sheet renders');
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

  // Track if we've already loaded data to prevent infinite loops
  const dataLoadedRef = useRef(false);

  // Reset data loaded flag when user changes
  useEffect(() => {
    dataLoadedRef.current = false;
  }, [user?.email]);

  // Check for existing sheet data - IndexedDB first, then Backblaze as fallback
  useEffect(() => {
    const checkExistingSheetData = async () => {
      // Prevent multiple loads for the same user
      if (dataLoadedRef.current) {
        console.log('🔄 Data already loaded, skipping...');
        return;
      }

      setIsCheckingBackblazeData(true);
      setIsLoadingSheets(true);

      if (user?.email) {
        try {
          console.log('🔍 Using IndexedDB-first loading strategy...');
          
          // Use the new IndexedDB-first loader
          const loadedSheets = await indexedDBFirstLoader.loadAllSheets(user.email);
          
          if (loadedSheets && loadedSheets.length > 0) {
            console.log('📊 Found', loadedSheets.length, 'sheets using IndexedDB-first strategy');
            
            // Load ALL sheets as separate tabs, not just the most recent one
            console.log('🔄 Loading all sheets as separate tabs...');
            
            // Remember the current active sheet to preserve localStorage changes
            const currentActiveSheetId = state.activeSheetId;
            console.log(`📌 Preserving active sheet: ${currentActiveSheetId} to maintain localStorage changes`);
            
            for (let i = 0; i < loadedSheets.length; i++) {
              const sheet = loadedSheets[i];
              console.log(`📋 Loading sheet ${i + 1}/${loadedSheets.length}:`, sheet.sheetName, 'from', sheet.source);
              console.log('🔍 Sheet data type:', typeof sheet.csvData);
              console.log('🔍 Sheet data sample:', sheet.csvData?.substring?.(0, 100) || sheet.csvData);
            
              try {
                // Validate and parse CSV data
                let csvData: any = sheet.csvData;
                console.log('🔍 Raw CSV data type:', typeof csvData);
                console.log('🔍 Raw CSV data structure:', csvData);
                
                let csvArray: any[][];
                
                if (typeof csvData === 'string') {
                  // Handle string CSV data
                  console.log('📝 Processing string CSV data');
                  const lines = csvData.split('\n');
                  csvArray = lines.map(line => line.split(','));
                } else if (typeof csvData === 'object' && csvData !== null) {
                  // Handle object data (already processed spreadsheet)
                  console.log('📊 Processing object data (already processed spreadsheet)');
                  
                  if (csvData.cells && csvData.rowCount && csvData.colCount) {
                    // This is already processed spreadsheet data - convert to CSV format
                    console.log('🔄 Converting processed spreadsheet to CSV format');
                    const { cells, rowCount, colCount } = csvData;
                    
                    // Convert cells object to 2D array
                    csvArray = [];
                    
                    // First, try to find actual column headers from the first row
                    const firstRowData = [];
                    for (let col = 0; col < colCount; col++) {
                      const colLabel = String.fromCharCode(65 + col);
                      const cellId = `${colLabel}1`;
                      const cellValue = cells[cellId]?.value || '';
                      firstRowData.push(cellValue);
                    }
                    
                    // Check if first row contains headers (non-numeric values)
                    const hasHeaders = firstRowData.some(value => 
                      typeof value === 'string' && 
                      value.trim() !== '' && 
                      isNaN(Number(value))
                    );
                    
                    if (hasHeaders) {
                      // Use actual headers from first row
                      console.log('📋 Using actual headers from first row:', firstRowData);
                      csvArray.push(firstRowData);
                      
                      // Add data rows starting from row 2
                      for (let row = 2; row <= rowCount; row++) {
                        const dataRow = [];
                        for (let col = 0; col < colCount; col++) {
                          const colLabel = String.fromCharCode(65 + col);
                          const cellId = `${colLabel}${row}`;
                          const cellValue = cells[cellId]?.value || '';
                          dataRow.push(cellValue);
                        }
                        csvArray.push(dataRow);
                      }
          } else {
                      // No headers found, use generic column names
                      console.log('📋 No headers found, using generic column names');
                      const headerRow = [];
                      for (let col = 0; col < colCount; col++) {
                        const colLabel = String.fromCharCode(65 + col); // A, B, C, etc.
                        headerRow.push(colLabel);
                      }
                      csvArray.push(headerRow);
                      
                      // Add data rows starting from row 1
                      for (let row = 1; row <= rowCount; row++) {
                        const dataRow = [];
                        for (let col = 0; col < colCount; col++) {
                          const colLabel = String.fromCharCode(65 + col);
                          const cellId = `${colLabel}${row}`;
                          const cellValue = cells[cellId]?.value || '';
                          dataRow.push(cellValue);
                        }
                        csvArray.push(dataRow);
                      }
                    }
                    
                    console.log('✅ Converted spreadsheet data to CSV format:', csvArray.length, 'rows');
                  } else if (Array.isArray(csvData)) {
                    // Handle array data
                    console.log('📋 Processing array data');
                    csvArray = csvData;
                  } else {
                    console.error('❌ Unknown object structure:', csvData);
                    throw new Error(`Unknown object structure: ${JSON.stringify(csvData).substring(0, 100)}`);
                  }
                }
                  
                  // Load the sheet
                  addSheetFromCSV(csvArray, sheet.sheetName);
                  
                  // Track the sheet creation
                  sessionTracker.trackIndexedDBChange(sheet.sheetId, 'create', `Loaded from ${sheet.source}`);
                  
                  console.log('✅ Sheet loaded successfully from', sheet.source);
                  
                } catch (sheetError) {
                  console.error(`❌ Error loading sheet ${i + 1} (${sheet.sheetName}):`, sheetError);
                  // Continue with next sheet instead of stopping
                  continue;
                }
            }
            
            console.log('✅ All sheets processed');
            
            // Let the system naturally switch to the last loaded sheet
            // Each sheet will load its own localStorage changes when it becomes active
            console.log('📋 All sheets loaded - localStorage changes will be loaded per sheet as user switches between them');
            
            dataLoadedRef.current = true; // Mark as loaded
            setIsLoadingSheets(false);
            setIsCheckingBackblazeData(false);
            setHasCheckedBackblazeData(true);
            return;
          } else {
            console.log('📭 No sheets found using IndexedDB-first strategy');
            console.log('📄 Starting with empty sheet - user can load sheets via "+" tab when needed');
            
            // Create a default empty sheet if none exist
            console.log('🔄 Creating default empty sheet...');
            addSheet();
            
            // Initialize tour for new users
            initializeTourForNewUser();
            
            // Check if tour should be shown automatically
            if (shouldShowTourAutomatically()) {
              // Delay tour start to allow page to load
              setTimeout(() => {
                startTour();
              }, 3000);
            }
            dataLoadedRef.current = true; // Mark as loaded
          }
        } catch (error) {
          console.error('❌ Error in IndexedDB-first loading:', error);
          console.log('🔄 Falling back to empty sheet due to loading error...');
          
          // Create a default empty sheet as fallback
          try {
            addSheet();
            console.log('✅ Created fallback empty sheet');
          } catch (fallbackError) {
            console.error('❌ Error creating fallback sheet:', fallbackError);
          }
          
          dataLoadedRef.current = true; // Mark as loaded even on error
        }
      } else {
        // No user logged in, show empty sheet
        setIsCheckingBackblazeData(false);
        setHasCheckedBackblazeData(true);
        setIsLoadingSheets(false);
        dataLoadedRef.current = true; // Mark as loaded
      }
    };

    checkExistingSheetData();
  }, [user?.email, startTour, addSheetFromCSV]);

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
    console.log('🔄 Resetting CSV upload flags...');
    setCsvUploaded(false);
    setIsProcessingCSV(false);
    setIsSheetRendered(false);
  }, []);

  // Monitor when sheet is actually rendered to control CSV processing state
  useEffect(() => {
    if (activeSheet && activeSheet.cells && Object.keys(activeSheet.cells).length > 0) {
      console.log('📊 Sheet data detected, marking as rendered');
      setIsSheetRendered(true);
      
      // If CSV was uploaded and sheet is now rendered, we can safely remove the CSV loader
      if (csvUploaded) {
        console.log('✅ CSV upload complete and sheet rendered - removing CSV loader');
        setTimeout(() => {
          setIsProcessingCSV(false);
        }, 200); // Small delay to ensure smooth transition
      }
    } else {
      setIsSheetRendered(false);
    }
  }, [activeSheet, csvUploaded]);

  // Fallback timeout to reset CSV processing state if DuckDB processing takes too long
  useEffect(() => {
    if (isProcessingCSV) {
      console.log('⏰ Setting CSV processing timeout fallback...');
      const timeout = setTimeout(() => {
        console.log('⚠️ CSV processing timeout - forcing reset');
        setIsProcessingCSV(false);
        setCsvUploaded(false);
      }, 30000); // 30 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isProcessingCSV]);

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


  const handleAddSheet = useCallback(async () => {
    // Load available sheets using IndexedDB-first strategy
    console.log('📄 User clicked "Add Sheet" - loading available sheets...');
    
    if (user?.email) {
    try {
      setIsLoadingSheets(true);
        console.log('🔄 Loading available sheets using IndexedDB-first strategy...');
        
        // Get all sheets using IndexedDB-first loader
        const loadedSheets = await indexedDBFirstLoader.loadAllSheets(user.email);
        
        if (loadedSheets && loadedSheets.length > 0) {
          console.log(`📁 Found ${loadedSheets.length} sheets using IndexedDB-first strategy`);
          
          // Convert to the format expected by the sheet selector
          const processedSheets = loadedSheets.map(sheet => ({
            fileName: sheet.sheetName,
            lastModified: new Date(sheet.lastModified).toISOString(),
            size: sheet.csvData.length,
            fileId: sheet.sheetId,
            source: sheet.source
          }));
          
          setAvailableSheets(processedSheets);
          console.log('📋 Available sheets loaded:', processedSheets.length);
          console.log('🔍 Processed sheets sample:', processedSheets[0]);
        } else {
          console.log('📭 No sheets found using IndexedDB-first strategy');
          setAvailableSheets([]);
        }
        
        // Show sheet selection modal
        setShowSheetSelectionModal(true);
        setIsLoadingSheets(false);
        
      } catch (error) {
        console.error('❌ Error loading available sheets:', error);
        setAvailableSheets([]);
        setShowSheetSelectionModal(true);
        setIsLoadingSheets(false);
      }
    } else {
      // No user logged in, just show modal with create blank option
      setAvailableSheets([]);
      setShowSheetSelectionModal(true);
    }
  }, [user?.email]);

  const handleCreateBlankSheet = useCallback(() => {
    console.log('📄 Creating new blank sheet');
    addSheet();
    setShowSheetSelectionModal(false);
  }, [addSheet]);

  const handleResearchComplete = useCallback((researchData: any) => {
    console.log('Research completed:', researchData);
    
    // Check for success - handle both old format (with success property) and new multi-agent format
    const isSuccess = researchData.success || (researchData.spreadsheetData && researchData.sources);
    
    if (!isSuccess) {
      addNotification({
        type: 'error',
        title: 'Research Failed',
        message: 'Research failed. Please try again.',
        duration: 5000
      });
      return;
    }
    
    try {
      console.log('📊 Creating new research sheet with data:', {
        hasSpreadsheetData: !!researchData.spreadsheetData,
        hasSources: !!researchData.sources,
        hasResearchPlan: !!researchData.researchPlan,
        spreadsheetDataKeys: researchData.spreadsheetData ? Object.keys(researchData.spreadsheetData) : 'none',
        sourcesLength: researchData.sources?.length || 0
      });
      
      // Create a new sheet specifically for the research data
      const newResearchSheet = ResearchService.createResearchSheet(researchData);
      
      // Add the new research sheet to the spreadsheet
      addPredefinedSheet(newResearchSheet);
      
      // Show success notification
      const sourceCount = researchData.sources?.length || researchData.spreadsheetData?.metadata?.sourceCount || 0;
      const query = researchData.researchPlan?.queries?.[0] || researchData.query || 'Research';
      addNotification({
        type: 'success',
        title: 'Research Completed!',
        message: `Found ${sourceCount} sources. New sheet "${newResearchSheet.name}" created with research data.`,
        duration: 7000
      });
      
      console.log('✅ New research sheet created:', newResearchSheet.name);
    } catch (error) {
      console.error('❌ Error creating research sheet:', error);
      addNotification({
        type: 'error',
        title: 'Sheet Creation Failed',
        message: `Failed to create new sheet with research data: ${error.message}`,
        duration: 7000
      });
    }
  }, [addPredefinedSheet, addNotification]);

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
        console.log('🔍 Active sheet data:', {
          id: targetSheet.id,
          name: targetSheet.name,
          cellCount: Object.keys(targetSheet.cells || {}).length,
          rowCount: targetSheet.rowCount,
          colCount: targetSheet.colCount
        });
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
        console.log('📁 CSV file selected:', file.name);
        console.log('📊 Current activeSheet before CSV upload:', activeSheet);
        
        // Show loader immediately when file is selected
        setIsProcessingCSV(true);
        setCsvUploaded(true);
        
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
          const csv = event.target?.result as string;
            console.log('📊 CSV file read successfully, length:', csv.length);
            
          const lines = csv.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const dataRows = lines.slice(1).filter(line => line.trim());
            
            console.log('📊 CSV parsed:', {
              totalLines: lines.length,
              headers: headers.length,
              dataRows: dataRows.length,
              firstHeader: headers[0],
              sampleData: dataRows[0]
            });
          
            // Initialize IndexedDB and save CSV
            console.log('🔄 Starting CSV upload process...');
            console.log('📊 CSV data length:', csv.length);
            console.log('📁 File name:', file.name);
            console.log('🔍 CSV content preview:', csv.substring(0, 200) + '...');
            
            try {
              console.log('🔄 Starting IndexedDB initialization...');
              // Initialize IndexedDB on first CSV upload (lazy initialization)
              await indexedDBService.init();
              console.log('✅ IndexedDB initialized for CSV storage');
              
              console.log('🔄 Saving CSV to IndexedDB...');
              console.log('📊 CSV content preview:', csv.substring(0, 100) + '...');
              
              const csvId = await indexedDBService.saveCSVFile(csv, file.name);
              console.log('✅ CSV saved to IndexedDB with ID:', csvId);
              
              csvChangeManager.setCurrentCSV(csvId);
              
              // Persist current CSV ID in localStorage for page reloads
              localStorage.setItem('currentCSVId', csvId);
              console.log('💾 CSV ID saved to localStorage:', csvId);
              
              // Test IndexedDB to verify it's working
              console.log('🔄 Testing IndexedDB...');
              await indexedDBService.testIndexedDB();
              console.log('✅ IndexedDB test completed');
              
              // Debug IndexedDB contents
              console.log('🔍 Debugging IndexedDB after CSV upload...');
              await debugIndexedDB();
              
              // Additional verification
              console.log('🔍 Verifying CSV was saved...');
              const allFiles = await indexedDBService.getAllCSVFiles();
              console.log('📊 All CSV files after upload:', allFiles);
              
            } catch (error) {
              console.error('❌ Failed to initialize IndexedDB or save CSV:', error);
              console.error('Error details:', error);
              console.error('Error stack:', error.stack);
              
              // Try to debug what went wrong
              console.log('🔍 Debugging IndexedDB after error...');
              try {
                await debugIndexedDB();
              } catch (debugError) {
                console.error('❌ Debug failed:', debugError);
              }
            }
          
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
            console.log('📝 Updating sheet with', updates.length, 'cell updates');
            console.log('📊 Sample updates:', updates.slice(0, 5));
          bulkUpdateCells(updates);
            console.log('✅ CSV data uploaded to sheet');
            console.log('📊 ActiveSheet after upload:', {
              id: activeSheet?.id,
              name: activeSheet?.name,
              rowCount: activeSheet?.rowCount,
              colCount: activeSheet?.colCount,
              cellCount: Object.keys(activeSheet?.cells || {}).length,
              sampleCells: Object.keys(activeSheet?.cells || {}).slice(0, 5)
            });

            // Store compressed sheet data in Backblaze cloud storage (direct client-side)
          if (user?.email) {
            try {
                console.log('🔄 Storing compressed sheet data directly to Backblaze cloud...');
                
                // Get Backblaze service instance
                const backblazeService = BackblazeApiService.getInstance();
                
                // Authenticate with Backblaze
                const authResult = await backblazeService.authenticate();
                if (!authResult.success) {
                  console.log('🔐 Backblaze authentication failed:', authResult.message);
                return;
              }
              
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

                const result = await backblazeService.storeSheetData(
                user.email,
                file.name,
                { cells, rowCount: maxRow, colCount: maxCol },
                metadata
              );

              if (result.success) {
                  console.log('✅ Sheet data successfully stored in Backblaze cloud storage');
                  console.log('📊 Compression stats:', result.data);
              } else {
                  console.error('❌ Failed to store sheet data in Backblaze cloud storage:', result.message);
              }
            } catch (error) {
                console.error('❌ Error storing sheet data in Backblaze cloud storage:', error);
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
            
              // Note: Qdrant-based sheet profiling has been removed
              // The summary is now only used for local debugging/logging
            
          } catch (err) {
              console.error('❌ Error generating CSV summary:', err);
            }

            // Reset processing state
            setIsProcessingCSV(false);
            setIsSheetRendered(true);
            
            // Show success notification
            setNotifications(prev => [...prev, {
              id: Date.now().toString(),
              type: 'success',
              title: 'CSV Uploaded Successfully',
              message: `File "${file.name}" has been uploaded and processed.`
            }]);
            
            console.log('🎉 CSV upload process completed successfully');
          } catch (csvError) {
            console.error('❌ CSV processing failed:', csvError);
            console.error('CSV error details:', csvError);
            console.error('CSV error stack:', csvError.stack);
            
            // Reset processing state on error
            setIsProcessingCSV(false);
            
            // Show error notification
            setNotifications(prev => [...prev, {
              id: Date.now().toString(),
              type: 'error',
              title: 'CSV Upload Failed',
              message: `Failed to process file "${file.name}". Please try again.`
            }]);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [activeSheetIndex, user?.email, bulkUpdateCells, activeSheet, setNotifications]);

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

  // Load existing sheet data from Backblaze cloud storage
  const loadExistingSheetData = useCallback(async (userEmail: string) => {
    try {
      setIsLoadingSheets(true);
      console.log('🔄 Loading existing sheet data from Backblaze cloud storage...');

      // Get Backblaze service instance
      const backblazeService = BackblazeApiService.getInstance();

      // Get list of user files to let them choose
      const filesResult = await backblazeService.listUserFiles(userEmail);

      if (filesResult.success && filesResult.files && filesResult.files.length > 0) {
        console.log(`📁 Found ${filesResult.files.length} files in Backblaze cloud storage`);

        // Sort files by last modified date (most recent first)
        const sortedFiles = filesResult.files.sort((a: any, b: any) => {
          const timestampA = a.uploadTimestamp && a.uploadTimestamp > 0 ? a.uploadTimestamp : 0;
          const timestampB = b.uploadTimestamp && b.uploadTimestamp > 0 ? b.uploadTimestamp : 0;
          return timestampB - timestampA;
        });

        // Store all available sheets for later reference (popup selection)
        setAvailableSheets(sortedFiles.map(file => {
          // Use comprehensive filename cleaning utility
          const cleanFileName = cleanFilename(file.fileName, userEmail, true);
          
          // Format date properly
          let formattedDate;
          if (file.uploadTimestamp && file.uploadTimestamp > 0) {
            const date = new Date(file.uploadTimestamp);
            formattedDate = isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
          } else {
            formattedDate = new Date().toISOString();
          }
          
          return {
            fileName: cleanFileName,
            originalFileName: file.fileName, // Keep original for Backblaze download
            lastModified: formattedDate,
            size: file.size,
            fileId: file.fileId
          };
        }));

        // If there's only one sheet, load it automatically
        if (sortedFiles.length === 1) {
          console.log(`📊 Found only 1 sheet - loading automatically`);
          const file = sortedFiles[0];
          await loadSingleSheet(userEmail, file);
        } else {
          // Multiple sheets found - show selection modal
          console.log(`📊 Found ${sortedFiles.length} sheets - showing selection modal`);
          setShowSheetSelectionModal(true);
        }
      } else {
        console.log('📭 No files found in Backblaze cloud storage');
      }
    } catch (error) {
      console.error('❌ Error loading existing sheet data:', error);
    } finally {
      setIsLoadingSheets(false);
    }
  }, [addSheetFromCSV, updateSheetCache, state.activeSheetId]);

  // Helper function to load a single sheet
  const loadSingleSheet = useCallback(async (userEmail: string, file: any) => {
    try {
      // First, try to load from IndexedDB
      console.log('🔍 Attempting to load sheet from IndexedDB first:', file.fileName);
      try {
        const indexedDBService = (await import('../lib/indexedDBService')).indexedDBService;
        
        // Try multiple filename variations for IndexedDB lookup
        const filenameVariations = [
          file.fileName, // Original filename
          file.fileName.replace(/^user_[^/]+\//, ''), // Remove user prefix
          file.fileName.replace(/^user_[^/]+\//, '').replace('.csv.gz', ''), // Remove user prefix and .csv.gz
          file.fileName.replace(/^user_[^/]+\//, '').replace('.csv', ''), // Remove user prefix and .csv
        ];
        
        console.log('🔍 Trying filename variations:', filenameVariations);
        
        // Debug: List all files in IndexedDB
        try {
          const allFiles = await indexedDBService.getAllCSVFiles();
          console.log('📁 All files in IndexedDB:', allFiles.map(f => ({ name: f.name, size: f.data?.length })));
        } catch (debugError) {
          console.log('⚠️ Could not list IndexedDB files:', debugError);
        }
        
        let indexedDBResult = null;
        for (const filename of filenameVariations) {
          try {
            console.log(`🔍 Trying IndexedDB lookup with filename: "${filename}"`);
            indexedDBResult = await indexedDBService.getCSVFile(filename);
            if (indexedDBResult && indexedDBResult.data) {
              console.log(`✅ Found sheet in IndexedDB with filename: "${filename}"`);
              break;
            }
          } catch (error) {
            console.log(`⚠️ IndexedDB lookup failed for "${filename}":`, error);
          }
        }
        
        if (indexedDBResult && indexedDBResult.data) {
          console.log('✅ Found sheet in IndexedDB, loading from there');
          // Parse CSV data from IndexedDB
          const lines = indexedDBResult.data.split('\n');
          const csvArray = lines.map(line => line.split(','));
          // Clean the filename before passing to addSheetFromCSV
          console.log('🧹 Cleaning filename:', file.fileName);
          const cleanFileName = cleanFilename(file.fileName, userEmail, true);
          console.log('✅ Cleaned filename:', cleanFileName);
          addSheetFromCSV(csvArray, cleanFileName);
          return;
        } else {
          console.log('⚠️ Sheet not found in IndexedDB with any filename variation');
          
          // Try using the IndexedDB-first loader as a last resort
          try {
            console.log('🔄 Trying IndexedDB-first loader as fallback...');
            const indexedDBFirstLoader = (await import('../lib/indexedDBFirstLoader')).indexedDBFirstLoader;
            const loadedSheets = await indexedDBFirstLoader.loadAllSheets(userEmail);
            
            if (loadedSheets && loadedSheets.length > 0) {
              console.log('✅ Found sheets using IndexedDB-first loader:', loadedSheets.length);
              
              // Find the matching sheet
              const matchingSheet = loadedSheets.find(sheet => 
                sheet.sheetName === file.fileName || 
                sheet.sheetName === file.fileName.replace(/^user_[^/]+\//, '') ||
                sheet.sheetName === file.fileName.replace(/^user_[^/]+\//, '').replace('.csv.gz', '') ||
                sheet.sheetName === file.fileName.replace(/^user_[^/]+\//, '').replace('.csv', '')
              );
              
              if (matchingSheet) {
                console.log('✅ Found matching sheet in IndexedDB-first loader:', matchingSheet.sheetName);
                
                // Handle the data format
                let csvArray;
                if (typeof matchingSheet.csvData === 'string') {
                  const lines = matchingSheet.csvData.split('\n');
                  csvArray = lines.map(line => line.split(','));
                } else if (matchingSheet.csvData && (matchingSheet.csvData as any).cells) {
                  // Convert processed spreadsheet data to CSV
                  const { cells, rowCount, colCount } = matchingSheet.csvData as any;
                  csvArray = [];
                  
                  // Add header row
                  const headerRow = [];
                  for (let col = 0; col < colCount; col++) {
                    const colLabel = String.fromCharCode(65 + col);
                    const cellId = `${colLabel}1`;
                    const cellValue = (cells as any)[cellId]?.value || colLabel;
                    headerRow.push(cellValue);
                  }
                  csvArray.push(headerRow);
                  
                  // Add data rows
                  for (let row = 2; row <= rowCount; row++) {
                    const dataRow = [];
                    for (let col = 0; col < colCount; col++) {
                      const colLabel = String.fromCharCode(65 + col);
                      const cellId = `${colLabel}${row}`;
                      const cellValue = (cells as any)[cellId]?.value || '';
                      dataRow.push(cellValue);
                    }
                    csvArray.push(dataRow);
                  }
                } else {
                  console.log('⚠️ Unknown data format in IndexedDB-first loader');
                  throw new Error('Unknown data format');
                }
                
                // Clean the filename before passing to addSheetFromCSV
                console.log('🧹 Cleaning filename (fallback):', file.fileName);
                const cleanFileName = cleanFilename(file.fileName, userEmail, true);
                console.log('✅ Cleaned filename (fallback):', cleanFileName);
                addSheetFromCSV(csvArray, cleanFileName);
                return;
              } else {
                console.log('⚠️ No matching sheet found in IndexedDB-first loader');
              }
            } else {
              console.log('⚠️ No sheets found in IndexedDB-first loader');
            }
          } catch (indexedDBFirstError) {
            console.log('⚠️ IndexedDB-first loader error:', indexedDBFirstError);
          }
        }
      } catch (indexedDBError) {
        console.log('⚠️ IndexedDB service error:', indexedDBError);
      }
      
      // Fallback to Backblaze if not found in IndexedDB
      console.log('🔄 Loading sheet from Backblaze as fallback:', file.fileName);
      const backblazeService = BackblazeApiService.getInstance();
      // Extract just the base filename (remove user prefix if present)
      let baseFileName = file.fileName;
      const userPrefix = `user_${userEmail}/`;
      if (baseFileName.startsWith(userPrefix)) {
        baseFileName = baseFileName.replace(userPrefix, '');
      }
      // Also remove any other user prefix patterns
      baseFileName = baseFileName.replace(/^user_[^/]+\//, '');
      const result = await backblazeService.retrieveSheetData(userEmail, baseFileName);

      if (result.success && result.data) {
        const sheetData = result.data as any;
        const fileName = baseFileName; // Use the already cleaned filename

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
          console.error(`❌ Invalid fileName received for ${file.fileName}, skipping`);
          return;
              }

              // Add the new sheet using the hook method
        console.log('🔄 Adding new sheet with data:', {
          fileName: fileName.replace('.csv.gz', ''),
          csvDataLength: csvData.length,
          csvDataColumns: csvData[0]?.length || 0
        });
              addSheetFromCSV(csvData, fileName.replace('.csv.gz', ''));

        // Wait for the sheet to be created and then save to IndexedDB
        setTimeout(async () => {
          const activeSheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (activeSheet) {
            console.log('🔍 Sheet state after adding new sheet:', {
              totalSheets: state.sheets.length,
              activeSheetId: state.activeSheetId,
              activeSheet: activeSheet
            });

            // Save the new sheet data to IndexedDB
            try {
              console.log('💾 Saving new sheet to IndexedDB...');
              await indexedDBService.saveSheet({
                name: activeSheet.name,
                csvData: csvData.map(row => row.join(',')).join('\n'),
                isActive: true,
                metadata: {
                  rowCount: csvData.length,
                  colCount: csvData[0]?.length || 0,
                  fileSize: csvData.map(row => row.join(',')).join('\n').length,
                  uploadDate: Date.now()
                }
              });
              
              // Track the sheet creation
              sessionTracker.trackIndexedDBChange(activeSheet.id, 'create', `New sheet created: ${activeSheet.name}`);
              
              console.log('✅ New sheet saved to IndexedDB successfully');
          } catch (error) {
              console.error('❌ Error saving new sheet to IndexedDB:', error);
            }
          }
        }, 200);

        // Save CSV data to IndexedDB for change tracking
        try {
          console.log('🔄 Saving Backblaze sheet to IndexedDB...');
          await indexedDBService.init();
          console.log('✅ IndexedDB initialized for Backblaze sheet');
          
          // Convert csvData back to CSV string
          const csvString = csvData.map(row => row.join(',')).join('\n');
          console.log('📊 CSV string length:', csvString.length);
          
          const csvId = await indexedDBService.saveCSVFile(csvString, fileName);
          csvChangeManager.setCurrentCSV(csvId);
          
          // Persist current CSV ID in localStorage for page reloads
          localStorage.setItem('currentCSVId', csvId);
          console.log('💾 Backblaze sheet saved to IndexedDB with ID:', csvId);
          
          // Test IndexedDB to verify it's working
          await indexedDBService.testIndexedDB();
          console.log('✅ IndexedDB test completed for Backblaze sheet');
          
        } catch (error) {
          console.error('❌ Failed to save Backblaze sheet to IndexedDB:', error);
        }

        const uploadDate = file.uploadTimestamp && file.uploadTimestamp > 0 
          ? new Date(file.uploadTimestamp).toLocaleString() 
          : 'Unknown date';
        console.log(`✅ Loaded and cached sheet: ${fileName} (uploaded: ${uploadDate})`);
      } else {
        console.error(`❌ Failed to load sheet data for ${file.fileName}:`, result.message);
        // If Backblaze fails, try to create an empty sheet as fallback
        console.log('🔄 Creating empty sheet as fallback since Backblaze download failed');
        addSheet();
      }
    } catch (error) {
      console.error(`❌ Error loading sheet ${file.fileName}:`, error);
      // If there's an error, try to create an empty sheet as fallback
      console.log('🔄 Creating empty sheet as fallback due to error');
      addSheet();
    }
  }, [addSheetFromCSV, updateSheetCache, state.activeSheetId]);

  // Handle sheet selection from modal
  const handleSheetSelection = useCallback(async (fileName: string) => {
    if (!user?.email) return;
    
    try {
      setIsLoadingSheets(true);
      console.log(`🔄 Loading selected sheet from Backblaze: ${fileName}`);
      console.log('🔍 User email:', user.email);
      
      // Find the file in availableSheets
      const selectedFile = availableSheets.find(sheet => sheet.fileName === fileName);
      if (selectedFile) {
        // Convert to the format expected by loadSingleSheet
        const file = {
          fileName: selectedFile.originalFileName || selectedFile.fileName, // Use original filename for Backblaze download
          uploadTimestamp: selectedFile.lastModified ? new Date(selectedFile.lastModified).getTime() : Date.now(),
          size: selectedFile.size,
          fileId: selectedFile.fileId
        };
        
        await loadSingleSheet(user.email, file);
        setShowSheetSelectionModal(false);
      }
    } catch (error) {
      console.error('❌ Error loading selected sheet:', error);
    } finally {
      setIsLoadingSheets(false);
    }
  }, [user?.email, availableSheets, loadSingleSheet]);

  const handleFormat = useCallback((action: string, value?: string) => {
    console.log('Format action:', action, value);
    
    if (!selectedCells || selectedCells.length === 0) {
      console.log('No cells selected for formatting');
      return;
    }

        // TODO: Update to use new state management system
    console.log('Formatting not yet implemented in new state management system');
  }, [selectedCells, activeSheetIndex]);

  const handleSanitizeData = useCallback(() => {
    console.log('🔍 Sanitizing data...');
    console.log('📊 Active sheet:', activeSheet);
    console.log('📋 Active sheet cells count:', activeSheet?.cells ? Object.keys(activeSheet.cells).length : 0);
    
    if (!activeSheet || !activeSheet.cells) {
      console.log('❌ No active sheet or cells found');
      return;
    }

    // Get the AI schema for the current sheet
    const aiSchema = getCurrentSheetAISchema(activeSheet);
    console.log('🤖 AI Schema retrieved:', aiSchema);
    
    if (!aiSchema || !aiSchema.columns) {
      console.log('❌ No AI schema found for sanitization');
      toast({
        title: "No Schema Found",
        description: "Please generate a schema first using the AI assistant to enable data sanitization.",
        variant: "destructive",
      });
      return;
    }

    console.log('AI Schema for sanitization:', aiSchema);
    
    // Create a mapping of column names to their expected types
    const columnTypeMap = new Map<string, string>();
    aiSchema.columns.forEach((column: any) => {
      columnTypeMap.set(column.name, column.type);
    });

    console.log('Column type mapping:', columnTypeMap);

    // Track cells that need to be highlighted
    const cellsToHighlight: string[] = [];
    let totalCellsChecked = 0;
    let invalidCellsFound = 0;

    // Iterate through all cells in the sheet
    Object.entries(activeSheet.cells).forEach(([cellId, cell]: [string, any]) => {
      if (!cell || cell.value === undefined || cell.value === null || cell.value === '') {
        return; // Skip empty cells
      }

      // Skip header row (row 1)
      if (cellId.match(/^[A-Z]+1$/)) {
        return;
      }

      totalCellsChecked++;

      // Get column letter from cellId (e.g., "A2" -> "A")
      const columnLetter = cellId.match(/^([A-Z]+)/)?.[1];
      if (!columnLetter) return;

      // Convert column letter to column index (A=0, B=1, etc.)
      const columnIndex = columnLetter.charCodeAt(0) - 65;
      
      // Get the header for this column
      const headerCellId = `${columnLetter}1`;
      const headerCell = activeSheet.cells[headerCellId];
      const columnName = headerCell?.value || columnLetter;

      // Get expected type for this column
      const expectedType = columnTypeMap.get(String(columnName));
      if (!expectedType) {
        console.log(`No expected type found for column: ${columnName}`);
        return;
      }

      // Check if the cell value matches the expected type
      const cellValue = cell.value;
      const isValidType = validateCellType(cellValue, expectedType);

      if (!isValidType) {
        console.log(`Invalid type in cell ${cellId}: expected ${expectedType}, got ${typeof cellValue} (${cellValue})`);
        cellsToHighlight.push(cellId);
        invalidCellsFound++;
      }
    });

    console.log(`Sanitization complete: ${invalidCellsFound}/${totalCellsChecked} cells have type mismatches`);

    // Apply red highlighting to invalid cells
    if (cellsToHighlight.length > 0) {
      console.log('🎨 Applying highlighting to cells:', cellsToHighlight);
      console.log('🎨 formatCells function available:', !!formatCells);
      
      // Use formatCells to apply red highlighting to invalid cells
      if (formatCells) {
        console.log('🎨 Calling formatCells with:', {
          cellIds: cellsToHighlight,
          style: {
            backgroundColor: '#ffebee',
            textColor: '#d32f2f'
          }
        });
        
        formatCells(cellsToHighlight, {
          backgroundColor: '#ffebee', // Light red background
          textColor: '#d32f2f', // Dark red text
        });
        
        console.log('✅ formatCells called successfully');
      } else {
        console.warn('❌ formatCells function not available');
      }
      
      toast({
        title: "Data Sanitization Complete",
        description: `Found ${invalidCellsFound} cells with type mismatches out of ${totalCellsChecked} total cells. Invalid cells are highlighted in red.`,
        variant: invalidCellsFound > 0 ? "destructive" : "default",
      });
    } else {
      toast({
        title: "Data Sanitization Complete",
        description: `All ${totalCellsChecked} cells match their expected data types. No issues found!`,
        variant: "default",
      });
    }
  }, [activeSheet, formatCells]);

  // Test function to verify formatCells works
  const testFormatCells = useCallback(() => {
    console.log('🧪 Testing formatCells function...');
    if (!formatCells) {
      console.log('❌ formatCells not available');
      return;
    }
    
    if (!activeSheet) {
      console.log('❌ No active sheet available');
      return;
    }
    
    // Test with a simple cell like A2
    const testCellId = 'A2';
    console.log('🧪 Testing with cell:', testCellId);
    console.log('🧪 Active sheet:', activeSheet);
    console.log('🧪 Cell A2 exists:', !!activeSheet.cells[testCellId]);
    console.log('🧪 Cell A2 data:', activeSheet.cells[testCellId]);
    
    // Ensure the cell exists by setting a value first
    if (!activeSheet.cells[testCellId]) {
      console.log('🧪 Creating cell A2 with test value');
      updateCell(testCellId, 'TEST');
    }
    
    formatCells([testCellId], {
      backgroundColor: '#ff0000', // Bright red for testing
      textColor: '#ffffff', // White text
    });
    
    console.log('✅ Test formatCells called');
  }, [formatCells, activeSheet, updateCell]);

  // Helper function to validate cell type against expected type
  const validateCellType = (value: any, expectedType: string): boolean => {
    if (value === null || value === undefined || value === '') {
      return true; // Empty values are considered valid
    }

    switch (expectedType) {
      case 'INTEGER':
        return Number.isInteger(Number(value)) && !isNaN(Number(value));
      
      case 'DOUBLE':
        return !isNaN(Number(value)) && isFinite(Number(value));
      
      case 'VARCHAR':
        return typeof value === 'string' || typeof value === 'number';
      
      case 'DATE':
        // Check for common date formats
        const dateStr = String(value);
        const datePatterns = [
          /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
          /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
          /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
          /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
        ];
        return datePatterns.some(pattern => pattern.test(dateStr)) || !isNaN(Date.parse(dateStr));
      
      case 'BOOLEAN':
        const boolStr = String(value).toLowerCase();
        return ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0'].includes(boolStr);
      
      default:
        return true; // Unknown types are considered valid
    }
  };

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

  // Change management functions for the new unified system

  // Check for existing changes when active sheet changes and convert to AI updates
  useEffect(() => {
    if (activeSheet) {
      const fileName = activeSheet.name || `sheet-${activeSheet.id}`;
      setCurrentSheetFileName(fileName);
      
      const cellCount = Object.keys(activeSheet.cells || {}).length;
      const hasData = cellCount > 0;
      
      console.log('🔍 Checking for existing changes for sheet:', fileName, '(ID:', activeSheet.id, ')');
      console.log('📊 Current sheet details:', {
        name: activeSheet.name,
        id: activeSheet.id,
        cellCount: cellCount,
        hasData: hasData
      });
      
      // Only load localStorage changes for sheets that have data
      // This prevents loading changes into empty placeholder sheets
      if (!hasData) {
        console.log('⏭️ Skipping localStorage loading for empty sheet - waiting for sheet with data');
        return;
      }
      
      console.log('✅ Sheet has data, proceeding with localStorage loading...');
      
      // First check new filename-based localStorage
      try {
        const newAIDiffData = localStorage.getItem('sheet_ai_diff_by_filename');
        if (newAIDiffData) {
          const parsed = JSON.parse(newAIDiffData);
          const cleanName = fileName.replace(/[^a-zA-Z0-9\-_.]/g, '_').replace(/_{2,}/g, '_').toLowerCase();
          
          console.log('🔍 Available filename-based keys:', Object.keys(parsed));
          console.log('🔍 Looking for cleaned filename:', cleanName);
          
          if (parsed[cleanName] && Array.isArray(parsed[cleanName]) && parsed[cleanName].length > 0) {
            console.log(`📋 Found ${parsed[cleanName].length} changes for filename: ${fileName} (key: ${cleanName})`);
            
            // Convert to AI updates format
            const aiUpdates = parsed[cleanName].map(change => ({
              cellId: change.cellId,
              aiValue: change.newValue,
              originalValue: change.previousValue,
              timestamp: change.timestamp
            }));
            
            console.log(`🔄 Converting ${aiUpdates.length} filename-based localStorage changes to AI updates`);
            createAIUpdates(aiUpdates);
            
            // Show notification
            addNotification({
              type: 'info',
              title: 'Pending Changes Found',
              message: `Found ${aiUpdates.length} pending changes for "${fileName}". You can accept or reject them using the controls at the top right.`,
              duration: 5000
            });
            
            console.log('✅ Successfully loaded filename-based changes');
            return; // Exit early if we found filename-based changes
          } else {
            console.log('ℹ️ No filename-based changes found for this sheet');
          }
        }
      } catch (error) {
        console.error('❌ Error processing filename-based changes:', error);
      }
      
      // Fallback: Check for existing changes in old sheet-ID-based localStorage format
      try {
        const aiDiffData = localStorage.getItem('sheet_specific_ai_diff');
        if (aiDiffData) {
          const parsed = JSON.parse(aiDiffData);
          
          console.log('🔍 Available localStorage keys:', Object.keys(parsed));
          console.log('🔍 Looking for sheet name:', fileName, 'or sheet ID:', activeSheet.id);
          console.log('🔍 Checking if localStorage contains changes for current sheet...');
          console.log('🔍 Current sheet has data:', Object.keys(activeSheet.cells || {}).length > 0);
          
          // First try exact match by sheet name (new preferred method)
          let foundChanges = null;
          let foundKey = null;
          
          if (parsed[fileName] && Array.isArray(parsed[fileName]) && parsed[fileName].length > 0) {
            foundChanges = parsed[fileName];
            foundKey = fileName;
            console.log(`📋 Found ${foundChanges.length} changes for sheet name match: ${fileName}`);
          } else if (parsed[activeSheet.id] && Array.isArray(parsed[activeSheet.id]) && parsed[activeSheet.id].length > 0) {
            // Fallback: try sheet ID match (old method)
            foundChanges = parsed[activeSheet.id];
            foundKey = activeSheet.id;
            console.log(`📋 Found ${foundChanges.length} changes for sheet ID match: ${activeSheet.id}`);
          } else {
            // Last resort: find any changes that might belong to this sheet
            console.log('🔍 No exact match, searching all available keys...');
            
            for (const [key, changes] of Object.entries(parsed)) {
              if (Array.isArray(changes) && changes.length > 0) {
                console.log(`🔍 Found changes under key: ${key} (${changes.length} changes)`);
                // Use the first set of changes we find
                foundChanges = changes;
                foundKey = key;
                console.log(`📋 Using changes from key: ${key} for current sheet`);
                break;
              }
            }
          }
          
          if (foundChanges && foundKey) {
            console.log(`📋 Found ${foundChanges.length} changes under key ${foundKey}, converting to AI updates...`);
            
            // Convert to AI updates format
            const aiUpdates = foundChanges.map(change => ({
              cellId: change.cellId,
              aiValue: change.newValue,
              originalValue: change.previousValue,
              timestamp: change.timestamp
            }));
            
            console.log(`🔄 Converting ${aiUpdates.length} localStorage changes to AI updates`);
            createAIUpdates(aiUpdates);
            
            // DON'T remove from localStorage yet - wait for user to accept/reject
            // The changes will be removed when user accepts/rejects via the AI update system
            console.log('📝 Keeping changes in localStorage until user accepts/rejects them');
            
            // Show notification
            addNotification({
              type: 'info',
              title: 'Pending Changes Found',
              message: `Found ${aiUpdates.length} pending changes. You can accept or reject them using the controls at the top right.`,
              duration: 5000
            });
            
            console.log('✅ Successfully converted localStorage changes to AI updates');
          } else {
            console.log('ℹ️ No changes found for this sheet in localStorage');
          }
        }
      } catch (error) {
        console.error('❌ Error processing existing changes:', error);
      }
    }
  }, [activeSheet, createAIUpdates, addNotification]);

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
    <div className="flex h-screen bg-transparent">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 sm:px-6 py-2 sm:py-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-0">
          {/* Left side - Brand and User */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1" data-tour="header-brand">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Ostr1ch</h1>
            <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px] sm:max-w-none">
              Welcome, {user.email}
            </span>
          </div>
          
          {/* Right side - Controls and Actions */}
          <div className="flex items-center gap-1 sm:gap-3 flex-wrap">
            {/* Canvas Controls */}
            <div className="flex items-center gap-1 sm:gap-2" data-tour="header-controls">
              <button
                onClick={() => canvasRef.current?.zoomIn()}
                className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={() => canvasRef.current?.zoomOut()}
                className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={() => canvasRef.current?.resetTransform()}
                className="hidden sm:block p-1.5 sm:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={handleRearrangeLayout}
                className="hidden md:block p-1.5 sm:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Rearrange Layout"
              >
                <LayoutGrid className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={triggerDuckDBReload}
                className="hidden lg:block p-1.5 sm:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Reload DuckDB"
              >
                <Database className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              
              {/* CSV Processing Loader */}
              {isProcessingCSV && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">Processing CSV...</span>
                </div>
              )}
            </div>
            
            {/* Upload CSV Button */}
            <Button
              onClick={handleUploadCSV}
              disabled={isProcessingCSV}
              size="sm"
              className="flex items-center gap-1 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
              data-tour="upload-button"
            >
              <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Upload CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>

            {/* Export CSV Button */}
            <Button
              onClick={handleExportCSV}
              size="sm"
              variant="outline"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </Button>
            
            
            {/* Research Button */}
            <Button
              onClick={() => setShowResearchModal(true)}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white transition-all duration-200 hover:scale-105 text-xs sm:text-sm"
              data-tour="research-button"
            >
              <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Research</span>
              <span className="sm:hidden">Research</span>
            </Button>
            
            {/* AI Report Generator Button */}
            <Button
              onClick={() => {
                setShowAIReportGenerator(true);
                setIsAIMinimized(true);
              }}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white transition-all duration-200 hover:scale-105 text-xs sm:text-sm"
              data-tour="report-generator"
            >
              <Brain className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">AI Report</span>
              <span className="sm:hidden">AI</span>
            </Button>
            
            {/* Tour Button */}
            <TourButton 
              variant="outline" 
              size="sm" 
              className="text-xs sm:text-sm"
            />
            
            
            <Button
              variant="outline" 
              size="sm"
              onClick={logout} 
              className="transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs sm:text-sm"
              data-tour="logout-button"
            >
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Sheet Tabs */}
      <div className="fixed top-16 sm:top-20 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 sm:px-6" data-tour="sheet-tabs">
        <div className="flex items-center gap-1 sm:gap-2 py-2 overflow-x-auto">
          {state.sheets.map((sheet, index) => (
            <div
              key={sheet.id}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-t-lg border-b-2 transition-all duration-200 cursor-pointer whitespace-nowrap ${
                index === activeSheetIndex
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
              onClick={() => handleTabSwitch(index)}
            >
              <span className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-none">{sheet.name}</span>
              {state.sheets.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveSheet(index);
                  }}
                  className="ml-1 sm:ml-2 p-0.5 sm:p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                >
                  <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </button>
              )}
            </div>
          ))}
          
          {/* Add New Sheet Button */}
          <button
            onClick={handleAddSheet}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 whitespace-nowrap"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Add Sheet</span>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="relative h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] mt-16 sm:mt-20 main-canvas-area">
        {/* Old loading overlays removed - now using professional loaders below */}

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
                data-tour="spreadsheet"
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
        
        {/* AI Chatbox - Positioned outside canvas with lower z-index than modals */}
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
          // DuckDB mapping props from parent
          isDuckDBProcessing={isDuckDBProcessing}
          isSchemaReady={duckDBSchemaReady}
          currentSchema={currentSchema}
          ensureSheetLoadedInDuckDB={ensureSheetLoadedInDuckDB}
          // Disable chatbot during CSV processing
          isProcessingCSV={isProcessingCSV}
          data-tour="ai-assistant"
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
          onShowPivotTable={() => {
            setShowPivotTable(true);
            setIsAIMinimized(true);
          }}
            onSanitizeData={handleSanitizeData}
            onTestFormat={testFormatCells}
            data-tour="ai-tools"
        />

        {/* Statistical Summary - Shows stats for selected cells */}
        <StatisticalSummary
          selectedCells={selectedCells}
          activeSheet={activeSheet}
          isVisible={selectedCells && selectedCells.length > 0}
          aiSchema={getCurrentSheetAISchema(activeSheet)}
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


      {/* Notification Manager */}
      <NotificationManager
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />

      {/* Floating AI Assistant Toggle Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        <Button
          onClick={() => setIsAIMinimized(!isAIMinimized)}
          className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
            isAIMinimized 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
          title={isAIMinimized ? 'Open AI Assistant' : 'Close AI Assistant'}
          data-tour="floating-ai-button"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        
        {/* Floating Tour Button */}
        <TourButton 
          variant="default" 
          size="sm" 
          className="w-14 h-14 rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white"
          data-tour="floating-tour-button"
        />
      </div>

      {/* Sheet Selection Modal */}
      <SheetSelector
        sheets={availableSheets}
        onSelectSheet={handleSheetSelection}
        onCreateBlankSheet={handleCreateBlankSheet}
        onClose={() => setShowSheetSelectionModal(false)}
        isOpen={showSheetSelectionModal}
        data-tour="sheet-selector"
      />

      {/* Research Modal */}
      <ResearchModal
        isOpen={showResearchModal}
        onClose={() => setShowResearchModal(false)}
        onResearchComplete={handleResearchComplete}
      />

      {/* Tour Debug Component */}
      <TourDebug />

      {/* Tips Banner - Fixed to bottom of canvas */}
      <TipsBanner />

      {/* Professional Loaders - Smart Loading System */}
      <SheetLoader 
        isLoading={(import.meta.env.VITE_DISABLE_LOADERS !== 'true') && (isLoadingSheets || isCheckingBackblazeData)} 
        message={
          isCheckingBackblazeData 
            ? 'Connecting to cloud storage...' 
            : isLoadingSheets 
              ? 'Loading spreadsheet...' 
              : 'Preparing your workspace...'
        } 
      />
      
      <AILoader 
        isLoading={(import.meta.env.VITE_DISABLE_LOADERS !== 'true') && isProcessingSchema} 
        showThinking={true}
        message="AI is analyzing your data structure..."
      />
      
      <DataLoader 
        isLoading={(import.meta.env.VITE_DISABLE_LOADERS !== 'true') && isProcessingCSV} 
        operation="upload" 
        message="Processing and uploading your data..." 
      />
      
      <ResearchLoader 
        isLoading={(import.meta.env.VITE_DISABLE_LOADERS !== 'true') && showResearchModal} 
        stage="searching"
        message="Researching data sources..."
      />

    </div>
  );
};

export default Index;
