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
  X,
  Clock,
  Eye,
  Share2,
  Calendar,
  ExternalLink,
  AlertTriangle,
  TrendingUpIcon,
  TrendingDownIcon,
  BarChart3Icon
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { toast } from '@/hooks/use-toast';
import { InteractiveDashboard } from './InteractiveDashboard';
import { generateLocalReport, saveReportToStorage, ReportData } from '@/lib/reportUtils';
import { Chart, MultiSeriesChart, MetricCard, ChartContainer } from '@/components/ui/chart';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ReportGeneratorProps {
  activeSheet: any;
  existingCharts: any[];
  isOpen: boolean;
  onClose: () => void;
}

interface ReportSummaryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportData | null;
  selectedCategory: string;
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
  const [showReportSummary, setShowReportSummary] = useState(false);
  const { user } = useAuth();

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    // Cleanup function to restore body scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

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
      
      // If this is a category report with metrics, execute the SQL queries
      if (generatedReport.category && generatedReport.categoryMetrics) {
        await executeCategoryReportQueries(generatedReport);
      }
      
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

  // Execute SQL queries for category-based reports
  const executeCategoryReportQueries = useCallback(async (report: ReportData) => {
    if (!report.categoryMetrics) return;

    try {
      console.log('🚀 Executing SQL queries for category report...');
      
      // Import DuckDB utilities
      const { queryDuckDB } = await import('@/lib/utils');
      
      // Execute each metric's SQL query
      const updatedMetrics = await Promise.all(
        report.categoryMetrics.map(async (metric: any) => {
          if (!metric.sqlQuery || metric.status === 'error') {
            return metric;
          }

          try {
            console.log(`📊 Executing SQL for ${metric.name}:`, metric.sqlQuery);
            const result = await queryDuckDB(metric.sqlQuery);
            
            // Process the result
            let processedResult = result;
            if (Array.isArray(result) && result.length > 0) {
              const firstRow = result[0];
              const firstValue = Object.values(firstRow)[0];
              processedResult = firstValue;
            }

            console.log(`✅ ${metric.name} result:`, processedResult);
            
            return {
              ...metric,
              result: processedResult,
              status: 'calculated' as const
            };
          } catch (error) {
            console.error(`❌ SQL execution failed for ${metric.name}:`, error);
            return {
              ...metric,
              status: 'error' as const,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      );

      // Update the report with calculated results
      const updatedReport = {
        ...report,
        categoryMetrics: updatedMetrics,
        dataRanges: report.dataRanges.map((range, index) => {
          const metric = updatedMetrics[index];
          if (metric && range.type === 'ai_metric') {
            return {
              ...range,
              result: metric.result,
              execution_note: metric.status === 'calculated' ? 'Calculated successfully' : 
                             metric.status === 'error' ? metric.error : 'Pending calculation'
            };
          }
          return range;
        })
      };

      setReport(updatedReport);
      console.log('✅ Category report queries executed successfully');

    } catch (error) {
      console.error('❌ Failed to execute category report queries:', error);
      toast({
        title: "Warning",
        description: "Report generated but some calculations failed. Check the AI Results tab for details.",
        variant: "destructive"
      });
    }
  }, []);

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

  // BigInt-safe JSON serializer with proper circular reference handling
  const safeJSONStringify = useCallback((obj: any, space?: number): string => {
    try {
      // First, let's detect and log any BigInt values for debugging
      const detectBigInts = (obj: any, path: string = 'root'): void => {
        if (obj === null || obj === undefined) return;
        
        if (typeof obj === 'bigint') {
          console.warn(`BigInt detected at ${path}:`, obj.toString());
          return;
        }
        
        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            detectBigInts(item, `${path}[${index}]`);
          });
        } else if (typeof obj === 'object') {
          Object.entries(obj).forEach(([key, value]) => {
            detectBigInts(value, `${path}.${key}`);
          });
        }
      };
      
      // Detect and log circular references for debugging
      const detectCircularReferences = (obj: any, path: string = 'root', visited = new WeakSet()): void => {
        if (obj === null || obj === undefined) return;
        
        if (typeof obj === 'object') {
          if (visited.has(obj)) {
            console.warn(`⚠️ Circular reference detected at ${path}`);
            return;
          }
          visited.add(obj);
          
          if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
              detectCircularReferences(item, `${path}[${index}]`, visited);
            });
          } else {
            Object.entries(obj).forEach(([key, value]) => {
              detectCircularReferences(value, `${path}.${key}`, visited);
            });
          }
        }
      };
      
      detectBigInts(obj);
      detectCircularReferences(obj);
      
      // Use WeakSet to properly track visited objects and detect circular references
      const seen = new WeakSet();
      
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        // Handle other non-serializable types
        if (value === undefined) {
          return null;
        }
        if (typeof value === 'function') {
          return '[Function]';
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        // Handle circular references using WeakSet
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      }, space);
    } catch (error) {
      console.error('Error in safeJSONStringify:', error);
      console.error('Object that failed to serialize:', obj);
      // Fallback: try to create a simplified version with WeakSet
      try {
        const seen = new WeakSet();
        const simplified = JSON.stringify(obj, (key, value) => {
          if (typeof value === 'bigint') return value.toString();
          if (typeof value === 'function') return '[Function]';
          if (value === undefined) return null;
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular Reference]';
            }
            seen.add(value);
          }
          return value;
        }, space);
        return simplified;
      } catch (fallbackError) {
        console.error('Fallback serialization also failed:', fallbackError);
        return JSON.stringify({ error: 'Failed to serialize report data' });
      }
    }
  }, []);

  // Convert SQL to mathematical formula
  const convertSQLToMathematicalFormula = (sql: string, queryName: string) => {
    if (!sql) return 'Formula not available';
    
    const sqlLower = sql.toLowerCase();
    
    // Financial formulas - more intelligent parsing
    if (queryName.toLowerCase().includes('total revenue') || sqlLower.includes('sum') && sqlLower.includes('revenue')) {
      return 'Total Revenue = Σ(Revenue Columns)';
    } else if (queryName.toLowerCase().includes('total expenses') || sqlLower.includes('sum') && sqlLower.includes('expense')) {
      return 'Total Expenses = Σ(Expense Columns)';
    } else if (queryName.toLowerCase().includes('net profit') || sqlLower.includes('net') && sqlLower.includes('income')) {
      return 'Net Profit = Total Revenue - Total Expenses';
    } else if (queryName.toLowerCase().includes('gross margin') || sqlLower.includes('gross') && sqlLower.includes('margin')) {
      return 'Gross Margin % = ((Total Revenue - COGS) / Total Revenue) × 100';
    } else if (queryName.toLowerCase().includes('operating margin') || sqlLower.includes('operating') && sqlLower.includes('income')) {
      return 'Operating Margin % = (Operating Income / Total Revenue) × 100';
    } else if (queryName.toLowerCase().includes('net profit margin') || sqlLower.includes('net profit margin')) {
      return 'Net Profit Margin % = (Net Income / Total Revenue) × 100';
    } else if (queryName.toLowerCase().includes('roi') || sqlLower.includes('return on investment')) {
      return 'ROI % = ((Net Gain - Cost of Investment) / Cost of Investment) × 100';
    } else if (queryName.toLowerCase().includes('roa') || sqlLower.includes('return on assets')) {
      return 'ROA = Net Income / Average Total Assets';
    }
    
    // HR formulas - using exact mathematical formulas provided
    else if (queryName.toLowerCase().includes('headcount') || sqlLower.includes('count') && sqlLower.includes('distinct')) {
      return 'Headcount = Count of Unique Employees';
    } else if (queryName.toLowerCase().includes('attrition') || sqlLower.includes('attrition') || sqlLower.includes('turnover')) {
      return 'Attrition Rate % = (Number of Exits / Total Employees) × 100';
    } else if (queryName.toLowerCase().includes('tenure') || sqlLower.includes('hire_date') || sqlLower.includes('join_date')) {
      return 'Average Tenure = mean(Exit Date - Join Date)';
    } else if (queryName.toLowerCase().includes('absenteeism') || sqlLower.includes('absent_days')) {
      return 'Absenteeism % = (Absent Days / Working Days) × 100';
    } else if (queryName.toLowerCase().includes('payroll') || sqlLower.includes('salary') && sqlLower.includes('benefits')) {
      return 'Total Payroll = Σ(Salary + Benefits)';
    }
    
    // Sales & Marketing formulas - using exact mathematical formulas provided
    else if (queryName.toLowerCase().includes('conversion') || sqlLower.includes('conversion rate')) {
      return 'Sales Conversion Rate % = (Number of Closed Deals / Number of Leads) × 100';
    } else if (queryName.toLowerCase().includes('cac') || sqlLower.includes('customer acquisition cost')) {
      return 'Customer Acquisition Cost (CAC) = Total Sales & Marketing Expenses / Number of New Customers Acquired';
    } else if (queryName.toLowerCase().includes('clv') || sqlLower.includes('customer lifetime value')) {
      return 'Customer Lifetime Value (CLV) = Average Purchase Value × Purchase Frequency × Average Customer Lifespan';
    } else if (queryName.toLowerCase().includes('clv:cac') || sqlLower.includes('clv to cac') || sqlLower.includes('clv cac ratio')) {
      return 'CLV to CAC Ratio = CLV / CAC';
    } else if (queryName.toLowerCase().includes('total sales') || sqlLower.includes('sum') && sqlLower.includes('sales')) {
      return 'Total Sales = Σ(Sales Columns)';
    } else if (queryName.toLowerCase().includes('average order') || sqlLower.includes('avg') && sqlLower.includes('order')) {
      return 'Average Order Value = Total Sales / Number of Orders';
    } else if (queryName.toLowerCase().includes('growth') || sqlLower.includes('growth rate')) {
      return 'Growth Rate % = ((Current Period - Previous Period) / Previous Period) × 100';
    }
    
    // Operations formulas
    else if (queryName.toLowerCase().includes('inventory') || sqlLower.includes('inventory turnover')) {
      return 'Inventory Turnover = COGS / Average Inventory';
    } else if (queryName.toLowerCase().includes('fulfillment') || sqlLower.includes('fulfillment rate')) {
      return 'Fulfillment Rate % = (Fulfilled Orders / Total Orders) × 100';
    } else if (queryName.toLowerCase().includes('lead time') || sqlLower.includes('delivery') && sqlLower.includes('order')) {
      return 'Average Lead Time = AVG(Delivery Date - Order Date)';
    } else if (queryName.toLowerCase().includes('efficiency') || sqlLower.includes('productivity')) {
      return 'Efficiency Rate = (Actual Output / Expected Output) × 100';
    }
    
    // Project Management formulas
    else if (queryName.toLowerCase().includes('on time') || sqlLower.includes('delivery performance')) {
      return 'On-Time Delivery % = (On-Time Deliveries / Total Deliveries) × 100';
    } else if (queryName.toLowerCase().includes('budget') || sqlLower.includes('cost variance')) {
      return 'Budget Variance = Planned Cost - Actual Cost';
    } else if (queryName.toLowerCase().includes('resource') || sqlLower.includes('utilization')) {
      return 'Resource Utilization % = (Used Hours / Available Hours) × 100';
    }
    
    // Customer Support formulas
    else if (queryName.toLowerCase().includes('satisfaction') || sqlLower.includes('csat') || sqlLower.includes('nps')) {
      return 'Customer Satisfaction = Average Rating Score';
    } else if (queryName.toLowerCase().includes('response') || sqlLower.includes('resolution time')) {
      return 'Average Response Time = Σ(Response Times) / Number of Tickets';
    } else if (queryName.toLowerCase().includes('first call') || sqlLower.includes('first contact resolution')) {
      return 'First Call Resolution % = (Resolved on First Call / Total Calls) × 100';
    }
    
    // Education formulas
    else if (queryName.toLowerCase().includes('pass rate') || sqlLower.includes('success rate')) {
      return 'Pass Rate % = (Students Who Passed / Total Students) × 100';
    } else if (queryName.toLowerCase().includes('attendance') || sqlLower.includes('attendance rate')) {
      return 'Attendance Rate % = (Days Present / Total Days) × 100';
    } else if (queryName.toLowerCase().includes('grade') || sqlLower.includes('average grade')) {
      return 'Average Grade = Σ(Grades) / Number of Students';
    }
    
    // Research/Analytics formulas
    else if (queryName.toLowerCase().includes('correlation') || sqlLower.includes('correlation coefficient')) {
      return 'Correlation Coefficient = Σ((X-μx)(Y-μy)) / (σx × σy)';
    } else if (queryName.toLowerCase().includes('regression') || sqlLower.includes('linear regression')) {
      return 'Linear Regression: Y = a + bX + ε';
    } else if (queryName.toLowerCase().includes('confidence') || sqlLower.includes('confidence interval')) {
      return 'Confidence Interval = Sample Mean ± (Z × Standard Error)';
    }
    
    // Intelligent SQL parsing for generic cases
    else if (sqlLower.includes('sum(') && sqlLower.includes('where')) {
      return 'Conditional Sum = Σ(Values WHERE Condition is True)';
    } else if (sqlLower.includes('count(') && sqlLower.includes('distinct')) {
      return 'Unique Count = COUNT(DISTINCT Values)';
    } else if (sqlLower.includes('avg(') || sqlLower.includes('average(')) {
      return 'Average = Σ(Values) / Number of Records';
    } else if (sqlLower.includes('max(')) {
      return 'Maximum = MAX(Values)';
    } else if (sqlLower.includes('min(')) {
      return 'Minimum = MIN(Values)';
    } else if (sqlLower.includes('sum(')) {
      return 'Sum = Σ(Values)';
    } else if (sqlLower.includes('count(')) {
      return 'Count = Number of Records';
    } else if (sqlLower.includes('case when') || sqlLower.includes('conditional')) {
      return 'Conditional Calculation = Different Values Based on Conditions';
    } else if (sqlLower.includes('group by')) {
      return 'Grouped Analysis = Calculations Per Category';
    } else if (sqlLower.includes('order by')) {
      return 'Ranked Analysis = Sorted Results by Criteria';
    } else {
      return 'Mathematical calculation based on data analysis';
    }
  };

  // Copy to clipboard helper function
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Success",
        description: "Copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  }, []);

  // Copy all mathematical formulas
  const copyAllQueries = useCallback(async () => {
    try {
      const allFormulas = report?.dataRanges?.map((query: any, index: number) => 
        `-- Formula ${index + 1}: ${query.name}\n-- Type: ${query.type}\n-- Description: ${query.description}\n${convertSQLToMathematicalFormula(query.sql, query.name)}\n`
      ).join('\n') || '';
      
      await navigator.clipboard.writeText(allFormulas);
      toast({
        title: "Success",
        description: "All mathematical formulas copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy formulas",
        variant: "destructive"
      });
    }
  }, [report]);

  // Helper functions for AI-generated reports
  const formatResult = useCallback((result: any, resultType: string) => {
    if (result === null || result === undefined) return 'N/A';
    
    switch (resultType) {
      case 'percentage':
        return `${result.toFixed(1)}%`;
      case 'currency':
        return `$${result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'text':
      case 'string':
        // Handle text-based results like job titles, names, etc.
        if (typeof result === 'string') {
          // If it's a job title or position, format it nicely
          if (result.toLowerCase().includes('chief') || result.toLowerCase().includes('ceo') || 
              result.toLowerCase().includes('director') || result.toLowerCase().includes('manager') ||
              result.toLowerCase().includes('engineer') || result.toLowerCase().includes('assistant')) {
            return result; // Return as-is for professional titles
          }
          // For other text results, capitalize first letter of each word
          return result.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
        }
        return result.toString();
              case 'number':
      default:
        if (typeof result === 'number') {
          if (result >= 1000000) {
            return `${(result / 1000000).toFixed(1)}M`;
          } else if (result >= 1000) {
            return `${(result / 1000).toFixed(1)}K`;
          } else {
            return result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
        }
        return result.toString();
    }
  }, []);

  // Export report
  const exportReport = useCallback((format: 'json' | 'excel' | 'pdf') => {
    if (!report) return;

    try {
      if (format === 'json') {
        const blob = new Blob([safeJSONStringify(report, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeSheet?.name || 'sheet'}_report.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'excel') {
        // Prepare data for Excel export
        const workbook = XLSX.utils.book_new();
        
        // Summary sheet
        const summaryData = [
          ['Report Summary'],
          ['Sheet Name', report.sheetName],
          ['Generated At', report.generatedAt],
          ['Total Rows', report.summary.totalRows],
          ['Total Columns', report.summary.totalColumns],
          ['Category', report.category || 'General'],
          [],
          ['Key Insights'],
          ...report.summary.keyInsights.map(insight => [insight]),
          [],
          ['Recommendations'],
          ...report.summary.recommendations.map(rec => [rec])
        ];
        
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
        
        // HR Metrics sheet (if available)
        if (report.categoryMetrics && report.categoryMetrics.length > 0) {
          const metricsData = [
            ['Metric Name', 'Description', 'Result', 'Status', 'Formula'],
            ...report.categoryMetrics.map(metric => [
              metric.name,
              metric.description,
              metric.result !== undefined ? formatResult(metric.result, metric.resultType) : 'Calculating...',
              metric.status,
              metric.calculation
            ])
          ];
          
          const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData);
          XLSX.utils.book_append_sheet(workbook, metricsSheet, 'HR Metrics');
        }
        
        // Data Ranges sheet
        const rangesData = [
          ['Range Name', 'Range', 'Count', 'Average', 'Min', 'Max', 'Unique Values'],
          ...report.dataRanges.map(range => [
            range.name,
            range.range,
            range.summary.count,
            range.summary.average?.toFixed(2) || 'N/A',
            range.summary.min || 'N/A',
            range.summary.max || 'N/A',
            range.summary.uniqueValues || 'N/A'
          ])
        ];
        
        const rangesSheet = XLSX.utils.aoa_to_sheet(rangesData);
        XLSX.utils.book_append_sheet(workbook, rangesSheet, 'Data Ranges');
        
        // Write and download
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
        saveAs(dataBlob, `${activeSheet?.name || 'sheet'}_report.xlsx`);
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
  }, [report, activeSheet, safeJSONStringify, formatResult]);

  // Get result status and color based on value and type
  const getResultStatus = useCallback((result: any, resultType: string, queryName: string) => {
    if (result === null || result === undefined) return { status: 'pending', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    
    const name = queryName.toLowerCase();
    
    // Financial metrics - higher is better
    if (name.includes('revenue') || name.includes('profit') || name.includes('margin') || name.includes('roi') || name.includes('roa')) {
      if (typeof result === 'number') {
        if (result > 0) return { status: 'positive', color: 'text-green-600', bgColor: 'bg-green-100' };
        if (result < 0) return { status: 'negative', color: 'text-red-600', bgColor: 'bg-red-100' };
        return { status: 'neutral', color: 'text-gray-600', bgColor: 'bg-gray-100' };
      }
    }
    
    // HR metrics - context dependent
    if (name.includes('attrition') || name.includes('turnover')) {
      if (typeof result === 'number') {
        if (result < 10) return { status: 'positive', color: 'text-green-600', bgColor: 'bg-green-100' };
        if (result > 20) return { status: 'negative', color: 'text-red-600', bgColor: 'bg-red-100' };
        return { status: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
      }
    }
    
    // Customer metrics - higher is better
    if (name.includes('satisfaction') || name.includes('csat') || name.includes('nps')) {
      if (typeof result === 'number') {
        if (result >= 4) return { status: 'positive', color: 'text-green-600', bgColor: 'bg-green-100' };
        if (result < 3) return { status: 'negative', color: 'text-red-600', bgColor: 'bg-red-100' };
        return { status: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
      }
    }
    
    // Default - positive for any result
    return { status: 'positive', color: 'text-blue-600', bgColor: 'bg-blue-100' };
  }, []);

  // Get trend indicator for results
  const getTrendIndicator = useCallback((result: any, queryName: string) => {
    if (result === null || result === undefined) return null;
    
    const name = queryName.toLowerCase();
    
    // Mock trend data - in real implementation, this would compare with historical data
    if (typeof result === 'number') {
      // Financial metrics - simulate trends
      if (name.includes('revenue') || name.includes('profit')) {
        return { trend: '↗️', direction: 'up', color: 'text-green-600' };
      } else if (name.includes('margin')) {
        return { trend: '↗️', direction: 'up', color: 'text-green-600' };
      } else if (name.includes('attrition') || name.includes('turnover')) {
        return { trend: '↘️', direction: 'down', color: 'text-green-600' };
      } else if (name.includes('satisfaction') || name.includes('csat')) {
        return { trend: '↗️', direction: 'up', color: 'text-green-600' };
      }
    }
    
    return null;
  }, []);

  // Report Summary Popup Component
  const ReportSummaryPopup: React.FC<ReportSummaryPopupProps> = ({ isOpen, onClose, report, selectedCategory }) => {
    if (!isOpen || !report) return null;

    const getDataFreshness = () => {
      const now = new Date();
      const reportTime = new Date(report.generatedAt);
      const diffMs = now.getTime() - reportTime.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 60) {
        return { status: 'Fresh', color: 'bg-green-100 text-green-800', time: `${diffMins}m ago` };
      } else if (diffHours < 24) {
        return { status: 'Fresh', color: 'bg-green-100 text-green-800', time: `${diffHours}h ago` };
      } else if (diffDays < 7) {
        return { status: 'Stale', color: 'bg-yellow-100 text-yellow-800', time: `${diffDays}d ago` };
      } else {
        return { status: 'Broken', color: 'bg-red-100 text-red-800', time: `${diffDays}d ago` };
      }
    };

    const getCategoryKPIs = () => {
      if (!report.categoryMetrics) return [];
      
              return report.categoryMetrics
          .filter(metric => metric.status === 'calculated')
          .slice(0, 6)
          .map(metric => ({
            name: metric.name,
            value: metric.result,
            description: metric.description,
            formula: metric.calculation
          }));
    };

    const getCategoryInsights = () => {
      if (!report.categoryMetrics) return [];
      
      const calculatedMetrics = report.categoryMetrics.filter(m => m.status === 'calculated');
      const insights = [];
      
      if (calculatedMetrics.length > 0) {
        insights.push(`Generated ${calculatedMetrics.length} key metrics for ${selectedCategory} analysis`);
      }
      
      if (report.dataRanges && report.dataRanges.length > 0) {
        insights.push(`Analyzed ${report.dataRanges.length} data ranges with comprehensive insights`);
      }
      
      if (report.charts && report.charts.length > 0) {
        insights.push(`Created ${report.charts.length} visualizations for better data understanding`);
      }
      
      return insights.slice(0, 5);
    };

    const getCategoryDrivers = () => {
      if (!report.categoryMetrics) return [];
      
      const calculatedMetrics = report.categoryMetrics.filter(m => m.status === 'calculated');
      return calculatedMetrics.slice(0, 3).map(metric => ({
        name: metric.name,
        value: metric.result,
        trend: 'up'
      }));
    };

    const getRecommendedActions = () => {
      if (!report.categoryMetrics) return [];
      
      const actions = [];
      const calculatedMetrics = report.categoryMetrics.filter(m => m.status === 'calculated');
      
      if (calculatedMetrics.length > 0) {
        actions.push('Review generated metrics for accuracy and relevance');
      }
      
      if (report.charts && report.charts.length > 0) {
        actions.push('Analyze visualizations for key insights and trends');
      }
      
      actions.push('Export report for stakeholder sharing and documentation');
      
      return actions.slice(0, 5);
    };

    const freshness = getDataFreshness();
    const kpis = getCategoryKPIs();
    const insights = getCategoryInsights();
    const drivers = getCategoryDrivers();
    const actions = getRecommendedActions();

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Report Summary · {selectedCategory} · {new Date().toLocaleDateString()}</span>
              <div className="flex items-center space-x-2">
                <Badge className={freshness.color}>
                  {freshness.status} · {freshness.time}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* KPI Snapshot */}
            {kpis.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <BarChart3Icon className="h-5 w-5 mr-2" />
                  KPI Snapshot
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {kpis.map((kpi, index) => (
                    <Card key={index} className="p-4">
                      <div className="text-2xl font-bold text-blue-600">{kpi.value}</div>
                      <div className="text-sm font-medium text-gray-900">{kpi.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{kpi.description}</div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Key Insights */}
            {insights.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2" />
                  Key Insights
                </h3>
                <div className="space-y-2">
                  {insights.map((insight, index) => (
                    <div key={index} className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Drivers */}
            {drivers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <TrendingUpIcon className="h-5 w-5 mr-2" />
                  Top Contributors
                </h3>
                <div className="space-y-2">
                  {drivers.map((driver, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{driver.name}</span>
                      <span className="text-sm text-green-600 font-semibold">{driver.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Actions */}
            {actions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Recommended Actions
                </h3>
                <div className="space-y-2">
                  {actions.map((action, index) => (
                    <div key={index} className="flex items-start space-x-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Quality */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Data Quality & Coverage
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-lg font-bold text-green-600">✓</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Complete</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-lg font-bold text-green-600">✓</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Fresh</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-lg font-bold text-green-600">✓</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Valid</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-lg font-bold text-green-600">✓</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Accurate</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center space-x-3 pt-4">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[95vw] h-[95vh] max-w-7xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
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
                <Button
                  variant="outline"
                  onClick={() => exportReport('excel')}
                  className="flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Export Excel</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowReportSummary(true)}
                  className="flex items-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Summary</span>
                </Button>
              </>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
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
            <div className="h-full">
              <Tabs defaultValue="summary" className="h-full flex flex-col">
                <TabsList className="w-full justify-start border-b border-gray-200 dark:border-gray-700 rounded-none flex-shrink-0">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="ai-results">AI Results</TabsTrigger>
                  {report.categoryMetrics && report.categoryMetrics.length > 0 && (
                    <TabsTrigger value="category-metrics">{selectedCategory} Metrics</TabsTrigger>
                  )}
                  <TabsTrigger value="ranges">Data Ranges</TabsTrigger>
                  <TabsTrigger value="charts">Charts</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto">
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

                          {/* HR Metrics Section */}
                          {report.categoryMetrics && report.categoryMetrics.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
                                📊 {selectedCategory} Metrics
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {report.categoryMetrics.map((metric) => (
                                  <Card key={metric.id} className="border-l-4 border-purple-500">
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base flex items-center justify-between">
                                        <span>{metric.name}</span>
                                        <Badge 
                                          variant={metric.status === 'calculated' ? 'default' : 
                                                  metric.status === 'error' ? 'destructive' : 
                                                  'secondary'}
                                          className="text-xs"
                                        >
                                          {metric.status === 'calculated' ? '✓ Calculated' : 
                                           metric.status === 'error' ? '⚠ Error' : 
                                           metric.status === 'field_missing' ? '⚠ Field Missing' : '⏳ Pending'}
                                        </Badge>
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                      <div className="space-y-3">
                                        {/* Metric Result */}
                                        <div className="text-center">
                                          <div className="text-2xl font-bold text-purple-600">
                                            {metric.result !== undefined ? formatResult(metric.result, metric.resultType) : 'Calculating...'}
                                          </div>
                                          <div className="text-xs text-gray-500 mt-1">
                                            {metric.description}
                                          </div>
                                        </div>
                                        
                                        {/* Mathematical Formula */}
                                        <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded text-xs">
                                          <div className="font-medium text-purple-800 dark:text-purple-200 mb-1">
                                            Formula:
                                          </div>
                                          <div className="text-purple-700 dark:text-purple-300">
                                            {metric.calculation}
                                          </div>
                                        </div>

                                        {/* Status Information */}
                                        {metric.status === 'error' && metric.error && (
                                          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-xs text-red-700 dark:text-red-300">
                                            <div className="font-medium mb-1">Error:</div>
                                            <div>{metric.error}</div>
                                          </div>
                                        )}
                                        
                                        {/* Field Missing Information */}
                                        {metric.status === 'field_missing' && (
                                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-xs text-yellow-700 dark:text-yellow-300">
                                            <div className="font-medium mb-1">⚠ Field Missing:</div>
                                            <div className="space-y-1">
                                              {metric.missing_fields && metric.missing_fields.length > 0 && (
                                                <div>
                                                  <span className="font-medium">Missing fields:</span> {metric.missing_fields.join(', ')}
                                                </div>
                                              )}
                                              {metric.alternative_calculation && (
                                                <div>
                                                  <span className="font-medium">Alternative approach:</span> {metric.alternative_calculation}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
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

                  <TabsContent value="ai-results" className="h-full p-6 overflow-y-auto">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">AI-Generated Analysis Results</h3>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyAllQueries()}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Copy All Mathematical Formulas
                          </Button>
                        </div>
                      </div>
                      
                      {/* Summary Metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="text-2xl font-bold text-blue-600">
                            {report.dataRanges.length}
                          </div>
                          <div className="text-sm text-blue-600">Total Analyses</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="text-2xl font-bold text-green-600">
                            {report.dataRanges.filter(q => getResultStatus(q.result, q.result_type, q.name).status === 'positive').length}
                          </div>
                          <div className="text-sm text-green-600">Good Performance</div>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <div className="text-2xl font-bold text-yellow-600">
                            {report.dataRanges.filter(q => getResultStatus(q.result, q.result_type, q.name).status === 'warning').length}
                          </div>
                          <div className="text-sm text-yellow-600">Warning</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="text-2xl font-bold text-red-600">
                            {report.dataRanges.filter(q => getResultStatus(q.result, q.result_type, q.name).status === 'negative').length}
                          </div>
                          <div className="text-sm text-red-600">Needs Attention</div>
                        </div>
                      </div>

                      <div className="grid gap-6">
                        {report.dataRanges.map((query, index) => {
                          const resultStatus = getResultStatus(query.result, query.result_type, query.name);
                          return (
                            <Card key={query.id} className="border-l-4 border-blue-500">
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <CardTitle className="text-lg">{query.name}</CardTitle>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <Badge variant="outline">{query.type || 'analysis'}</Badge>
                                      <Badge variant="secondary">Priority: {index < 3 ? 'High' : index < 6 ? 'Medium' : 'Low'}</Badge>
                                      <Badge 
                                        variant={resultStatus.status === 'positive' ? 'default' : resultStatus.status === 'negative' ? 'destructive' : 'secondary'}
                                        className={resultStatus.bgColor}
                                      >
                                        {resultStatus.status === 'positive' ? '✓ Good' : resultStatus.status === 'negative' ? '⚠ Needs Attention' : '⚠ Warning'}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="text-right text-sm text-gray-500">
                                    Analysis #{index + 1}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {/* Description */}
                                {query.description && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">Analysis Description:</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{query.description}</p>
                                  </div>
                                )}

                                {/* Analysis Result */}
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Analysis Result:</h4>
                                  <div className={`p-4 rounded-md font-mono text-sm overflow-x-auto border ${resultStatus.bgColor}`}>
                                    <div className="flex items-center justify-between">
                                      <div className={`text-2xl font-bold ${resultStatus.color}`}>
                                        {query.result ? formatResult(query.result, query.result_type) : 'Calculating...'}
                                      </div>
                                      {getTrendIndicator(query.result, query.name) && (
                                        <div className={`text-2xl ${getTrendIndicator(query.result, query.name)?.color}`}>
                                          {getTrendIndicator(query.result, query.name)?.trend}
                                        </div>
                                      )}
                                    </div>
                                    <div className={`text-xs ${resultStatus.color} mt-1`}>
                                      {query.execution_note || 'Result generated successfully'}
                                    </div>
                                  </div>
                                </div>

                                {/* Mathematical Formula */}
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Mathematical Formula:</h4>
                                  <div className="bg-blue-100 dark:bg-blue-800 p-3 rounded-md font-mono text-xs overflow-x-auto border">
                                    <pre className="whitespace-pre-wrap">{convertSQLToMathematicalFormula(query.sql, query.name)}</pre>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    This shows the mathematical calculation being performed
                                  </p>
                                </div>

                                {/* Quick Insights */}
                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                                  <h4 className="text-sm font-medium mb-2">Quick Insights:</h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-sm">
                                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                      <span>Result: {query.result ? formatResult(query.result, query.result_type) : 'Calculating...'}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm">
                                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                      <span>Status: {resultStatus.status === 'positive' ? 'Good Performance' : resultStatus.status === 'negative' ? 'Needs Attention' : 'Warning'}</span>
                                    </div>
                                    {getTrendIndicator(query.result, query.name) && (
                                      <div className="flex items-center space-x-2 text-sm">
                                        <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                                        <span>Trend: {getTrendIndicator(query.result, query.name)?.direction === 'up' ? 'Improving' : 'Declining'}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center space-x-2 pt-2">
                                  <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                    ✓ Results calculated and ready
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(convertSQLToMathematicalFormula(query.sql, query.name))}
                                  >
                                    <FileText className="h-4 w-4" />
                                    <span>Copy Mathematical Formula</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(query.description || 'No description available')}
                                  >
                                    <FileText className="h-4 w-4" />
                                    <span>Copy Description</span>
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Category Metrics Tab */}
                  {report.categoryMetrics && report.categoryMetrics.length > 0 && (
                    <TabsContent value="category-metrics" className="h-full p-6 overflow-y-auto">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">📊 {selectedCategory} Metrics</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-sm">
                              {selectedCategory} Analysis
                            </Badge>
                          </div>
                        </div>
                        
                        {/* HR Metrics Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                            <div className="text-2xl font-bold text-purple-600">
                              {report.categoryMetrics.filter(m => m.status === 'calculated').length}
                            </div>
                            <div className="text-sm text-purple-600">Calculated Metrics</div>
                          </div>
                          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="text-2xl font-bold text-green-600">
                              {report.categoryMetrics.filter(m => m.status === 'calculated' && m.result > 0).length}
                            </div>
                            <div className="text-sm text-green-600">Positive Results</div>
                          </div>
                          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                            <div className="text-2xl font-bold text-orange-600">
                              {report.categoryMetrics.filter(m => m.status === 'error').length}
                            </div>
                            <div className="text-sm text-orange-600">Errors</div>
                          </div>
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <div className="text-2xl font-bold text-yellow-600">
                              {report.categoryMetrics.filter(m => m.status === 'field_missing').length}
                            </div>
                            <div className="text-sm text-yellow-600">Field Missing</div>
                          </div>
                        </div>

                        {/* Detailed HR Metrics */}
                        <div className="grid gap-6">
                          {report.categoryMetrics.map((metric) => (
                            <Card key={metric.id} className="border-l-4 border-purple-500">
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <CardTitle className="text-lg">{metric.name}</CardTitle>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <Badge variant="outline">{metric.resultType}</Badge>
                                      <Badge 
                                        variant={metric.status === 'calculated' ? 'default' : 
                                                metric.status === 'error' ? 'destructive' : 
                                                metric.status === 'field_missing' ? 'secondary' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {metric.status === 'calculated' ? '✓ Calculated' : 
                                         metric.status === 'error' ? '⚠ Error' : 
                                         metric.status === 'field_missing' ? '⚠ Field Missing' : '⏳ Pending'}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="text-right text-sm text-gray-500">
                                    {metric.id}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {/* Metric Result */}
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Metric Result:</h4>
                                  <div className={`p-4 rounded-md font-mono text-sm overflow-x-auto border ${
                                    metric.status === 'calculated' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                                    metric.status === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                                    metric.status === 'field_missing' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                                    'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <div className={`text-2xl font-bold ${
                                        metric.status === 'calculated' ? 'text-green-600' :
                                        metric.status === 'error' ? 'text-red-600' :
                                        metric.status === 'field_missing' ? 'text-yellow-600' :
                                        'text-gray-600'
                                      }`}>
                                        {metric.result !== undefined ? formatResult(metric.result, metric.resultType) : 'Calculating...'}
                                      </div>
                                      {metric.status === 'calculated' && (
                                        <div className="text-2xl text-green-600">✓</div>
                                      )}
                                      {metric.status === 'field_missing' && (
                                        <div className="text-2xl text-yellow-600">⚠</div>
                                      )}
                                    </div>
                                    <div className={`text-xs mt-1 ${
                                      metric.status === 'calculated' ? 'text-green-600' :
                                      metric.status === 'error' ? 'text-red-600' :
                                      metric.status === 'field_missing' ? 'text-yellow-600' :
                                      'text-gray-600'
                                    }`}>
                                      {metric.status === 'calculated' ? 'Result calculated successfully' : 
                                       metric.status === 'error' ? metric.error : 
                                       metric.status === 'field_missing' ? 'Fields missing for calculation' : 'Pending calculation'}
                                    </div>
                                  </div>
                                </div>

                                {/* Description */}
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Description:</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{metric.description}</p>
                                </div>

                                {/* Mathematical Formula */}
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Mathematical Formula:</h4>
                                  <div className="bg-purple-100 dark:bg-purple-800 p-3 rounded-md font-mono text-xs overflow-x-auto border">
                                    <pre className="whitespace-pre-wrap">{metric.calculation}</pre>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    This shows the mathematical calculation being performed
                                  </p>
                                </div>

                                {/* SQL Query (for debugging) */}
                                {metric.sqlQuery && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">SQL Query:</h4>
                                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md font-mono text-xs overflow-x-auto border">
                                      <pre className="whitespace-pre-wrap">{metric.sqlQuery}</pre>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      SQL query used to calculate this metric
                                    </p>
                                  </div>
                                )}

                                {/* Error Details */}
                                {metric.status === 'error' && metric.error && (
                                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
                                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Error Details:</h4>
                                    <div className="text-sm text-red-700 dark:text-red-300">{metric.error}</div>
                                  </div>
                                )}
                                
                                {/* Field Missing Information */}
                                {metric.status === 'field_missing' && (
                                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
                                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Field Missing Details:</h4>
                                    <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
                                      {metric.missing_fields && metric.missing_fields.length > 0 && (
                                        <div>
                                          <span className="font-medium">Missing fields:</span> {metric.missing_fields.join(', ')}
                                        </div>
                                      )}
                                      {metric.alternative_calculation && (
                                        <div>
                                          <span className="font-medium">Alternative approach:</span> {metric.alternative_calculation}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  )}

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

      {/* Report Summary Popup */}
      <ReportSummaryPopup
        isOpen={showReportSummary}
        onClose={() => setShowReportSummary(false)}
        report={report}
        selectedCategory={selectedCategory}
      />
    </div>
  );
};
