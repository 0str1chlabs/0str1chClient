import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AIAssistant } from '@/components/AIAssistant';
import { MovableToolbar } from '@/components/MovableToolbar';
import { ModernSpreadsheet } from '@/components/ModernSpreadsheet';
import { PivotTableModal } from '@/components/PivotTableModal';
import { InfiniteCanvas } from '@/components/InfiniteCanvas';
import { useAuth } from '@/components/auth/AuthContext';
import { SheetData } from '@/types/spreadsheet';
import { Upload, Plus, X, BarChart3, MessageCircle } from 'lucide-react';

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

  const activeSheet = sheets[activeSheetIndex];

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

  const handleUpdateCell = useCallback((cellId: string, value: string | number) => {
    setSheets(prev => prev.map((sheet, index) => 
      index === activeSheetIndex 
        ? { ...sheet, cells: { ...sheet.cells, [cellId]: { value } } }
        : sheet
    ));
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
        reader.onload = (event) => {
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
    if (aiChatbox && !aiChatbox.classList.contains('pinned')) {
      aiChatbox.style.left = '20px';
      aiChatbox.style.right = 'auto';
      aiChatbox.style.top = '100px';
    }
    
    // Reposition toolbar to left side
    const toolbar = document.querySelector('.movable-toolbar') as HTMLElement;
    if (toolbar) {
      toolbar.style.left = '20px';
      toolbar.style.right = 'auto';
      toolbar.style.top = '300px';
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
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  canvasRef.current?.zoomIn();
                }}
                className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Zoom In"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 1 1 14 0zM10 7v6m3-3H7" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  canvasRef.current?.zoomOut();
                }}
                className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Zoom Out"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 1 1 14 0zM10 7v6m3-3H7" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  canvasRef.current?.fitToView();
                }}
                className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Reset View"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
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
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              <Upload className="h-4 w-4 mr-2" />
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
      <div className="relative h-[calc(100vh-120px)] mt-20">
        {/* Infinite Canvas with Zoom and Pan */}
        <InfiniteCanvas 
          onAddSheet={handleAddSheet} 
          ref={canvasRef} 
          embeddedCharts={embeddedCharts}
          onRemoveChart={handleRemoveChart}
        >
          {/* Spreadsheet Area - Allow free movement */}
          <div className="absolute inset-0 z-10">
            <ModernSpreadsheet
              sheet={activeSheet}
              updateCell={handleUpdateCell}
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
          <div className="ai-chatbox fixed right-0 top-20 w-80 h-[calc(100vh-120px)] bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 z-[100] shadow-lg">
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
              onEmbedChart={handleEmbedChart}
            />
          </div>
        )}

        {/* Movable Toolbar - Positioned outside canvas with higher z-index */}
        <div className="movable-toolbar fixed left-0 top-20 z-[90]">
          <MovableToolbar
            onFormat={handleFormat}
            selectedCells={selectedCells}
            activeSheet={activeSheet}
            onCellSelect={(cellId) => setSelectedCells([cellId])}
            onAddSheet={handleAddSheet}
            onRearrange={handleRearrangeLayout}
          />
        </div>
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
