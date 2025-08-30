import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chart } from '@/components/ui/chart';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Activity, 
  Download, 
  Save,
  X,
  Plus,
  Minus,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowLeft,
  Info,
  HelpCircle,
  MousePointer,
  ArrowRight,
  Table2
} from 'lucide-react';
import { SheetData } from '@/types/spreadsheet';

// Import react-pivottable
import PivotTableUI from 'react-pivottable/PivotTableUI';
import 'react-pivottable/pivottable.css';

// Pivot table state interface
interface PivotState {
  rows?: string[];
  cols?: string[];
  vals?: string[];
  aggregatorName?: string;
  rendererName?: string;
  sorters?: any;
  derivedAttributes?: any;
  hiddenAttributes?: string[];
  hiddenFromAggregators?: string[];
  hiddenFromDragDrop?: string[];
  menuLimit?: number;
  colsLimit?: number;
  rowsLimit?: number;
  rendererOptions?: any;
  localeStrings?: any;
}

interface EnhancedPivotTableFullScreenProps {
  sheet: SheetData;
  onBackToSheet: () => void;
  onSavePivot: (pivotTable: any) => void;
  onExport: () => void;
  onGenerateChart: (type: 'bar' | 'line' | 'pie' | 'area') => void;
}

export const EnhancedPivotTableFullScreen: React.FC<EnhancedPivotTableFullScreenProps> = ({
  sheet,
  onBackToSheet,
  onSavePivot,
  onExport,
  onGenerateChart
}) => {
  const [pivotState, setPivotState] = useState<PivotState>({});
  const [showConfig, setShowConfig] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const [chartSpec, setChartSpec] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  // Convert sheet data to react-pivottable format (array of arrays)
  const pivotData = useMemo(() => {
    if (!sheet || !sheet.cells) return [];
    
    const data: any[][] = [];
    
    // Find the actual data range by scanning for non-empty cells
    let maxCol = 0;
    let maxRow = 0;
    
    // Scan through all cells to find the actual data boundaries
    Object.keys(sheet.cells).forEach(key => {
      const cell = sheet.cells[key];
      if (cell?.value !== undefined && cell.value !== '') {
        const match = key.match(/^([A-Z]+)(\d+)$/);
        if (match) {
          const col = match[1];
          const row = parseInt(match[2]);
          
          // Convert column letter to number (A=0, B=1, etc.)
          let colNum = 0;
          for (let i = 0; i < col.length; i++) {
            colNum = colNum * 26 + (col.charCodeAt(i) - 64);
          }
          colNum--; // Adjust to 0-based index
          
          maxCol = Math.max(maxCol, colNum);
          maxRow = Math.max(maxRow, row);
        }
      }
    });
    
    // Get headers from first row
    const headers: string[] = [];
    for (let i = 0; i <= maxCol; i++) {
      const column = String.fromCharCode(65 + i);
      const headerCell = sheet.cells[`${column}1`];
      if (headerCell?.value && headerCell.value.toString().trim() !== '') {
        headers.push(headerCell.value.toString().trim());
      } else {
        // Only add generic name if column actually has data
        let hasData = false;
        for (let row = 2; row <= maxRow; row++) {
          const cell = sheet.cells[`${column}${row}`];
          if (cell?.value !== undefined && cell.value !== '') {
            hasData = true;
            break;
          }
        }
        if (hasData) {
          headers.push(`Column ${column}`);
        }
      }
    }
    
    // Add headers as first row
    data.push(headers);
    
    // Convert data rows
    for (let row = 2; row <= maxRow; row++) {
      const rowData: any[] = [];
      let hasData = false;
      
      for (let i = 0; i < headers.length; i++) {
        const column = String.fromCharCode(65 + i);
        const cell = sheet.cells[`${column}${row}`];
        
        if (cell?.value !== undefined && cell.value !== '') {
          rowData.push(cell.value);
          hasData = true;
        } else {
          rowData.push('');
        }
      }
      
      if (hasData) {
        data.push(rowData);
      }
    }
    
    return data;
  }, [sheet]);

  // Generate chart data for ECharts when pivot state changes
  useEffect(() => {
    if (!pivotState.rows || !pivotState.cols || !pivotState.vals || pivotData.length <= 1) {
      setChartData(null);
      setChartSpec(null);
      return;
    }

    try {
      // Skip first row (headers) and process data
      const dataRows = pivotData.slice(1);
      const headers = pivotData[0];
      
      // Get unique values for rows and columns
      const rowIndex = headers.indexOf(pivotState.rows![0]);
      const colIndex = headers.indexOf(pivotState.cols![0]);
      const valIndex = headers.indexOf(pivotState.vals![0]);
      
      if (rowIndex === -1 || colIndex === -1 || valIndex === -1) return;
      
      const rowValues = [...new Set(dataRows.map(row => row[rowIndex]))];
      const colValues = [...new Set(dataRows.map(row => row[colIndex]))];
      
      // Generate aggregated data for chart
      const aggregatedData = rowValues.map(rowVal => {
        const rowData = dataRows.filter(row => row[rowIndex] === rowVal);
        const sum = rowData.reduce((acc, row) => {
          const numVal = parseFloat(row[valIndex]) || 0;
          return acc + numVal;
        }, 0);
        
        return {
          [pivotState.rows![0]]: rowVal,
          [pivotState.vals![0]]: sum
        };
      });

      setChartData(aggregatedData);

      // Generate chart spec
      const spec = {
        type: 'bar' as const,
        title: `Pivot Chart: ${pivotState.rows![0]} vs ${pivotState.vals![0]}`,
        x: { 
          field: pivotState.rows![0], 
          type: 'category' as const 
        },
        y: { 
          field: pivotState.vals![0], 
          type: 'numeric' as const, 
          format: 'number' as const 
        }
      };
      setChartSpec(spec);
    } catch (error) {
      console.error('Error generating chart data:', error);
      setChartData(null);
      setChartSpec(null);
    }
  }, [pivotState, pivotData]);

  const handleRefresh = () => {
    // Reset pivot state to refresh
    setPivotState({});
  };

  const handleToggleChart = () => {
    setShowChart(!showChart);
  };

  const handleExportCSV = () => {
    try {
      // Convert pivot data to CSV format
      const csvContent = pivotData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pivot-table.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      
      onExport();
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const handleSavePivot = () => {
    // Convert pivot state to our internal format
    const pivotTable = {
      id: 'react-pivot-fullscreen',
      name: 'React Pivot Table',
      zones: [
        { type: 'rows', fields: pivotState.rows?.map(row => ({ id: row, name: row, type: 'text', column: row })) || [] },
        { type: 'columns', fields: pivotState.cols?.map(col => ({ id: col, name: col, type: 'text', column: col })) || [] },
        { type: 'values', fields: pivotState.vals?.map(val => ({ id: val, name: val, type: 'number', column: val })) || [] },
        { type: 'filters', fields: [] }
      ],
      data: [],
      headers: [],
      isVisible: true
    };
    
    onSavePivot(pivotTable);
  };

  const handleGenerateChart = () => {
    onGenerateChart('bar');
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex">
      {/* Left Panel - Advanced Options */}
      <div className="w-80 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Left Panel Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Options</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure your pivot table with advanced features
          </p>
        </div>

        {/* Fields Section */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* Available Fields */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Available Fields</h4>
              <div className="space-y-2">
                {pivotData[0]?.map((field, index) => (
                  <div
                    key={index}
                    className="p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg cursor-move hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    draggable
                    title={`Drag ${field} to configure pivot`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{field}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Drag me</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart Type Selection */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Chart Type</h4>
              <div className="grid grid-cols-2 gap-2">
                {['Bar', 'Line', 'Pie', 'Area'].map((type) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    onClick={() => onGenerateChart(type.toLowerCase() as 'bar' | 'line' | 'pie' | 'area')}
                    className="text-xs"
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            {/* Aggregation Options */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Aggregation</h4>
              <div className="space-y-2">
                {['Sum', 'Average', 'Count', 'Min', 'Max'].map((agg) => (
                  <Button
                    key={agg}
                    variant={pivotState.aggregatorName === agg ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPivotState(prev => ({ ...prev, aggregatorName: agg }))}
                    className="w-full text-xs justify-start"
                  >
                    {agg}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Keep Sheet Visible */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBackToSheet}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sheet
            </Button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Full Screen Pivot Table</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleToggleChart}>
              {showChart ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showChart ? 'Hide Chart' : 'Show Chart'}
            </Button>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={handleSavePivot}>
              <Save className="h-4 w-4 mr-2" />
              Save Pivot
            </Button>
          </div>
        </div>

        {/* Main Content - Reduced Height to Keep Sheet Visible */}
        <div className="h-[calc(100vh-200px)] overflow-hidden">
          {showChart && chartData && chartSpec ? (
            // ECharts Chart View
            <div className="h-full p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Pivot Table Chart</h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Generated from pivot table data using Shadcn Charts
                </p>
              </div>
              <div className="h-[500px] flex items-center justify-center">
                <Chart
                  data={chartData}
                  type="bar"
                  xKey={pivotState.rows?.[0] || 'category'}
                  yKey={pivotState.vals?.[0] || 'value'}
                  height={500}
                  showGrid={true}
                  showLegend={true}
                  showTooltip={true}
                  className="w-full h-full"
                />
              </div>
            </div>
          ) : (
            // Pivot Table View
            <div className="h-full">
              {pivotData.length > 1 ? (
                <div className="w-full h-full" style={{ position: 'relative', zIndex: 1 }}>
                  <style>{`
                    /* Enhanced styling for full-screen mode */
                    .pvtTable {
                      width: 100% !important;
                      border-collapse: collapse !important;
                      font-size: 14px !important;
                    }
                    .pvtTable th, .pvtTable td {
                      border: 1px solid #e5e7eb !important;
                      padding: 8px 12px !important;
                      text-align: left !important;
                    }
                    .pvtTable th {
                      background-color: #f9fafb !important;
                      font-weight: 600 !important;
                      color: #374151 !important;
                    }
                    .pvtTable td {
                      color: #6b7280 !important;
                    }
                    /* Enhanced field selector styling */
                    .pvtAxisContainer {
                      background: #f8f9fa !important;
                      border: 1px solid #e9ecef !important;
                      border-radius: 8px !important;
                      padding: 12px !important;
                      margin: 8px 0 !important;
                    }
                    .pvtAxisContainer h3 {
                      font-size: 14px !important;
                      font-weight: 600 !important;
                      margin-bottom: 8px !important;
                      color: #495057 !important;
                    }
                    .pvtAttr {
                      background: white !important;
                      border: 1px solid #dee2e6 !important;
                      border-radius: 6px !important;
                      padding: 6px 10px !important;
                      margin: 4px !important;
                      font-size: 12px !important;
                      cursor: move !important;
                      display: inline-block !important;
                    }
                    .pvtAttr:hover {
                      background: #e9ecef !important;
                      border-color: #adb5bd !important;
                    }
                    /* Fix dropdown styling */
                    .pvtDropdown {
                      z-index: 9999 !important;
                      position: relative !important;
                    }
                    .pvtDropdownMenu {
                      z-index: 10000 !important;
                      position: absolute !important;
                      background: white !important;
                      border: 1px solid #ccc !important;
                      box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
                      max-height: 200px !important;
                      overflow-y: auto !important;
                    }
                    .pvtDropdownMenu li {
                      padding: 5px 10px !important;
                      cursor: pointer !important;
                      list-style: none !important;
                    }
                    .pvtDropdownMenu li:hover {
                      background-color: #f0f0f0 !important;
                    }
                  `}</style>
                  <PivotTableUI
                    data={pivotData}
                    onChange={(s: PivotState) => {
                      console.log('Pivot state changed:', s);
                      setPivotState(s);
                    }}
                    rows={pivotState.rows || []}
                    cols={pivotState.cols || []}
                    vals={pivotState.vals || []}
                    aggregatorName={pivotState.aggregatorName || "Sum"}
                    rendererName={pivotState.rendererName || "Table"}
                    menuLimit={1000}
                    colsLimit={1000}
                    rowsLimit={1000}
                    rendererOptions={{
                      table: {
                        clickCallback: function(e: any, value: any, filters: any, pivotData: any) {
                          console.log('Cell clicked:', value, filters);
                        }
                      }
                    }}
                    localeStrings={{
                      renderError: "An error occurred rendering the PivotTable results.",
                      computeError: "An error occurred computing the PivotTable results.",
                      uiRenderError: "An error occurred rendering the PivotTable UI.",
                      selectAll: "Select All",
                      selectNone: "Select None",
                      tooMany: "(too many to show)",
                      filterResults: "Filter values",
                      totals: "Totals",
                      vs: "vs",
                      by: "by"
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <div className="text-lg font-medium mb-2">No Data Available</div>
                    <div className="text-sm">Please ensure your sheet has data with headers in the first row</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Panel - Additional Options */}
        <div className="h-32 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between h-full">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Quick Actions</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-3 w-3 mr-1" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleGenerateChart}>
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Generate Chart
                </Button>
                <Button variant="outline" size="sm" onClick={handleSavePivot}>
                  <Save className="h-3 w-3 mr-1" />
                  Save Configuration
                </Button>
              </div>
            </div>
            
            <div className="text-right">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Current Status</h4>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div>Rows: {pivotState.rows?.length || 0}</div>
                <div>Columns: {pivotState.cols?.length || 0}</div>
                <div>Values: {pivotState.vals?.length || 0}</div>
                <div>Data Rows: {Math.max(0, pivotData.length - 1)}</div>
                <div>Aggregator: {pivotState.aggregatorName || 'Sum'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
