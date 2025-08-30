import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  RefreshCw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import 'react-pivottable/pivottable.css';
import { SheetData, PivotTableState } from '@/types/spreadsheet';
import { MousePointer, ArrowRight, Info, HelpCircle } from 'lucide-react';

interface PivotTableModalProps {
  sheet: SheetData;
  isVisible: boolean;
  onClose: () => void;
  onGenerateChart: (type: 'bar' | 'line' | 'pie' | 'area') => void;
  onExportCSV: () => void;
  onSavePivot: (pivotTable: any) => void;
  onOpenFullScreen?: () => void;
}

export const PivotTableModal: React.FC<PivotTableModalProps> = ({
  sheet, isVisible, onClose, onGenerateChart, onExportCSV, onSavePivot, onOpenFullScreen
}) => {
  const [pivotState, setPivotState] = useState<PivotTableState>({
    rows: [],
    cols: [],
    vals: [],
    aggregatorName: 'Sum',
    rendererName: 'Table'
  });
  
  const [activeTab, setActiveTab] = useState<'pivot' | 'chart'>('pivot');
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartSpec, setChartSpec] = useState<any>(null);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area'>('bar');
  const [showHelp, setShowHelp] = useState(false);
  const [selectedAggregator, setSelectedAggregator] = useState('Sum');
  const [selectedRenderer, setSelectedRenderer] = useState('Table');

  // Convert sheet data to pivot table format
  const pivotData = useMemo(() => {
    if (!sheet || !sheet.cells) return [];
    
    const data: any[] = [];
    const maxRow = Math.max(...Object.keys(sheet.cells).map(key => parseInt(key.slice(1))));
    const maxCol = Math.max(...Object.keys(sheet.cells).map(key => key.charCodeAt(0) - 65));
    
    // Get headers from first row
    const headers: string[] = [];
    for (let col = 0; col <= maxCol; col++) {
      const cellKey = `${String.fromCharCode(65 + col)}1`;
      const header = sheet.cells[cellKey]?.value?.toString() || `Column ${String.fromCharCode(65 + col)}`;
      headers.push(header);
    }
    
    // Convert data rows
    for (let row = 2; row <= maxRow; row++) {
      const rowData: any = {};
      let hasData = false;
      
      for (let col = 0; col <= maxCol; col++) {
        const cellKey = `${String.fromCharCode(65 + col)}${row}`;
        const value = sheet.cells[cellKey]?.value;
        if (value !== undefined && value !== '') {
          hasData = true;
        }
        rowData[headers[col]] = value || '';
      }
      
      if (hasData) {
        data.push(rowData);
      }
    }
    
    return data;
  }, [sheet]);

  // Generate chart data from pivot table
  const generateChartData = useMemo(() => {
    if (!pivotData.length) {
      console.log('No pivot data available for chart generation');
      return;
    }
    
    try {
      // Use actual pivot data instead of mock data
      let chartData: any[] = [];
      let chartSpec: any = {};
      
      // Check if we have pivot configuration
      if (pivotState.rows?.length > 0 || pivotState.cols?.length > 0) {
        // Generate chart based on actual pivot configuration
        if (pivotState.rows?.length > 0 && pivotState.vals?.length > 0) {
          // Group data by row fields and aggregate values
          const groupedData = new Map();
          
          pivotData.forEach(row => {
            const rowKey = pivotState.rows?.map(field => row[field]).join(' - ') || 'All';
            const value = pivotState.vals?.reduce((sum, valField) => {
              const numValue = parseFloat(row[valField]) || 0;
              return sum + numValue;
            }, 0) || 0;
            
            if (groupedData.has(rowKey)) {
              groupedData.set(rowKey, groupedData.get(rowKey) + value);
            } else {
              groupedData.set(rowKey, value);
            }
          });
          
          chartData = Array.from(groupedData.entries()).map(([name, value]) => ({
            name: name || 'Unknown',
            value: value,
            category: pivotState.rows?.[0] || 'Field'
          }));
        } else if (pivotState.cols?.length > 0 && pivotState.vals?.length > 0) {
          // Group data by column fields
          const groupedData = new Map();
          
          pivotData.forEach(row => {
            const colKey = pivotState.cols?.map(field => row[field]).join(' - ') || 'All';
            const value = pivotState.vals?.reduce((sum, valField) => {
              const numValue = parseFloat(row[valField]) || 0;
              return sum + numValue;
            }, 0) || 0;
            
            if (groupedData.has(colKey)) {
              groupedData.set(colKey, groupedData.get(colKey) + value);
            } else {
              groupedData.set(colKey, value);
            }
          });
          
          chartData = Array.from(groupedData.entries()).map(([name, value]) => ({
            name: name || 'Unknown',
            value: value,
            category: pivotState.cols?.[0] || 'Field'
          }));
        } else {
          // Fallback: use first few rows of data
          chartData = pivotData.slice(0, 10).map((row, index) => {
            const firstValueField = Object.keys(row).find(key => 
              typeof row[key] === 'number' || !isNaN(parseFloat(row[key]))
            );
            return {
              name: `Row ${index + 1}`,
              value: firstValueField ? parseFloat(row[firstValueField]) || 0 : index + 1,
              category: 'Data'
            };
          });
        }
      } else {
        // No pivot configuration, use raw data
        chartData = pivotData.slice(0, 10).map((row, index) => {
          const firstValueField = Object.keys(row).find(key => 
            typeof row[key] === 'number' || !isNaN(parseFloat(row[key]))
          );
          return {
            name: `Row ${index + 1}`,
            value: firstValueField ? parseFloat(row[firstValueField]) || 0 : index + 1,
            category: 'Data'
          };
        });
      }
      
      // Create chart specification based on actual data
      chartSpec = {
        title: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart - ${pivotData.length} records`,
        xAxis: { type: 'category', data: chartData.map(d => d.name) },
        yAxis: { type: 'value' },
        series: [{
          type: chartType,
          data: chartData.map(d => d.value),
          itemStyle: {
            color: chartType === 'pie' ? ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'] : '#4ECDC4'
          }
        }]
      };
      
      setChartData(chartData);
      setChartSpec(chartSpec);
      setShowChart(true);
      setActiveTab('chart');
      
      // Call the parent's chart generation function
      onGenerateChart(chartType);
      
      console.log('Chart generated with real data:', chartData);
      
    } catch (error) {
      console.error('Error generating chart:', error);
    }
  }, [pivotData, pivotState, chartType, onGenerateChart]);

  const handleChartTypeChange = (type: 'bar' | 'line' | 'pie' | 'area') => {
    setChartType(type);
    generateChartData();
  };

  const handleAggregatorChange = (aggregator: string) => {
    setSelectedAggregator(aggregator);
    setPivotState(prev => ({ ...prev, aggregatorName: aggregator }));
  };

  const handleRendererChange = (renderer: string) => {
    setSelectedRenderer(renderer);
    setPivotState(prev => ({ ...prev, rendererName: renderer }));
  };

  const handleReset = () => {
    setPivotState({
      rows: [],
      cols: [],
      vals: [],
      aggregatorName: 'Sum',
      rendererName: 'Table'
    });
    setShowChart(false);
    setActiveTab('pivot');
  };

  const handleExportCSV = () => {
    try {
      // Convert pivot data to CSV format
      const csvContent = pivotData.map(row => 
        Object.values(row).map(cell => `"${cell}"`).join(',')
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pivot-table.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      
      onExportCSV();
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const handleSavePivot = () => {
    // Convert pivot state to our internal format
    const pivotTable = {
      id: 'react-pivot-modal',
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

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isVisible]);

  // Add CSS for better dropdown behavior
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .pvtDropdown {
        z-index: 9999 !important;
        position: relative !important;
      }
      .pvtDropdownMenu {
        z-index: 10000 !important;
        position: absolute !important;
        background: white !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
        max-height: 200px !important;
        overflow-y: auto !important;
        min-width: 120px !important;
      }
      .pvtDropdownMenu li {
        padding: 8px 12px !important;
        cursor: pointer !important;
        list-style: none !important;
        transition: background-color 0.2s !important;
        border-bottom: 1px solid #f3f4f6 !important;
      }
      .pvtDropdownMenu li:last-child {
        border-bottom: none !important;
      }
      .pvtDropdownMenu li:hover {
        background-color: #f3f4f6 !important;
      }
      .pvtDropdownMenu li:active {
        background-color: #e5e7eb !important;
      }
      .pvtTable {
        border-collapse: collapse !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
        overflow: hidden !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
      }
      .pvtTable th, .pvtTable td {
        padding: 12px 16px !important;
        border: 1px solid #f3f4f6 !important;
        text-align: left !important;
        font-size: 14px !important;
      }
      .pvtTable th {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
        font-weight: 600 !important;
      }
      .pvtTable tr:nth-child(even) {
        background-color: #f9fafb !important;
      }
      .pvtTable tr:hover {
        background-color: #f3f4f6 !important;
        transition: background-color 0.2s !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Enhanced Header */}
            <motion.div 
              className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <div className="flex items-center gap-4">
                <motion.div 
                  className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <BarChart3 className="h-7 w-7 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Pivot Table Analysis
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Transform your data with powerful pivot capabilities
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowHelp(!showHelp)}
                      className="hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200"
                    >
                      <HelpCircle className="h-5 w-5 text-blue-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Show/Hide Help</p>
                  </TooltipContent>
                </Tooltip>
                
                <motion.button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all duration-200"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </motion.button>
              </div>
            </motion.div>

            {/* Help Section */}
            <AnimatePresence>
              {showHelp && (
                <motion.div
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-blue-200 dark:border-blue-800 p-4"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Info className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">How to Use Pivot Tables</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800 dark:text-blue-200">
                    <div className="flex items-center gap-2">
                      <MousePointer className="h-4 w-4" />
                      <span>Drag fields from the left panel to configure your pivot table</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      <span>Use Rows, Columns, and Values to organize your data</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Switch to Chart view to visualize your data</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel - Enhanced */}
              <motion.div 
                className="w-80 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-700 p-6 overflow-y-auto"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <div className="space-y-6">
                  {/* Available Fields */}
                  <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-gray-800 dark:text-gray-200">
                        <MousePointer className="h-5 w-5 text-blue-600" />
                        Available Fields
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {pivotData.length > 0 && Object.keys(pivotData[0]).map((field) => (
                        <motion.div
                          key={field}
                          className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 cursor-move hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          draggable
                          onDragStart={(_event, _info) => {
                            // Use the native drag event to set data
                            // @ts-ignore
                            _event.dataTransfer?.setData('text/plain', field);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{field}</span>
                            <Badge variant="secondary" className="text-xs">
                              {typeof pivotData[0][field] === 'number' ? 'Number' : 'Text'}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Chart Type Selection */}
                  <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-gray-800 dark:text-gray-200">
                        <BarChart3 className="h-5 w-5 text-green-600" />
                        Chart Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(['bar', 'line', 'pie', 'area'] as const).map((type) => (
                        <motion.button
                          key={type}
                          onClick={() => handleChartTypeChange(type)}
                          className={`w-full p-3 rounded-lg border transition-all duration-200 text-left ${
                            chartType === type
                              ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'
                              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            <span className="capitalize">{type} Chart</span>
                          </div>
                        </motion.button>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Aggregation Options */}
                  <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-gray-800 dark:text-gray-200">
                        <RefreshCw className="h-5 w-5 text-purple-600" />
                        Aggregation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {['Sum', 'Average', 'Count', 'Min', 'Max'].map((agg) => (
                        <motion.button
                          key={agg}
                          onClick={() => handleAggregatorChange(agg)}
                          className={`w-full p-3 rounded-lg border transition-all duration-200 text-left ${
                            selectedAggregator === agg
                              ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200'
                              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {agg}
                        </motion.button>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </motion.div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pivot' | 'chart')} className="flex-1">
                  <div className="border-b border-gray-200 dark:border-gray-700 px-6 pt-4">
                    <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800">
                      <TabsTrigger 
                        value="pivot" 
                        className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all duration-200"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Pivot Table
                      </TabsTrigger>
                      <TabsTrigger 
                        value="chart" 
                        className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all duration-200"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Chart View
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="pivot" className="flex-1 p-6 overflow-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                      <PivotTableUI
                        data={pivotData}
                        onChange={(s: any) => setPivotState(s)}
                        rows={pivotState.rows || []}
                        cols={pivotState.cols || []}
                        vals={pivotState.vals || []}
                        aggregatorName={pivotState.aggregatorName || "Sum"}
                        rendererName={pivotState.rendererName || "Table"}
                        menuLimit={1000}
                        colsLimit={1000}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="chart" className="flex-1 p-6 overflow-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 h-full">
                      {showChart && chartData && chartSpec ? (
                        <div className="h-full flex items-center justify-center">
                          <Chart 
                            data={chartData}
                            type={chartType}
                            xKey="name"
                            yKey="value"
                            height={500}
                            showGrid={true}
                            showLegend={true}
                            showTooltip={true}
                            className="w-full h-full" 
                          />
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                          <BarChart3 className="h-16 w-16 mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">No Chart Data</p>
                          <p className="text-sm text-center">
                            Configure your pivot table and select a chart type to generate visualizations
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Bottom Action Bar */}
                <motion.div 
                  className="border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-sm">
                        Rows: {pivotState.rows?.length || 0}
                      </Badge>
                      <Badge variant="outline" className="text-sm">
                        Columns: {pivotState.cols?.length || 0}
                      </Badge>
                      <Badge variant="outline" className="text-sm">
                        Values: {pivotState.vals?.length || 0}
                      </Badge>
                      <Badge variant="outline" className="text-sm">
                        Aggregator: {selectedAggregator}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <motion.button
                        onClick={handleReset}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200 flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reset
                      </motion.button>
                      
                      <motion.button
                        onClick={handleSavePivot}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </motion.button>
                      
                      <motion.button
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Download className="h-4 w-4" />
                        Export CSV
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
