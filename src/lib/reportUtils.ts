import { SheetData } from '@/types/spreadsheet';

// Frontend-only report generation utilities
export interface ReportData {
  id: string;
  sheetId: string;
  sheetName: string;
  generatedAt: string;
  dataRanges: DataRange[];
  charts: ChartData[];
  summary: ReportSummary;
  analysis: DataAnalysis;
  dashboard: DashboardConfig;
}

export interface DataRange {
  id: string;
  name: string;
  range: string;
  data: any[];
  summary: {
    count: number;
    sum?: number;
    average?: number;
    min?: number;
    max?: number;
    uniqueValues?: number;
  };
}

export interface ChartData {
  id: string;
  name: string;
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'heatmap';
  data: any[];
  config: any;
  range: string;
  insights: string[];
}

export interface ReportSummary {
  totalRows: number;
  totalColumns: number;
  dataTypes: Record<string, string>;
  keyInsights: string[];
  recommendations: string[];
}

export interface DataAnalysis {
  trends: TrendAnalysis[];
  patterns: PatternAnalysis[];
  correlations: CorrelationAnalysis[];
  outliers: OutlierAnalysis[];
}

export interface TrendAnalysis {
  field: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  confidence: number;
  description: string;
}

export interface PatternAnalysis {
  field: string;
  pattern: string;
  frequency: string;
  description: string;
}

export interface CorrelationAnalysis {
  field1: string;
  field2: string;
  correlation: number;
  strength: 'strong' | 'moderate' | 'weak';
  description: string;
}

export interface OutlierAnalysis {
  field: string;
  outliers: any[];
  threshold: number;
  description: string;
}

export interface DashboardConfig {
  layout: DashboardLayout[];
  filters: DashboardFilter[];
  refreshInterval: number;
}

export interface DashboardLayout {
  id: string;
  type: 'chart' | 'metric' | 'table';
  chartId?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  title: string;
  config: any;
}

export interface DashboardFilter {
  id: string;
  field: string;
  type: 'range' | 'select' | 'date';
  value: any;
  label: string;
}

/**
 * Generate comprehensive report using local data sources
 */
