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
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Resizable } from '@/components/Resizable';

const Index = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [isAIMinimized, setIsAIMinimized] = useState(false);
  const [chartPositions, setChartPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [zoom, setZoom] = useState(1);
  const [isSheetLoading, setSheetLoading] = useState(false);
  
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
        console.log('Unhandled format action:', action, value);
    }
  };

  const handleCSVUpload = () => {
    document.getElementById('csv-upload')?.click();
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

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.1));
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
    backgroundColor: '#fff',
    backgroundImage:
      'linear-gradient(to right, #ececec 1px, transparent 1px), ' +
      'linear-gradient(to bottom, #ececec 1px, transparent 1px)',
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
        <CSVUploader onUpload={(csv) => addSheetFromCSV(csv, 'Uploaded Sheet')} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider isDarkMode={state.isDarkMode} toggleTheme={toggleTheme}>
      {/* Fixed Header at the top of the screen */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm flex items-center justify-between px-6 h-16">
        <h1 className="text-2xl font-bold text-black dark:text-yellow-400 tracking-wide">0str1ch</h1>
        <div className="flex items-center gap-4">
          <div className="bg-black/80 text-yellow-200 px-4 py-2 rounded-full shadow-lg text-sm font-semibold select-none">
            Zoom: {(zoom * 100).toFixed(0)}%
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} className="text-gray-600" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} className="text-gray-600" />
            </button>
          </div>
          <div className="ml-2">
            <CSVUploader onUpload={(csv) => addSheetFromCSV(csv, 'Uploaded Sheet')} />
          </div>
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
          <div className="relative w-full h-full" style={{ transform: 'translate(650px, 200px)' }}  >
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
              <div className="spreadsheet-container">
                <Resizable
                  initialWidth={800}
                  initialHeight={600}
                  minWidth={400}
                  minHeight={300}
                  maxWidth={1200}
                  maxHeight={800}                
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
        />
      </div>
    </ThemeProvider>
  );
};

export default Index;
