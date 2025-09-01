import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AIAssistant } from '@/components/AIAssistant';
import { MovableToolbar } from '@/components/MovableToolbar';
import { ModernSpreadsheet } from '@/components/ModernSpreadsheet';
import { PivotTableModal } from '@/components/PivotTableModal';
import { InfiniteCanvas } from '@/components/InfiniteCanvas';
import { StatisticalSummary } from '@/components/StatisticalSummary';
import { ReportGenerator } from '@/components/ReportGenerator';
import { AIReportGenerator } from '@/components/AIReportGenerator';
import { useAuth } from '@/components/auth/AuthContext';
import { SheetData } from '@/types/spreadsheet';
import { Upload, Plus, X, BarChart3, MessageCircle, ZoomIn, ZoomOut, RotateCcw, LayoutGrid, LoaderCircle, Database, FileText, Brain, Cloud } from 'lucide-react';
import { useDuckDBUpdates } from '@/hooks/useDuckDBUpdates';
import { createDebouncedSelectionUpdater, SelectionPerformanceMonitor } from '@/lib/cellSelectionUtils';
import { useSpreadsheet } from '@/hooks/useSpreadsheet';
import MegaApiService from '../services/megaApiService';
import { MegaAuthModal } from '../components/MegaAuthModal';

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
    restoreOriginalState,
    addSheet,
    removeSheet,
    setActiveSheet,
    addMoreRows,
    undo,
    redo,
    canUndo,
    canRedo
  } = useSpreadsheet();
  
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [isAIMinimized, setIsAIMinimized] = useState(false);
  const [showPivotTable, setShowPivotTable] = useState(false);
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [showAIReportGenerator, setShowAIReportGenerator] = useState(false);
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

  // MEGA storage state
  const [showMegaAuth, setShowMegaAuth] = useState(false);
  const [isMegaAuthenticated, setIsMegaAuthenticated] = useState(false);

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

  // Check for existing sheet data in MEGA cloud storage on page load
  useEffect(() => {
    const checkExistingSheetData = async () => {
      if (user?.email) {
        try {
          console.log('🔍 Checking for existing sheet data in MEGA cloud storage...');
          
          // Check MEGA service status via backend
          const megaStatus = await MegaApiService.checkMegaStatus();
          if (!megaStatus.success) {
            console.log('🔐 MEGA service not available, prompting for authentication...');
            setShowMegaAuth(true);
            return;
          }
          
          const result = await MegaApiService.checkUserSheetData(user.email);
          
          if (result.success && result.hasData) {
            console.log('📊 Found existing sheet data in MEGA cloud:', result.data);
            
            // Ask user if they want to load existing data
            if (window.confirm('Found existing sheet data in MEGA cloud. Would you like to load it?')) {
              await loadExistingSheetData(user.email);
            }
          } else {
            console.log('📭 No existing sheet data found for user in MEGA cloud');
          }
        } catch (error) {
          console.error('❌ Error checking for existing sheet data:', error);
        }
      }
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

  const handleAddSheet = useCallback(() => {
    // Use the new hook to add a sheet
    addSheet();
    setActiveSheetIndex(state.sheets.length);
  }, [addSheet, state.sheets.length]);

  const handleRemoveSheet = useCallback((index: number) => {
    if (state.sheets.length > 1) {
      const sheetToRemove = state.sheets[index];
      removeSheet(sheetToRemove.id);
      if (activeSheetIndex >= index && activeSheetIndex > 0) {
        setActiveSheetIndex(activeSheetIndex - 1);
      } else if (activeSheetIndex === index && index === 0) {
        setActiveSheetIndex(0);
      }
    }
  }, [state.sheets.length, activeSheetIndex, removeSheet, state.sheets]);

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
                console.log('🔐 MEGA service not available, prompting for authentication...');
                setShowMegaAuth(true);
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
                setIsMegaAuthenticated(true);
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
      console.log('🔄 Loading existing sheet data from MEGA cloud storage...');
      
      // Get list of user files to let them choose
      const filesResult = await MegaApiService.listUserFiles(userEmail);
      
      if (filesResult.success && filesResult.data && filesResult.data.length > 0) {
        // Let user choose which file to load
        const fileNames = filesResult.data.map((file: any) => file.fileName);
        const selectedFileName = window.prompt(
          'Choose a file to load:\n' + fileNames.join('\n'),
          fileNames[0]
        );
        
        if (selectedFileName && fileNames.includes(selectedFileName)) {
          const result = await MegaApiService.retrieveSheetData(userEmail, selectedFileName);
          
          if (result.success && result.data?.sheetData) {
            const { sheetData, fileName } = result.data;
            
            // Update the active sheet with retrieved data using the new hook
            const updates = Object.entries(sheetData.cells || {}).map(([cellId, cell]: [string, any]) => ({
              cellId,
              value: cell.value
            }));
            bulkUpdateCells(updates);

            // Note: updateLastAccessed is handled by the backend now
            
            console.log('✅ Sheet data successfully loaded from MEGA cloud storage');
            
            // Trigger DuckDB reload
            setCsvUploaded(true);
          } else {
            console.error('❌ Failed to load sheet data:', result.message);
          }
        }
      } else {
        console.log('📭 No files found in MEGA cloud storage');
      }
    } catch (error) {
      console.error('❌ Error loading existing sheet data:', error);
    }
  }, [activeSheetIndex]);

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
            
            {/* MEGA Cloud Storage Button */}
            <Button
              onClick={() => setShowMegaAuth(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Cloud className="h-4 w-4" />
              {isMegaAuthenticated ? 'MEGA Connected' : 'Connect MEGA'}
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
            
            {/* Report Generator Button */}
            <Button
              onClick={() => {
                setShowReportGenerator(true);
                setIsAIMinimized(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-white transition-all duration-200 hover:scale-105"
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
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
              onClick={() => setActiveSheetIndex(index)}
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
            />
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

      {/* Report Generator Modal */}
      <ReportGenerator
        activeSheet={activeSheet}
        existingCharts={embeddedCharts}
        isOpen={showReportGenerator}
        onClose={() => {
          setShowReportGenerator(false);
        }}
      />

      {/* AI Report Generator Modal */}
      <AIReportGenerator
        activeSheet={activeSheet}
        isOpen={showAIReportGenerator}
        onClose={() => {
          setShowAIReportGenerator(false);
        }}
      />
      
      {/* MEGA Authentication Modal */}
      <MegaAuthModal
        isVisible={showMegaAuth}
        onClose={() => setShowMegaAuth(false)}
        onAuthSuccess={() => {
          setIsMegaAuthenticated(true);
          setShowMegaAuth(false);
        }}
      />
    </div>
  );
};

export default Index;