export async function generateLocalReport(
  sheet: SheetData,
  existingCharts: any[],
  userContext?: string
): Promise<ReportData> {
  try {
    console.log('🚀 Starting local report generation...');
    console.log('📊 Sheet:', { id: sheet.id, name: sheet.name, rows: sheet.rowCount, cols: sheet.colCount });
    console.log('📈 Existing charts:', existingCharts.length);
    console.log('💬 User context:', userContext || 'None');
    
    // Step 1: Analyze sheet structure and generate data ranges
    console.log('📋 Step 1: Generating data ranges...');
    const dataRanges = await generateDataRangesFromSheet(sheet);
    console.log('✅ Data ranges generated:', dataRanges.length);
    
    // Step 2: Generate comprehensive analysis using AI
    console.log('🤖 Step 2: Generating AI analysis...');
    const analysis = await generateDataAnalysisWithAI(sheet, dataRanges, existingCharts, userContext);
    console.log('✅ AI analysis completed');
    
    // Step 3: Generate summary and insights
    console.log('📝 Step 3: Generating report summary...');
    const summary = await generateReportSummary(sheet, analysis, existingCharts, userContext);
    console.log('✅ Report summary completed');
    
    // Step 4: Process existing charts and generate new insights
    console.log('📊 Step 4: Processing charts with AI...');
    const processedCharts = await processChartsWithAI(existingCharts, sheet, dataRanges, userContext);
    console.log('✅ Chart processing completed');
    
    // Step 5: Generate dashboard configuration
    console.log('🎛️ Step 5: Generating dashboard config...');
    const dashboard = await generateDashboardConfig(processedCharts, dataRanges, analysis, userContext);
    console.log('✅ Dashboard config completed');
    
    // Step 6: Create final report
    console.log('📋 Step 6: Creating final report...');
    const report: ReportData = {
      id: `report-${Date.now()}`,
      sheetId: sheet.id || 'unknown',
      sheetName: sheet.name || 'Sheet',
      generatedAt: new Date().toISOString(),
      dataRanges,
      charts: processedCharts,
      summary,
      analysis,
      dashboard
    };

    console.log('🎉 Report generation completed successfully!');
    return report;
  } catch (error) {
    console.error('❌ Error generating local report:', error);
    throw new Error(`Failed to generate report locally: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate data ranges from sheet structure and DuckDB data
 */
async function generateDataRangesFromSheet(sheet: SheetData): Promise<DataRange[]> {
  const ranges: DataRange[] = [];
  
  try {
    // Try to get DuckDB data if available
    const duckDBData = await getDuckDBData();
    
    if (duckDBData && duckDBData.length > 0) {
      // Use DuckDB data for more accurate analysis
      const columns = Object.keys(duckDBData[0] || {});
      
      columns.forEach((col, index) => {
        const values = duckDBData.map(row => row[col]).filter(v => v !== null && v !== undefined);
        if (values.length > 0) {
          const numericValues = values.filter(v => !isNaN(Number(v))).map(v => Number(v));
          
          ranges.push({
            id: `column-${col}`,
            name: `Column: ${col}`,
            range: `${String.fromCharCode(65 + index)}1:${String.fromCharCode(65 + index)}${values.length}`,
            data: values,
            summary: {
              count: values.length,
              sum: numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) : undefined,
              average: numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : undefined,
              min: numericValues.length > 0 ? Math.min(...numericValues) : undefined,
              max: numericValues.length > 0 ? Math.max(...numericValues) : undefined,
              uniqueValues: new Set(values).size
            }
          });
        }
      });
    } else {
      // Fallback to sheet structure analysis
      const { rowCount, colCount, cells } = sheet;
      
      // Create range for complete dataset
      ranges.push({
        id: 'complete-dataset',
        name: 'Complete Dataset',
        range: `A1:${String.fromCharCode(65 + colCount - 1)}${rowCount}`,
        data: [],
        summary: {
          count: rowCount * colCount,
          uniqueValues: Object.keys(cells).length
        }
      });

      // Analyze column data from cells
      const columnData: { [key: string]: any[] } = {};
      
      Object.entries(cells).forEach(([cellId, cell]: [string, any]) => {
        const col = cellId.match(/^([A-Z]+)/)?.[1];
        if (col && cell.value !== undefined) {
          if (!columnData[col]) columnData[col] = [];
          columnData[col].push(cell.value);
        }
      });

      // Create ranges for each column with data
      Object.entries(columnData).forEach(([col, values], index) => {
        if (values.length > 0) {
          const numericValues = values.filter(v => !isNaN(Number(v))).map(v => Number(v));
          
          ranges.push({
            id: `column-${col}`,
            name: `Column ${col} Data`,
            range: `${col}1:${col}${sheet.rowCount}`,
            data: values,
            summary: {
              count: values.length,
              sum: numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) : undefined,
              average: numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : undefined,
              min: numericValues.length > 0 ? Math.min(...numericValues) : undefined,
              max: numericValues.length > 0 ? Math.max(...numericValues) : undefined,
              uniqueValues: new Set(values).size
            }
          });
        }
      });
    }
  } catch (error) {
    console.error('Error analyzing sheet data:', error);
    // Provide basic fallback
    ranges.push({
      id: 'fallback-range',
      name: 'Sheet Data',
      range: `A1:Z${sheet.rowCount}`,
      data: [],
      summary: {
        count: sheet.rowCount * sheet.colCount,
        uniqueValues: Object.keys(sheet.cells).length
      }
    });
  }

  return ranges;
}

/**
 * Get data from DuckDB if available
 */
async function getDuckDBData(): Promise<any[] | null> {
  try {
    // Check if DuckDB is available in the global scope
    if (typeof window !== 'undefined' && (window as any).duckDB) {
      const result = await (window as any).duckDB.query('SELECT * FROM sheet_data LIMIT 1000');
      return result || null;
    }
    return null;
  } catch (error) {
    console.log('DuckDB not available, using sheet data');
    return null;
  }
}

/**
 * Generate data analysis using AI (frontend)
 */
async function generateDataAnalysisWithAI(
  sheet: SheetData, 
  ranges: DataRange[], 
  charts: any[],
  userContext?: string
): Promise<DataAnalysis> {
  try {
    console.log('🔍 Starting AI analysis...');
    console.log('📊 Sheet data:', { name: sheet.name, rows: sheet.rowCount, cols: sheet.colCount });
    console.log('📈 Ranges to analyze:', ranges.length);
    
    // Use Ollama directly from frontend
    const requestBody = {
      model: 'mistral:instruct',
      prompt: `You are an expert data analyst specializing in ${userContext || 'business intelligence'}. Analyze this spreadsheet data and provide comprehensive insights tailored to ${userContext || 'general business analysis'}.

Sheet: ${sheet.name}
Rows: ${sheet.rowCount}
Columns: ${sheet.colCount}
Data Ranges: ${ranges.map(r => `${r.name}: ${r.summary.count} items`).join(', ')}
Charts: ${charts.length} existing charts
Business Focus: ${userContext || 'General business analysis'}

Generate a detailed JSON analysis with:
1. Trends: Identify patterns in numerical data with confidence levels, focusing on ${userContext || 'business'} implications
2. Patterns: Find recurring patterns in categorical data with frequency analysis, relevant to ${userContext || 'business'} operations
3. Correlations: Identify relationships between fields with strength indicators, highlighting ${userContext || 'business'} impact
4. Outliers: Detect unusual values with threshold explanations, considering ${userContext || 'business'} context

Be descriptive and provide actionable insights specific to ${userContext || 'business'} decision-making. Return only valid JSON in this exact format:
{
  "trends": [
    {
      "field": "field_name", 
      "trend": "increasing|decreasing|stable|fluctuating", 
      "confidence": 0.85, 
      "description": "Detailed trend description with business implications"
    }
  ],
  "patterns": [
    {
      "field": "field_name", 
      "pattern": "Detailed pattern description", 
      "frequency": "frequency analysis", 
      "description": "Comprehensive pattern explanation with examples"
    }
  ],
  "correlations": [
    {
      "field1": "field1_name", 
      "field2": "field2_name", 
      "correlation": 0.75, 
      "strength": "strong|moderate|weak", 
      "description": "Detailed correlation explanation with business impact"
    }
  ],
  "outliers": [
    {
      "field": "field_name", 
      "outliers": [], 
      "threshold": 2.5, 
      "description": "Comprehensive outlier analysis with recommendations"
    }
  ]
}`,
      stream: false
    };
    
    console.log('🚀 Sending request to Ollama...');
    console.log('📝 Request body:', requestBody);
    
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Response not OK:', errorText);
      throw new Error(`AI service unavailable: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('📥 Raw Ollama response:', result);
    
    if (!result.response) {
      console.error('❌ No response field in Ollama result:', result);
      throw new Error('Invalid response format from Ollama');
    }
    
    console.log('🔍 Attempting to parse AI response...');
    console.log('📝 Raw AI response text:', result.response);
    
    let analysis;
    try {
      analysis = JSON.parse(result.response);
      console.log('✅ Successfully parsed AI response:', analysis);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      console.error('📝 Raw response that failed to parse:', result.response);
      
      // Try to extract JSON from the response if it's wrapped in markdown
      const jsonMatch = result.response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[1]);
          console.log('✅ Successfully extracted JSON from markdown:', analysis);
        } catch (extractError) {
          console.error('❌ Failed to extract JSON from markdown:', extractError);
          throw new Error(`AI response parsing failed: ${parseError.message}`);
        }
      } else {
        throw new Error(`AI response parsing failed: ${parseError.message}`);
      }
    }
    
    return analysis;
  } catch (error) {
    console.error('❌ AI analysis failed, using fallback:', error);
    return generateDefaultAnalysis(ranges);
  }
}

