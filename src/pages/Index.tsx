import { useState, useRef } from 'react';
import { useSpreadsheet } from '@/hooks/useSpreadsheet';
import { ThemeProvider } from '@/components/ThemeProvider';
import { InfiniteCanvas, InfiniteCanvasHandle } from '@/components/InfiniteCanvas';
import { ModernSpreadsheet } from '@/components/ModernSpreadsheet';
import { Toolbar } from '@/components/Toolbar';
import { AIAssistant } from '@/components/AIAssistant';
import { ChartBlock } from '@/components/ChartBlock';
import { CSVUploader } from '@/components/CSVUploader';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { SheetTabs } from '@/components/SheetTabs';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [isAIMinimized, setIsAIMinimized] = useState(false);
  const [chartPositions, setChartPositions] = useState<Record<string, { x: number; y: number }>>({});
  
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
    undo,
    redo,
    canUndo,
    canRedo,
  } = useSpreadsheet();

  const canvasRef = useRef<InfiniteCanvasHandle>(null);

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
      duration: 5000,
    });
  };

  const handleFormatAction = (action: string, value?: string) => {
    if (selectedCells.length === 0) return;

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
      {/* Persistent Upload CSV button at the top */}
      <div className="w-full flex justify-end p-4 bg-white/80 z-50 sticky top-0 shadow-sm">
        <div className="max-w-xs w-full">
          <CSVUploader onUpload={(csv) => addSheetFromCSV(csv, 'Uploaded Sheet')} />
        </div>
      </div>
      {/* TEST BUTTON: Remove after debugging */}
      <div className="w-full flex justify-center p-2">
        <button
          onClick={() => {
            // Get existing values in E2-E32, excluding formulas (values starting with '=')
            const values = [];
            for (let i = 2; i <= 32; i++) {
              const cellId = `E${i}`;
              const cell = activeSheet?.cells[cellId];
              if (
                cell &&
                cell.value !== undefined &&
                cell.value !== null &&
                cell.value !== "" &&
                !(typeof cell.value === 'string' && cell.value.trim().startsWith('='))
              ) {
                values.push({ cellId, value: cell.value });
              }
            }
            // Sort values ascending (numeric if possible, else string)
            values.sort((a, b) => {
              const aNum = parseFloat(a.value);
              const bNum = parseFloat(b.value);
              if (!isNaN(aNum) && !isNaN(bNum)) {
                return aNum - bNum;
              } else {
                return String(a.value).localeCompare(String(b.value));
              }
            });
            // Update E2-E32 with sorted values
            for (let i = 0; i < values.length; i++) {
              const cellId = `E${i + 2}`;
              updateCell(cellId, values[i].value);
            }
          }}
          style={{ padding: '8px 16px', background: '#059669', color: 'white', borderRadius: 8, fontWeight: 'bold', boxShadow: '0 2px 8px #0001' }}
        >
          Test Sort Existing E2-E32 Ascending
        </button>
      </div>
      <div className="h-screen overflow-hidden" style={gridBackground}>
        <InfiniteCanvas ref={canvasRef} onAddSheet={handleAddSheet}>
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
              <div className="spreadsheet-container">
                <ModernSpreadsheet
                  sheet={activeSheet}
                  updateCell={updateCell}
                  onSelectionChange={setSelectedCells}
                  selectedCells={selectedCells}
                  className="max-w-6xl"
                />
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

        {/* Toolbar - Left Sidebar */}
        <Toolbar
          onFormat={handleFormatAction}
          selectedCells={selectedCells}
          activeSheet={activeSheet}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        {/* AI Assistant - Fixed position */}
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
