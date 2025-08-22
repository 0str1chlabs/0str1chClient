import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AIAssistant } from '@/components/AIAssistant';
import { MovableToolbar } from '@/components/MovableToolbar';
import { ModernSpreadsheet } from '@/components/ModernSpreadsheet';
import { PivotTableModal } from '@/components/PivotTableModal';
import { InfiniteCanvas } from '@/components/InfiniteCanvas';
import { StatisticalSummary } from '@/components/StatisticalSummary';
import { useAuth } from '@/components/auth/AuthContext';
import { SheetData } from '@/types/spreadsheet';
import { Upload, Plus, X, BarChart3, MessageCircle, ZoomIn, ZoomOut, RotateCcw, LayoutGrid, LoaderCircle, Database } from 'lucide-react';
import { useDuckDBUpdates } from '@/hooks/useDuckDBUpdates';

const Index: React.FC = () => {
  const { user, logout } = useAuth();
  const [sheets, setSheets] = useState<SheetData[]>([
    {
      id: 'sheet1',
      name: 'Sheet 1',
      cells: {},
      rowCount: 1000,
      colCount: 26 // A-Z columns
    }
  ]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [isAIMinimized, setIsAIMinimized] = useState(false);
  const [showPivotTable, setShowPivotTable] = useState(false);
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

  const activeSheet = sheets[activeSheetIndex];

  // Hook for efficient DuckDB updates
  const { updateCell: updateDuckDBCell, batchUpdateCells: batchUpdateDuckDBCells } = useDuckDBUpdates();

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
      const isOnCanvasBackground = target.closest('.infinite-canvas') && !target.closest('.modern-spreadsheet');
      
      // Also check for main canvas container clicks (empty areas)
      const isOnMainCanvasArea = !isOnUIElement && !isOnSpreadsheetCell && 
                                 (target.classList.contains('main-canvas-area') || 
                                  target.closest('.main-canvas-area'));
      
      // Only deselect if clicking on sheet/canvas background, not on cells or UI elements
      if ((isOnSheetBackground || isOnCanvasBackground || isOnMainCanvasArea) && !isOnUIElement && selectedCells.length > 0) {
        console.log('Clicked on sheet/canvas background - deselecting cells');
        setSelectedCells([]);
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
    if (sheets.length > 0 && Object.keys(sheets[0].cells).length === 0) {
      // Keep the sheet completely empty - no pre-created cells
      // Cells will be created dynamically as users type
      setSheets(prev => prev.map((sheet, index) => 
        index === 0 ? { ...sheet, cells: {}, rowCount: 1000, colCount: 26 } : sheet
      ));
    }
  }, []); // Empty dependency array - only run once on mount

  const handleUpdateCell = useCallback(async (cellId: string, value: string | number) => {
    // Update local state immediately
    setSheets(prev => prev.map((sheet, index) => 
      index === activeSheetIndex 
        ? { ...sheet, cells: { ...sheet.cells, [cellId]: { value } } }
        : sheet
    ));

    // Skip individual DuckDB updates for now - they will be handled on next full reload
    // This keeps things simple and avoids the rowid() error
    console.log(`Cell ${cellId} updated locally - DuckDB will be updated on next full reload`);
  }, [activeSheetIndex]);

  const handleBulkUpdateCells = useCallback(async (updates: { cellId: string, value: any }[]) => {
    // Update local state immediately
    setSheets(prev => prev.map((sheet, index) => {
      if (index === activeSheetIndex) {
        const updatedCells = { ...sheet.cells };
        updates.forEach(({ cellId, value }) => {
          updatedCells[cellId] = { value };
        });
        return { ...sheet, cells: updatedCells };
      }
      return sheet;
    }));

    // Skip DuckDB batch updates for now - they will be handled on next full reload
    console.log(`${updates.length} cells updated locally - DuckDB will be updated on next full reload`);
  }, [activeSheetIndex]);

  const handleAddSheet = useCallback(() => {
    // Create a completely empty sheet - no pre-created cells
    const newSheet: SheetData = {
      id: `sheet${sheets.length + 1}`,
      name: `Sheet ${sheets.length + 1}`,
      cells: {}, // Start with empty cells object
      rowCount: 1000,
      colCount: 26
    };
    setSheets(prev => [...prev, newSheet]);
    setActiveSheetIndex(sheets.length);
  }, [sheets.length]);

  const handleRemoveSheet = useCallback((index: number) => {
    if (sheets.length > 1) {
      setSheets(prev => prev.filter((_, i) => i !== index));
      if (activeSheetIndex >= index && activeSheetIndex > 0) {
        setActiveSheetIndex(activeSheetIndex - 1);
      } else if (activeSheetIndex === index && index === 0) {
        setActiveSheetIndex(0);
      }
    }
  }, [sheets.length, activeSheetIndex]);

  const handleSheetNameChange = useCallback((index: number, newName: string) => {
    setSheets(prev => prev.map((sheet, i) => 
      i === index ? { ...sheet, name: newName } : sheet
    ));
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
          
          // Update the active sheet with CSV data
          setSheets(prev => prev.map((sheet, index) => 
            index === activeSheetIndex 
              ? { 
                  ...sheet, 
                  cells, 
                  rowCount: maxRow, 
                  colCount: maxCol 
                }
              : sheet
          ));

          // Use the original working logic - just trigger a flag for AIAssistant to handle
          console.log('CSV uploaded - triggering DuckDB reload via AIAssistant');
          setCsvUploaded(true);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [activeSheetIndex]);

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

  const handleFormat = useCallback((action: string, value?: string) => {
    console.log('Format action:', action, value);
    
    if (!selectedCells || selectedCells.length === 0) {
      console.log('No cells selected for formatting');
      return;
    }

    // Create a copy of the current sheets to modify
    setSheets(prev => prev.map((sheet, index) => {
      if (index === activeSheetIndex) {
        const updatedCells = { ...sheet.cells };
        
        // Apply formatting to all selected cells
        selectedCells.forEach(cellId => {
          const currentCell = updatedCells[cellId];
          if (currentCell) {
            const updatedCell = { ...currentCell };
            
            // Initialize style object if it doesn't exist
            if (!updatedCell.style) {
              updatedCell.style = {};
    }

    switch (action) {
      case 'bold-toggle':
                updatedCell.style.bold = value === 'true';
        break;
      case 'italic-toggle':
                updatedCell.style.italic = value === 'true';
        break;
      case 'underline-toggle':
                updatedCell.style.underline = value === 'true';
        break;
      case 'align-left':
                updatedCell.style.textAlign = 'left';
        break;
      case 'align-center':
                updatedCell.style.textAlign = 'center';
        break;
      case 'align-right':
                updatedCell.style.textAlign = 'right';
                break;
              case 'fill-color':
                if (value === 'transparent') {
                  delete updatedCell.style.backgroundColor;
                } else {
                  updatedCell.style.backgroundColor = value;
                }
                break;
              case 'text-color':
                updatedCell.style.textColor = value;
                break;
              case 'font-size':
                updatedCell.style.fontSize = parseInt(value || '12');
                break;
              case 'font-family':
                updatedCell.style.fontFamily = value;
        break;
      default:
                console.log('Unknown format action:', action);
                return sheet;
            }
            
            updatedCells[cellId] = updatedCell;
          }
        });
        
        return {
          ...sheet,
          cells: updatedCells
        };
      }
      return sheet;
    }));
    
    console.log(`Applied ${action} formatting to ${selectedCells.length} cells`);
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
      // Center the view on the sheet
      canvasRef.current.centerView(0, 0, 1000);
      
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
    
    // Reposition toolbar to left side
    const toolbar = document.querySelector('.movable-toolbar') as HTMLElement;
    if (toolbar) {
      // Ensure proper positioning without creating white blocks
      toolbar.style.position = 'fixed';
      toolbar.style.left = '20px';
      toolbar.style.right = 'auto';
      toolbar.style.top = '300px';
      toolbar.style.zIndex = '90';
      // Remove any conflicting styles
      toolbar.style.transform = 'none';
      toolbar.style.margin = '0';
      toolbar.style.padding = '0';
      // Ensure no background conflicts
      toolbar.style.background = 'transparent';
      toolbar.style.backgroundColor = 'transparent';
    }
    
    // Reposition embedded charts below the sheet
    setEmbeddedCharts(prev => prev.map((chart, index) => ({
      ...chart,
      position: {
        x: 100 + (index * 50),
        y: 800 + (index * 100)
      },
      size: {
        width: 350,
        height: 250
      }
    })));
    
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
          {sheets.map((sheet, index) => (
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
              {sheets.length > 1 && (
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
          {/* Spreadsheet Area - Allow free movement */}
          <div className="absolute inset-0 z-10">
                  <ModernSpreadsheet
                    sheet={activeSheet}
                    updateCell={handleUpdateCell}
                    bulkUpdateCells={handleBulkUpdateCells}
                    onSelectionChange={setSelectedCells}
                    selectedCells={selectedCells}
                    onAddMoreRows={() => {
                      setSheets(prev => prev.map((sheet, index) => 
                        index === activeSheetIndex 
                          ? { ...sheet, rowCount: sheet.rowCount + 1000 }
                          : sheet
                      ));
                    }}
                    onSheetNameChange={(newName) => handleSheetNameChange(activeSheetIndex, newName)}
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
          setIsAIMinimized(false);
        }}
        onGenerateChart={handleGenerateChart}
        onExportCSV={handleExportPivot}
        onSavePivot={handleSavePivot}
      />
    </div>
  );
};

export default Index;