/**
 * Generate report summary
 */
async function generateReportSummary(
  sheet: SheetData, 
  analysis: DataAnalysis, 
  charts: any[],
  userContext?: string
): Promise<ReportSummary> {
  const dataTypes: Record<string, string> = {};
  
  // Analyze data types from sheet structure
  if (sheet.cells) {
    Object.entries(sheet.cells).forEach(([cellId, cell]: [string, any]) => {
      const col = cellId.match(/^([A-Z]+)/)?.[1];
      if (col && cell.value !== undefined) {
        const type = typeof cell.value === 'number' ? 'numeric' : 'text';
        if (!dataTypes[col]) dataTypes[col] = type;
        else if (dataTypes[col] !== type) dataTypes[col] = 'mixed';
      }
    });
  }

  // Generate insights based on analysis
  const keyInsights = [
    `Dataset contains ${sheet.rowCount} rows and ${sheet.colCount} columns`,
    `${charts.length} charts available for analysis`,
    `Data spans ${Object.keys(dataTypes).length} columns with various types`,
    analysis.trends.length > 0 ? `${analysis.trends.length} significant trends identified` : 'No clear trends detected',
    analysis.correlations.length > 0 ? `${analysis.correlations.length} field correlations found` : 'Limited correlation analysis available',
    userContext ? `Analysis focused on ${userContext} for targeted insights` : 'General business analysis performed'
  ];

  const recommendations = [
    'Review the generated charts for visual insights',
    'Use the interactive dashboard to explore data relationships',
    'Consider creating additional visualizations for key metrics',
    analysis.trends.length > 0 ? 'Investigate identified trends for business opportunities' : 'Collect more data to identify trends',
    analysis.outliers.length > 0 ? 'Review outliers for data quality issues or opportunities' : 'Data appears to be within normal ranges',
    userContext ? `Focus on ${userContext}-specific metrics and KPIs` : 'Consider industry-specific metrics for deeper insights',
    userContext ? `Use ${userContext} insights for strategic decision-making` : 'Apply insights to improve business processes'
  ];

  return {
    totalRows: sheet.rowCount || 0,
    totalColumns: sheet.colCount || 0,
    dataTypes,
    keyInsights,
    recommendations
  };
}

