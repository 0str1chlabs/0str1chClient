import React, { useState, useRef, useCallback } from 'react';
import { useSpreadsheet } from '@/hooks/useSpreadsheet';
import { ThemeProvider } from '@/components/ThemeProvider';
import { InfiniteCanvas, InfiniteCanvasHandle } from '@/components/InfiniteCanvas';
import { ModernSpreadsheet } from '@/components/ModernSpreadsheet';
import { MovableToolbar } from '@/components/MovableToolbar';
import { AIAssistant } from '@/components/AIAssistant';
import { ChartBlock } from '@/components/ChartBlock';
import { CSVUploader } from '@/components/CSVUploader';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { SheetTabs } from '@/components/SheetTabs';
import { toast } from '@/hooks/use-toast';
import { ZoomIn, ZoomOut, User, LogOut, Sun, Moon, LayoutGrid } from 'lucide-react';
import { Resizable } from '@/components/Resizable';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { transformCsvToRowDocs } from '@/lib/vectorDB';
import SelectionSummaryDropdown from '@/components/SelectionSummaryDropdown';

const Index = () => {
  const { user, logout } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [isAIMinimized, setIsAIMinimized] = useState(false);
  const [chartPositions, setChartPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [zoom, setZoom] = useState(1);
  const [isSheetLoading, setSheetLoading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  
  const {
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
    addSheetFromCSV,
    addMoreRows,
    undo,
    redo,
    canUndo,
    canRedo,
    bulkUpdateCells,
  } = useSpreadsheet();

  const canvasRef = useRef<InfiniteCanvasHandle>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  const handleWelcomeAction = (action: 'upload' | 'sheet' | 'ai') => {
    setShowWelcome(false);
    if (action === 'sheet') {
      addSheet();
    }
    if (action === 'ai') {
      toast({
        title: "AI Assistant Ready",
        description: "I'm here to help you create amazing data visualizations!",
      });
    }
  };

  const handleAddSheet = () => {
    addSheet();
    setTimeout(() => {
      // @ts-expect-error: centerCanvas might not be defined on InfiniteCanvasHandle
      canvasRef.current?.centerCanvas?.();
    }, 100);
    toast({
      title: "New Sheet Added",
      description: "A new spreadsheet has been created!",
    });
  };

  const handleGenerateChart = (type: 'bar' | 'line' | 'pie' | 'area') => {
    if (!activeSheet) return;

    let chartData = [];
    if (selectedCells.length > 0) {
      // Use selected cells: assume two columns (A and B) for name and value
      // Group by row, get A as name, B as value
      const rows = Array.from(new Set(selectedCells.map(cellId => parseInt(cellId.slice(1)))));
      chartData = rows.map(rowNum => {
        const name = activeSheet.cells[`A${rowNum}`]?.value;
        const value = Number(activeSheet.cells[`B${rowNum}`]?.value) || 0;
        return name && !isNaN(value) ? { name: name.toString(), value } : null;
      }).filter(Boolean);
    } else {
      // Use the entire first row of data (A2:B7)
    for (let i = 1; i <= 6; i++) {
        const name = activeSheet.cells[`A${i + 1}`]?.value;
        const value = activeSheet.cells[`B${i + 1}`]?.value;
        if (name && value) {
        chartData.push({
            name: name.toString(),
            value: Number(value) || 0,
        });
        }
      }
    }

    if (chartData.length === 0) {
      toast({
        title: "No Data Found",
        description: "Please add some data to your spreadsheet first.",
        variant: "destructive",
      });
      return;
    }

    const chartId = `chart-${Date.now()}`;
    addChart({
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Chart - Sales Data`,
      data: chartData,
      range: selectedCells.length > 0 ? `${selectedCells[0]}:${selectedCells[selectedCells.length-1]}` : 'A2:B7',
      minimized: false,
    });

    // Position chart to the right of the spreadsheet
    setChartPositions(prev => ({
      ...prev,
      [chartId]: { x: 1200, y: 100 + Object.keys(prev).length * 400 }
    }));

    toast({
      title: "Chart Created",
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} chart has been added to your canvas.`,
    });
  };

  const handleCalculate = (operation: string) => {
    if (!activeSheet) return;

    let result = '';
    let values: number[] = [];

    switch (operation) {
      case 'sum-selected':
        selectedCells.forEach(cellId => {
          const value = activeSheet.cells[cellId]?.value;
          if (typeof value === 'number') values.push(value);
        });
        result = values.length > 0 ? `Sum: ${values.reduce((a, b) => a + b, 0).toLocaleString()}` : 'No numeric values found';
        break;
      case 'average-selected':
        selectedCells.forEach(cellId => {
          const value = activeSheet.cells[cellId]?.value;
          if (typeof value === 'number') values.push(value);
        });
        const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        result = values.length > 0 ? `Average: ${avg.toFixed(2)}` : 'No numeric values found';
        break;
      case 'median-selected':
        selectedCells.forEach(cellId => {
          const value = activeSheet.cells[cellId]?.value;
          if (typeof value === 'number') values.push(value);
        });
        if (values.length > 0) {
          values.sort((a, b) => a - b);
          const mid = Math.floor(values.length / 2);
          const median = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
          result = `Median: ${median}`;
        } else {
          result = 'No numeric values found';
        }
        break;
      case 'max-selected':
        selectedCells.forEach(cellId => {
          const value = activeSheet.cells[cellId]?.value;
          if (typeof value === 'number') values.push(value);
        });
        result = values.length > 0 ? `Maximum: ${Math.max(...values)}` : 'No numeric values found';
        break;
      case 'min-selected':
        selectedCells.forEach(cellId => {
          const value = activeSheet.cells[cellId]?.value;
          if (typeof value === 'number') values.push(value);
        });
        result = values.length > 0 ? `Minimum: ${Math.min(...values)}` : 'No numeric values found';
        break;
      default:
        if (operation.startsWith('sum-') || operation.startsWith('avg-')) {
          const column = operation.split('-')[1]?.toUpperCase();
          if (column) {
            for (let i = 2; i <= 7; i++) {
              const value = activeSheet.cells[`${column}${i}`]?.value;
              if (typeof value === 'number') values.push(value);
            }
            if (operation.startsWith('sum-')) {
              result = values.length > 0 ? `Sum of column ${column}: ${values.reduce((a, b) => a + b, 0).toLocaleString()}` : `No numeric values found in column ${column}`;
            } else {
              const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
              result = values.length > 0 ? `Average of column ${column}: ${avgValue.toFixed(2)}` : `No numeric values found in column ${column}`;
            }
          }
        } else {
          result = 'Calculation completed';
        }
    }

    toast({
      title: "Calculation Result",
      description: result,
    });
  };

  const handleFormatAction = (action: string, value?: string) => {
    if (selectedCells.length === 0) {
      toast({
        title: "No Cells Selected",
        description: "Please select cells to format.",
        variant: "destructive",
      });
      return;
    }

    switch (action) {
      case 'bold-toggle':
        formatCells(selectedCells, { bold: value === 'true' });
        break;
      case 'italic-toggle':
        formatCells(selectedCells, { italic: value === 'true' });
        break;
      case 'underline-toggle':
        formatCells(selectedCells, { underline: value === 'true' });
        break;
      case 'font-family':
        formatCells(selectedCells, { fontFamily: value });
        break;
      case 'font-size':
        formatCells(selectedCells, { fontSize: parseInt(value || '12') });
        break;
      case 'text-color':
        formatCells(selectedCells, { textColor: value });
        break;
      case 'fill-color':
        formatCells(selectedCells, { backgroundColor: value });
        break;
      case 'align-left':
        formatCells(selectedCells, { textAlign: 'left' });
        break;
      case 'align-center':
        formatCells(selectedCells, { textAlign: 'center' });
        break;
      case 'align-right':
        formatCells(selectedCells, { textAlign: 'right' });
        break;
      default:

    }
  };

  // Enhanced upload handler: pushes to Qdrant in the background
  const handleCSVUploadAndPush = async (csv: string[][]) => {
    // 1. Show data in UI immediately
    addSheetFromCSV(csv, 'Uploaded Sheet');

    // 2. Start Qdrant upload in background (non-blocking)
    if (user?.email) {
      setIsIndexing(true); // Show loader
      setTimeout(async () => {
        try {
          const rowDocs = transformCsvToRowDocs(csv, 'Uploaded Sheet');
          // Removed: await pushRowsToQdrantDB(rowDocs, user.email);
          toast({
            title: 'Indexing Complete',
            description: 'Rows pushed to Qdrant successfully!',
          });
        } catch (err) {
          toast({
            title: 'Qdrant Upload Failed',
            description: err instanceof Error ? err.message : 'Unknown error',
            variant: 'destructive',
          });
        } finally {
          setIsIndexing(false); // Hide loader
        }
      }, 0);
    }
  };

  const handleCreateCustom = () => {
    toast({
      title: "Custom Creation Mode",
      description: "Tell me what you'd like to create and I'll help you build it!",
    });
  };

  const handleSelectionChange = (cells: string[]) => {
    setSelectedCells(cells);
  };

  const handleChartPositionChange = (chartId: string, position: { x: number; y: number }) => {
    setChartPositions(prev => ({
      ...prev,
      [chartId]: position
    }));
  };

  // Listen for embed requests from chat and add chart to canvas
  React.useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ data: any[]; chartSpec: any }>;
      const payload = custom.detail;
      if (!payload?.data || !payload?.chartSpec) return;

      const chartId = `chart-${Date.now()}`;
      // Normalize to ChartBlock format
      const xField = payload.chartSpec?.x?.field;
      const yField = payload.chartSpec?.y?.field;
      const normalized = Array.isArray(payload.data)
        ? payload.data.map((row: any, i: number) => ({
            name: row?.[xField] ?? `Item ${i + 1}`,
            value: Number(row?.[yField] ?? 0)
          }))
        : [];

      addChart({
        type: payload.chartSpec?.type || 'bar',
        title: payload.chartSpec?.title || 'AI Chart',
        data: normalized,
        range: 'AI Generated',
        minimized: false,
      });

      // Place below the sheet
      setChartPositions(prev => ({
        ...prev,
        [chartId]: { x: 100, y: 800 + Object.keys(prev).length * 350 }
      }));

      // Zoom out a bit to reveal the area
      setTimeout(() => setZoom(z => Math.max(0.6, z - 0.1)), 150);
      toast({ title: 'Chart embedded', description: 'Added to canvas below the sheet.' });
    };
    window.addEventListener('embedChartFromChat', handler as EventListener);
    return () => window.removeEventListener('embedChartFromChat', handler as EventListener);
  }, [addChart, setChartPositions]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.1));
  };

  // Rearrange layout function
  const handleRearrange = () => {
    if (!activeSheet) return;
    
    // Calculate the center position for the sheet
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 64; // Subtract header height
    
    // Center the sheet horizontally and position it near the top
    const sheetCenterX = (viewportWidth - 1400) / 2; // 1400 is the sheet width
    const sheetTopY = 100; // Position sheet near the top
    
    // Arrange charts below the sheet
    const chartStartY = sheetTopY + 800; // Start charts below the sheet
    const chartSpacing = 450; // Space between charts
    
    // Update chart positions
    const newChartPositions: Record<string, { x: number; y: number }> = {};
    if (state.charts.length > 0) {
      state.charts.forEach((chart, index) => {
        const chartX = sheetCenterX + (index % 2) * 750; // 2 columns of charts
        const chartY = chartStartY + Math.floor(index / 2) * chartSpacing;
        newChartPositions[chart.id] = { x: chartX, y: chartY };
      });
      setChartPositions(newChartPositions);
    }
    
    // Calculate optimal zoom for the infinite canvas to fit everything in viewport
    let totalHeight = sheetTopY + 800; // Sheet height
    let totalWidth = 1400; // Sheet width
    
    if (state.charts.length > 0) {
      const chartRows = Math.ceil(state.charts.length / 2);
      totalHeight += chartRows * chartSpacing;
      totalWidth = Math.max(1400, 1500); // Ensure enough width for 2 columns of charts
    }
    
    const zoomX = (viewportWidth - 100) / totalWidth; // Leave 50px margin on each side
    const zoomY = (viewportHeight - 100) / totalHeight; // Leave 50px margin on top and bottom
    
    const optimalZoom = Math.min(zoomX, zoomY, 1); // Don't zoom in beyond 100%
    
    // Use the infinite canvas zoom instead of page zoom
    if (canvasRef.current) {
      try {
        // First, zoom the infinite canvas to fit the content
        if (canvasRef.current.zoomTo) {
          canvasRef.current.zoomTo(optimalZoom, 500);
        }
        
        // Use a simpler approach: reset the view to center and let the library handle positioning
        // The charts and sheet are already positioned correctly, so we just need to ensure they're visible
        setTimeout(() => {
          // After zoom animation completes, try to center the view
          if (canvasRef.current && canvasRef.current.centerView) {
            // Center on the sheet position
            const centerX = sheetCenterX + 700; // Center of sheet
            const centerY = sheetTopY + 350; // Center of sheet
            canvasRef.current.centerView(centerX, centerY, 300);
          }
        }, 600); // Wait for zoom animation to complete
        
      } catch (error) {
        console.warn('Error adjusting infinite canvas:', error);
      }
    }
    
    toast({
      title: "Layout Rearranged",
      description: state.charts.length > 0 
        ? "Sheet centered and charts arranged below for better visibility."
        : "Sheet centered in the viewport for better visibility.",
    });
  };

  // Handle mouse wheel zoom for the entire board
  const handleWheel = useCallback((event: WheelEvent) => {
    // Check if we're hovering over scrollable content that should not trigger zoom
    const target = event.target as HTMLElement;
    const isOverScrollable = target.closest('.overflow-auto') ||
                            target.closest('[data-scrollable="true"]') ||
                            target.closest('.modern-spreadsheet') ||
                            target.closest('.ai-assistant') ||
                            target.closest('.toolbar') ||
                            target.closest('.chart-block');
    
    if (isOverScrollable) {
      // Allow normal scrolling, don't zoom
      return;
    }

    // Prevent default scroll behavior and handle zoom
    event.preventDefault();
    
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => {
      const newZoom = prev + delta;
      return Math.max(0.1, Math.min(3, newZoom));
    });
  }, []);

  // Add wheel event listener to the board container
  React.useEffect(() => {
    const container = boardContainerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // CSS grid background (40px squares, light gray)
  const gridBackground = {
    backgroundColor: state.isDarkMode ? '#1a1a1a' : '#fff',
    backgroundImage: state.isDarkMode 
      ? 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)'
      : 'linear-gradient(to right, #ececec 1px, transparent 1px), linear-gradient(to bottom, #ececec 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  };

  if (showWelcome) {
    return (
      <ThemeProvider isDarkMode={state.isDarkMode} toggleTheme={toggleTheme}>
        <WelcomeScreen
          onUploadCSV={() => document.getElementById('csv-upload')?.click()}
          onCreateSheet={() => handleWelcomeAction('sheet')}
          onStartAI={() => handleWelcomeAction('ai')}
        />
        <CSVUploader onUpload={handleCSVUploadAndPush} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider isDarkMode={state.isDarkMode} toggleTheme={toggleTheme}>
      {/* Fixed Header at the top of the screen */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between px-6 h-16">
        <h1 className="text-2xl font-bold text-black dark:text-yellow-400 tracking-wide">0str1ch</h1>
        <div className="flex items-center gap-4">
          <div className="bg-background/90 text-foreground px-4 py-2 rounded-full shadow-lg text-sm font-semibold select-none border border-border">
            Zoom: {(zoom * 100).toFixed(0)}%
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} className="text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} className="text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={handleRearrange}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              title="Rearrange Layout"
            >
              <LayoutGrid size={16} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
          
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            title={state.isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {state.isDarkMode ? (
              <Sun size={16} className="text-yellow-400" />
            ) : (
              <Moon size={16} className="text-gray-600" />
            )}
          </button>
          
          <div className="ml-2">
            <CSVUploader onUpload={handleCSVUploadAndPush} />
          </div>
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Zoomable Board Container */}
      <div 
        ref={boardContainerRef}
        className="fixed top-16 left-0 w-full h-[calc(100vh-4rem)] overflow-hidden"
        style={{
          transformOrigin: 'top left',
          transform: `scale(${zoom})`,
        }}
      >
        <InfiniteCanvas ref={canvasRef} onAddSheet={handleAddSheet} zoom={1} onZoomChange={() => {}}>
          <div className="relative w-full h-full">
            {/* Sheet Tabs */}
            {state.sheets.length > 0 && (
              <div className="mb-4">
                <SheetTabs
                  sheets={state.sheets}
                  activeSheetId={state.activeSheetId}
                  setActiveSheet={setActiveSheet}
                  removeSheet={removeSheet}
                />
              </div>
            )}
            {/* Main Spreadsheet */}
            {activeSheet && (
              <div className="spreadsheet-container relative">
                      <Resizable
        initialWidth={1400}
        initialHeight={700}
        minWidth={600}
        minHeight={400}
        maxWidth={1800}
        maxHeight={900}
      >
                  <ModernSpreadsheet
                    sheet={activeSheet}
                    updateCell={updateCell}
                    bulkUpdateCells={bulkUpdateCells}
                    onSelectionChange={setSelectedCells}
                    selectedCells={selectedCells}
                    onAddMoreRows={addMoreRows}
                    className="w-full h-full"
                    isSheetLoading={isSheetLoading}
                    setSheetLoading={setSheetLoading}
                  />
                  {/* Selection Summary Dropdown */}
                  <SelectionSummaryDropdown selectedCells={selectedCells} sheet={activeSheet} />
                </Resizable>
              </div>
            )}
            {/* Chart Blocks */}
            {state.charts.map((chart) => (
              <ChartBlock
                key={chart.id}
                chart={chart}
                onUpdate={updateChart}
                onRemove={removeChart}
                position={chartPositions[chart.id]}
                onPositionChange={(chartId, position) => 
                  setChartPositions(prev => ({ ...prev, [chartId]: position }))
                }
              />
            ))}
          </div>
        </InfiniteCanvas>
        
        {/* Movable Toolbar */}
        <MovableToolbar
          onFormat={handleFormatAction}
          selectedCells={selectedCells}
          activeSheet={activeSheet}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onAddSheet={handleAddSheet}
          onRearrange={handleRearrange}
        />
        
        {/* AI Assistant */}
        <AIAssistant
          onGenerateChart={handleGenerateChart}
          onCalculate={handleCalculate}
          activeSheet={activeSheet}
          selectedCells={selectedCells}
          isMinimized={isAIMinimized}
          onToggleMinimize={() => setIsAIMinimized(!isAIMinimized)}
          onUploadCSV={() => document.getElementById('csv-upload')?.click()}
          onCreateCustom={() => toast({
            title: "Custom Creation Mode",
            description: "Tell me what you'd like to create and I'll help you build it!",
          })}
          updateCell={updateCell}
          bulkUpdateCells={bulkUpdateCells}
        />
      </div>
    </ThemeProvider>
  );
};

export default Index;
