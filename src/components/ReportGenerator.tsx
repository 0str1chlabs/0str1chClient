import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Activity, 
  Download,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  Lightbulb,
  Database,
  Save,
  DollarSign,
  Target,
  Users,
  TrendingDown,
  BarChart,
  PieChart as PieChartIcon,
  X
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { toast } from '@/hooks/use-toast';
import { InteractiveDashboard } from './InteractiveDashboard';
import { generateLocalReport, saveReportToStorage, ReportData } from '@/lib/reportUtils';
import { Chart, MultiSeriesChart, MetricCard, ChartContainer } from '@/components/ui/chart';

interface ReportGeneratorProps {
  activeSheet: any;
  existingCharts: any[];
  isOpen: boolean;
  onClose: () => void;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  activeSheet,
  existingCharts,
  isOpen,
  onClose
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashboardFilters, setDashboardFilters] = useState<any[]>([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const { user } = useAuth();

  // Report categories with descriptions and icons
  const reportCategories = [
    {
      id: 'finance',
      name: 'Finance / Accounting',
      description: 'Financial performance, profit/loss analysis, budgeting, and accounting metrics',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      id: 'sales',
      name: 'Sales & Marketing',
      description: 'Sales analytics, revenue optimization, marketing ROI, and campaign performance',
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    {
      id: 'hr',
      name: 'Human Resources (HR)',
      description: 'Employee performance, recruitment metrics, retention rates, and workforce analytics',
      icon: Users,
      color: 'text-purple-600'
    },
    {
      id: 'operations',
      name: 'Operations / Supply Chain',
      description: 'Operational efficiency, supply chain metrics, cost management, and productivity analysis',
      icon: Activity,
      color: 'text-orange-600'
    },
    {
      id: 'project',
      name: 'Project Management',
      description: 'Project timelines, resource allocation, milestone tracking, and delivery performance',
      icon: Target,
      color: 'text-indigo-600'
    },
    {
      id: 'customer',
      name: 'Customer Support / CRM',
      description: 'Customer satisfaction, support metrics, CRM performance, and customer retention',
      icon: BarChart,
      color: 'text-red-600'
    },
    {
      id: 'education',
      name: 'Education',
      description: 'Learning outcomes, student performance, course effectiveness, and educational metrics',
      icon: FileText,
      color: 'text-teal-600'
    },
    {
      id: 'research',
      name: 'Research / Analytics',
      description: 'Data analysis, research findings, statistical insights, and analytical reporting',
      icon: BarChart3,
      color: 'text-cyan-600'
    }
  ];

  // Show category selection dialog
  const showCategorySelection = useCallback(() => {
    if (!activeSheet) {
      toast({
        title: "Error",
        description: "No active sheet to generate report from",
        variant: "destructive"
      });
      return;
    }
    setShowCategoryDialog(true);
  }, [activeSheet]);

  // Handle category selection and generate report
  const handleCategorySelection = useCallback(async (category: string) => {
    setSelectedCategory(category);
    setShowCategoryDialog(false);
    setShowCustomInput(false);
    setCustomCategory('');
    
    setIsGenerating(true);
    setError(null);

    try {
      // Generate report using local utility with category context
      const generatedReport = await generateLocalReport(activeSheet, existingCharts, category);
      setReport(generatedReport);
      
      toast({
        title: "Success",
        description: `Report generated successfully for ${category}!`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate report');
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [activeSheet, existingCharts]);

  // Handle custom category input
  const handleCustomCategory = useCallback(() => {
    if (customCategory.trim()) {
      handleCategorySelection(customCategory.trim());
    }
  }, [customCategory, handleCategorySelection]);

  // Save report locally
  const saveReport = useCallback(() => {
    if (!report) return;
    
    try {
      saveReportToStorage(report);
      toast({
        title: "Success",
        description: "Report saved locally!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save report",
        variant: "destructive"
      });
    }
  }, [report]);

  // Export report
  const exportReport = useCallback((format: 'json' | 'excel' | 'pdf') => {
    if (!report) return;

    try {
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(report, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeSheet?.name || 'sheet'}_report.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Success",
        description: `Report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive"
      });
    }
  }, [report, activeSheet]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[95vw] h-[95vh] max-w-7xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Report Generator (Frontend)
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {activeSheet?.name ? `Generating report for: ${activeSheet.name}` : 'No sheet selected'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {report && (
              <>
                <Button
                  variant="outline"
                  onClick={saveReport}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Report</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportReport('json')}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export JSON</span>
                </Button>
              </>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {!report ? (
            /* Generate Report View */
            <div className="flex items-center justify-center h-full">
              <Card className="w-96">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>Generate Report Locally</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Generate a comprehensive report using local data:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Local DuckDB data analysis</li>
                      <li>AI-powered insights (frontend)</li>
                      <li>Chart analysis and visualization</li>
                      <li>Interactive dashboard</li>
                      <li>No data transfer to backend</li>
                    </ul>
                  </div>
                  
                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <div className="flex items-center space-x-2 text-red-800 dark:text-red-200">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{error}</span>
                      </div>
                    </div>
                  )}
                  
                  <Button
                    onClick={showCategorySelection}
                    disabled={isGenerating || !activeSheet}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Generating Report...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Generate Local Report
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Report Display View */
            <div className="h-full overflow-hidden">
              <Tabs defaultValue="summary" className="h-full flex flex-col">
                <TabsList className="w-full justify-start border-b border-gray-200 dark:border-gray-700 rounded-none">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="ranges">Data Ranges</TabsTrigger>
                  <TabsTrigger value="charts">Charts</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="summary" className="h-full p-6 overflow-y-auto">
                    <div className="space-y-6">
                      {/* Report Overview */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Info className="h-5 w-5 text-blue-600" />
                            <span>Report Overview</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{report.summary.totalRows}</div>
                              <div className="text-sm text-gray-500">Total Rows</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">{report.summary.totalColumns}</div>
                              <div className="text-sm text-gray-500">Total Columns</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">{report.charts.length}</div>
                              <div className="text-sm text-gray-500">Charts</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-orange-600">{report.dataRanges.length}</div>
                              <div className="text-sm text-gray-500">Data Ranges</div>
                            </div>
                          </div>
                          
                          {/* Category Information */}
                          {selectedCategory && (
                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center space-x-2">
                                <Target className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                  Analysis Focus: {selectedCategory}
                                </span>
                              </div>
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                This report was generated with a focus on {selectedCategory.toLowerCase()} insights and metrics.
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Key Insights */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Lightbulb className="h-5 w-5 text-yellow-600" />
                            <span>Key Insights</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {report.summary.keyInsights.map((insight, index) => (
                              <div key={index} className="flex items-start space-x-3">
                                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm">{insight}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Recommendations */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            <span>Recommendations</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {report.summary.recommendations.map((rec, index) => (
                              <div key={index} className="flex items-start space-x-3">
                                <div className="h-2 w-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                                <span className="text-sm">{rec}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="ranges" className="h-full p-6 overflow-y-auto">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Data Ranges & Summaries</h3>
                      <div className="grid gap-4">
                        {report.dataRanges.map((range) => (
                          <Card key={range.id}>
                            <CardHeader>
                              <CardTitle className="text-base">{range.name}</CardTitle>
                              <p className="text-sm text-gray-500">Range: {range.range}</p>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                  <div className="text-lg font-semibold">{range.summary.count}</div>
                                  <div className="text-xs text-gray-500">Count</div>
                                </div>
                                {range.summary.average && (
                                  <div className="text-center">
                                    <div className="text-lg font-semibold">{range.summary.average.toFixed(2)}</div>
                                    <div className="text-xs text-gray-500">Average</div>
                                  </div>
                                )}
                                {range.summary.min !== undefined && (
                                  <div className="text-center">
                                    <div className="text-lg font-semibold">{range.summary.min}</div>
                                    <div className="text-xs text-gray-500">Min</div>
                                  </div>
                                )}
                                {range.summary.max !== undefined && (
                                  <div className="text-center">
                                    <div className="text-lg font-semibold">{range.summary.max}</div>
                                    <div className="text-xs text-gray-500">Max</div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Mini Chart for Data Distribution */}
                              {range.data && range.data.length > 0 && (
                                <div className="mt-4">
                                  <h4 className="text-sm font-medium mb-2">Data Distribution</h4>
                                  <div className="h-32">
                                    <Chart
                                      data={range.data.slice(0, 10)} // Show first 10 data points
                                      type="bar"
                                      xKey="category"
                                      yKey="value"
                                      height={120}
                                      showGrid={false}
                                      showLegend={false}
                                      showTooltip={true}
                                    />
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="charts" className="h-full p-6 overflow-y-auto">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Charts & Visualizations</h3>
                      <div className="grid gap-6">
                        {report.charts.map((chart) => (
                          <Card key={chart.id}>
                            <CardHeader>
                              <CardTitle className="text-base">{chart.name}</CardTitle>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{chart.type}</Badge>
                                <span className="text-sm text-gray-500">Range: {chart.range}</span>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="h-64">
                                  <Chart
                                    data={chart.data}
                                    type={(chart.type === "heatmap" || chart.type === "scatter") ? "bar" : (chart.type as 'bar' | 'line' | 'pie' | 'area')}
                                    xKey="category"
                                    yKey="value"
                                    title={chart.name}
                                    height={250}
                                    showGrid={true}
                                    showLegend={true}
                                    showTooltip={true}
                                  />
                                </div>
                                
                                <div>
                                  <h4 className="font-medium mb-2">Insights:</h4>
                                  <div className="space-y-2">
                                    {chart.insights.map((insight, index) => (
                                      <div key={index} className="flex items-start space-x-2">
                                        <div className="h-2 w-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                                        <span className="text-sm">{insight}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="analysis" className="h-full p-6 overflow-y-auto">
                    <div className="space-y-6">
                      {/* Trends */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            <span>Trend Analysis</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {report.analysis.trends.map((trend, index) => (
                              <div key={index} className="border-l-4 border-green-500 pl-4">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{trend.field}</span>
                                  <Badge variant={trend.trend === 'increasing' ? 'default' : 'secondary'}>
                                    {trend.trend}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{trend.description}</p>
                                <p className="text-xs text-gray-500 mt-1">Confidence: {(trend.confidence * 100).toFixed(1)}%</p>
                              </div>
                            ))}
                            
                            {/* Trend Visualization Chart */}
                            {report.analysis.trends.length > 0 && (
                              <div className="mt-4">
                                <h4 className="text-sm font-medium mb-2">Trend Overview</h4>
                                <div className="h-48">
                                  <Chart
                                    data={report.analysis.trends.map((trend, index) => ({
                                      field: trend.field,
                                      confidence: trend.confidence * 100,
                                      trend: trend.trend === 'increasing' ? 1 : -1
                                    }))}
                                    type="bar"
                                    xKey="field"
                                    yKey="confidence"
                                    height={180}
                                    showGrid={true}
                                    showLegend={false}
                                    showTooltip={true}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Patterns */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Activity className="h-5 w-5 text-purple-600" />
                            <span>Pattern Analysis</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {report.analysis.patterns.map((pattern, index) => (
                              <div key={index} className="border-l-4 border-purple-500 pl-4">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{pattern.field}</span>
                                  <Badge variant="outline">{pattern.frequency}</Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{pattern.description}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Correlations */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            <span>Correlation Analysis</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {report.analysis.correlations.map((corr, index) => (
                              <div key={index} className="border-l-4 border-blue-500 pl-4">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{corr.field1} ↔ {corr.field2}</span>
                                  <Badge variant={corr.strength === 'strong' ? 'default' : 'secondary'}>
                                    {corr.strength}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{corr.description}</p>
                                <p className="text-xs text-gray-500 mt-1">Correlation: {corr.correlation.toFixed(3)}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Outliers */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <span>Outlier Analysis</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {report.analysis.outliers.map((outlier, index) => (
                              <div key={index} className="border-l-4 border-red-500 pl-4">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{outlier.field}</span>
                                  <Badge variant="destructive">Threshold: {outlier.threshold}</Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{outlier.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Outliers: {outlier.outliers.length} values
                                </p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="dashboard" className="h-full p-6 overflow-y-auto">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Interactive Dashboard</h3>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open('/chart-showcase', '_blank')}
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Chart Types
                          </Button>
                          <Button variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                          </Button>
                        </div>
                      </div>
                      
                      {/* Key Metrics Overview */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <MetricCard
                          title="Total Data Points"
                          value={report.dataRanges.reduce((sum, range) => sum + (range.summary?.count || 0), 0)}
                          icon={<Database className="h-5 w-5 text-blue-600" />}
                        />
                        <MetricCard
                          title="Charts Generated"
                          value={report.charts.length}
                          icon={<BarChart3 className="h-5 w-5 text-green-600" />}
                        />
                        <MetricCard
                          title="Trends Identified"
                          value={report.analysis.trends.length}
                          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
                        />
                        <MetricCard
                          title="Data Quality"
                          value={`${Math.round((report.dataRanges.reduce((sum, range) => sum + (range.summary?.uniqueValues || 0), 0) / Math.max(report.dataRanges.length, 1)) * 100)}%`}
                          icon={<CheckCircle className="h-5 w-5 text-orange-600" />}
                        />
                      </div>
                      
                      <InteractiveDashboard
                        charts={report.charts}
                        dataRanges={report.dataRanges}
                        filters={dashboardFilters}
                        onFilterChange={setDashboardFilters}
                        className="h-[600px]"
                      />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Category Selection Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold text-center flex-1">
                📊 Report Category Selection
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCategoryDialog(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription className="text-center text-lg">
              Which of the following categories do you think is most suitable for your sheet's report metric generation? 
              Which do you think would give you the overall best insight in terms of data and others?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* High-Value Report Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportCategories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <Card 
                    key={category.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 hover:border-blue-300"
                    onClick={() => handleCategorySelection(category.name)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <IconComponent className={`h-6 w-6 ${category.color}`} />
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {category.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Custom Category Option */}
            <div className="border-t pt-6">
              <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 hover:border-blue-300"
                    onClick={() => setShowCustomInput(true)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <PieChartIcon className="h-6 w-6 text-gray-600" />
                    <CardTitle className="text-lg">Other Category</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click to enter a custom category that best fits your data
                  </p>
                </CardContent>
              </Card>

              {/* Custom Category Input */}
              {showCustomInput && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Label htmlFor="customCategory" className="text-sm font-medium mb-2 block">
                    Enter your custom category:
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      id="customCategory"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g., Supply Chain Analytics, Product Performance, etc."
                      className="flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && handleCustomCategory()}
                    />
                    <Button 
                      onClick={handleCustomCategory}
                      disabled={!customCategory.trim()}
                      size="sm"
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Category Display */}
            {selectedCategory && (
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  <strong>Selected Category:</strong> {selectedCategory}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCategoryDialog(false)}
                className="px-6"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