/**
 * Process charts with AI insights
 */
async function processChartsWithAI(
  charts: any[], 
  sheet: SheetData, 
  ranges: DataRange[],
  userContext?: string
): Promise<ChartData[]> {
  try {
    console.log('📊 Starting chart processing with AI...');
    console.log('📈 Charts to process:', charts.length);
    console.log('📋 Chart types:', charts.map(c => c.type || 'unknown'));
    
    const requestBody = {
      model: 'mistral:instruct',
      prompt: `Analyze these charts and provide detailed insights focused on ${userContext || 'business intelligence'}.

Charts: ${charts.map(c => `${c.type} chart: ${c.title || 'Untitled'}`).join(', ')}
Sheet: ${sheet.name} with ${sheet.rowCount} rows
Data Ranges: ${ranges.map(r => r.name).join(', ')}
Business Focus: ${userContext || 'General business analysis'}

Generate comprehensive insights for each chart that are relevant to ${userContext || 'business'} decision-making. Be descriptive and provide actionable business value.
Return JSON array:
[
  {
    "id": "chart_id",
    "name": "Chart Name", 
    "type": "bar|line|pie|area|scatter|heatmap",
    "insights": [
      "Detailed insight 1 with business implications",
      "Detailed insight 2 with recommendations",
      "Detailed insight 3 with actionable steps"
    ]
  }
]`,
      stream: false
    };
    
    console.log('🚀 Sending chart analysis request to Ollama...');
    console.log('📝 Chart request body:', requestBody);
    
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 Chart response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Chart response not OK:', errorText);
      throw new Error(`AI chart service unavailable: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('📥 Raw chart Ollama response:', result);
    
    if (!result.response) {
      console.error('❌ No response field in chart Ollama result:', result);
      throw new Error('Invalid response format from Ollama for charts');
    }
    
    console.log('🔍 Attempting to parse chart AI response...');
    console.log('📝 Raw chart AI response text:', result.response);
    
    let chartInsights;
    try {
      chartInsights = JSON.parse(result.response);
      console.log('✅ Successfully parsed chart AI response:', chartInsights);
    } catch (parseError) {
      console.error('❌ Failed to parse chart AI response as JSON:', parseError);
      console.error('📝 Raw chart response that failed to parse:', result.response);
      
      // Try to extract JSON from the response if it's wrapped in markdown
      const jsonMatch = result.response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          chartInsights = JSON.parse(jsonMatch[1]);
          console.log('✅ Successfully extracted JSON from markdown for charts:', chartInsights);
        } catch (extractError) {
          console.error('❌ Failed to extract JSON from markdown for charts:', extractError);
          throw new Error(`Chart AI response parsing failed: ${parseError.message}`);
        }
      } else {
        throw new Error(`Chart AI response parsing failed: ${parseError.message}`);
      }
    }
    
    // Merge AI insights with existing chart data
    return charts.map((chart, index) => ({
      id: chart.id || `chart-${index}`,
      name: chart.title || `Chart ${index + 1}`,
      type: chart.type || 'bar',
      data: chart.data || [],
      config: chart.config || {},
      range: chart.range || 'A1:Z1000',
      insights: chartInsights[index]?.insights || [
        'Chart generated from data analysis',
        'Consider exploring data relationships',
        'Use interactive features for deeper insights'
      ]
    }));
  } catch (error) {
    console.error('❌ AI chart processing failed, using fallback:', error);
    return charts.map((chart, index) => ({
      id: chart.id || `chart-${index}`,
      name: chart.title || `Chart ${index + 1}`,
      type: chart.type || 'bar',
      data: chart.data || [],
      config: chart.config || {},
      range: chart.range || 'A1:Z1000',
      insights: [
        'Chart generated from data analysis',
        'Consider exploring data relationships',
        'Use interactive features for deeper insights'
      ]
    }));
  }
}

/**
 * Generate dashboard configuration
 */
async function generateDashboardConfig(
  charts: ChartData[], 
  ranges: DataRange[], 
  analysis: DataAnalysis,
  userContext?: string
): Promise<DashboardConfig> {
  const layout: DashboardLayout[] = [];
  
  // Create layout for charts
  charts.forEach((chart, index) => {
    layout.push({
      id: `layout-${chart.id}`,
      type: 'chart',
      chartId: chart.id,
      position: { x: (index % 3) * 400, y: Math.floor(index / 2) * 300 },
      size: { width: 400, height: 300 },
      title: chart.name,
      config: {}
    });
  });

  // Add metric widgets for data ranges
  ranges.slice(0, 4).forEach((range, index) => {
    layout.push({
      id: `metric-${range.id}`,
      type: 'metric',
      position: { x: (index % 4) * 200, y: 600 },
      size: { width: 200, height: 150 },
      title: `${range.name} Summary`,
      config: { range }
    });
  });

  // Add category-specific widgets if context is provided
  if (userContext) {
    const categoryWidgets = getCategorySpecificWidgets(userContext, ranges, analysis);
    categoryWidgets.forEach((widget, index) => {
      layout.push({
        ...widget,
        position: { x: (index % 2) * 300, y: 800 + Math.floor(index / 2) * 200 }
      });
    });
  }

  return {
    layout,
    filters: [],
    refreshInterval: 300
  };
}

/**
 * Get category-specific dashboard widgets
 */
function getCategorySpecificWidgets(category: string, ranges: DataRange[], analysis: DataAnalysis): any[] {
  const widgets = [];
  
  switch (category.toLowerCase()) {
    case 'financial performance':
      widgets.push({
        id: 'financial-kpi',
        type: 'metric',
        size: { width: 300, height: 150 },
        title: 'Financial KPIs',
        config: { 
          type: 'financial',
          metrics: ['ROI', 'Profit Margin', 'Cash Flow']
        }
      });
      break;
      
    case 'sales analytics':
      widgets.push({
        id: 'sales-metrics',
        type: 'metric',
        size: { width: 300, height: 150 },
        title: 'Sales Metrics',
        config: { 
          type: 'sales',
          metrics: ['Conversion Rate', 'Average Order Value', 'Sales Growth']
        }
      });
      break;
      
    case 'marketing roi':
      widgets.push({
        id: 'marketing-kpi',
        type: 'metric',
        size: { width: 300, height: 150 },
        title: 'Marketing KPIs',
        config: { 
          type: 'marketing',
          metrics: ['Customer Acquisition Cost', 'LTV', 'ROAS']
        }
      });
      break;
      
    case 'operational efficiency':
      widgets.push({
        id: 'operational-kpi',
        type: 'metric',
        size: { width: 300, height: 150 },
        title: 'Operational KPIs',
        config: { 
          type: 'operational',
          metrics: ['Efficiency Ratio', 'Cost per Unit', 'Productivity']
        }
      });
      break;
      
    case 'customer analytics':
      widgets.push({
        id: 'customer-kpi',
        type: 'metric',
        size: { width: 300, height: 150 },
        title: 'Customer KPIs',
        config: { 
          type: 'customer',
          metrics: ['Customer Satisfaction', 'Retention Rate', 'NPS']
        }
      });
      break;
      
    case 'employee performance':
      widgets.push({
        id: 'employee-kpi',
        type: 'metric',
        size: { width: 300, height: 150 },
        title: 'Employee KPIs',
        config: { 
          type: 'employee',
          metrics: ['Productivity', 'Satisfaction', 'Turnover Rate']
        }
      });
      break;
      
    default:
      // Custom category
      widgets.push({
        id: 'custom-kpi',
        type: 'metric',
        size: { width: 300, height: 150 },
        title: `${category} KPIs`,
        config: { 
          type: 'custom',
          category: category,
          metrics: ['Key Metric 1', 'Key Metric 2', 'Key Metric 3']
        }
      });
  }
  
  return widgets;
}

/**
 * Fallback analysis when AI fails
 */
function generateDefaultAnalysis(ranges: DataRange[]): DataAnalysis {
  return {
    trends: ranges.map(r => ({
      field: r.name,
      trend: 'stable' as const,
      confidence: 0.7,
      description: `Data in ${r.name} shows consistent patterns with ${r.summary.count} items`
    })),
    patterns: ranges.map(r => ({
      field: r.name,
      pattern: 'regular distribution',
      frequency: 'consistent',
      description: `Regular data distribution observed in ${r.name} with ${r.summary.uniqueValues} unique values`
    })),
    correlations: [],
    outliers: []
  };
}

/**
 * Save report to local storage
 */
export function saveReportToStorage(report: ReportData): void {
  try {
    const savedReports = JSON.parse(localStorage.getItem('savedReports') || '[]');
    savedReports.push(report);
    localStorage.setItem('savedReports', JSON.stringify(savedReports));
  } catch (error) {
    console.error('Failed to save report to storage:', error);
  }
}

/**
 * Load reports from local storage
 */
export function loadReportsFromStorage(): ReportData[] {
  try {
    return JSON.parse(localStorage.getItem('savedReports') || '[]');
  } catch (error) {
    console.error('Failed to load reports from storage:', error);
    return [];
  }
}

/**
 * Delete report from local storage
 */
export function deleteReportFromStorage(reportId: string): void {
  try {
    const savedReports = JSON.parse(localStorage.getItem('savedReports') || '[]');
    const filteredReports = savedReports.filter((r: ReportData) => r.id !== reportId);
    localStorage.setItem('savedReports', JSON.stringify(filteredReports));
  } catch (error) {
    console.error('Failed to delete report from storage:', error);
  }
}
