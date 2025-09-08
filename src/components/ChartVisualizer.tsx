import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartConfig, KPIConfig } from '@/lib/geminiService';

interface ChartVisualizerProps {
  charts: ChartConfig[];
  kpis: KPIConfig[];
  sheetData: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const ChartVisualizer: React.FC<ChartVisualizerProps> = ({ charts, kpis, sheetData }) => {
  // Debug logging
  console.log('🔍 ChartVisualizer received data:', {
    charts: charts?.length || 0,
    kpis: kpis?.length || 0,
    sheetDataLength: sheetData?.length || 0,
    sampleSheetData: sheetData?.slice(0, 2),
    chartsSample: charts?.slice(0, 2)
  });

  if (!charts || charts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No charts available to display
      </div>
    );
  }

  // If no sheet data, generate sample data for demonstration
  const hasRealData = sheetData && sheetData.length > 0 && 
    Object.values(sheetData[0] || {}).some(val => val !== '' && val !== 0);
  
  if (!hasRealData) {
    console.log('⚠️ No real data found, generating sample data for charts');
    
    // Create sample data for demonstration
    const sampleData = [
      { A: 'EMP001', B: 'John Doe', C: 'Manager', D: 'Sales', E: 'North', F: 'M', G: 'Caucasian', H: 35, I: '2020-01-15', J: 75000, K: 15, L: 'USA', M: 'New York', N: '' },
      { A: 'EMP002', B: 'Jane Smith', C: 'Developer', D: 'IT', E: 'South', F: 'F', G: 'Asian', H: 28, I: '2021-03-20', J: 65000, K: 10, L: 'USA', M: 'Los Angeles', N: '' },
      { A: 'EMP003', B: 'Bob Johnson', C: 'Analyst', D: 'Finance', E: 'East', F: 'M', G: 'African American', H: 32, I: '2019-11-10', J: 70000, K: 12, L: 'USA', M: 'Chicago', N: '' },
      { A: 'EMP004', B: 'Alice Brown', C: 'Designer', D: 'Marketing', E: 'West', F: 'F', G: 'Hispanic', H: 29, I: '2022-02-01', J: 60000, K: 8, L: 'USA', M: 'San Francisco', N: '' },
      { A: 'EMP005', B: 'Charlie Wilson', C: 'Engineer', D: 'R&D', E: 'Central', F: 'M', G: 'Caucasian', H: 31, I: '2020-06-15', J: 80000, K: 18, L: 'USA', M: 'Austin', N: '' }
    ];
    
    return (
      <div className="space-y-6">
        <div className="text-center py-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Using sample data for demonstration. Your actual sheet data will be used when available.
          </p>
        </div>
        <ChartVisualizerWithData charts={charts} kpis={kpis} sheetData={sampleData} />
      </div>
    );
  }

  // If we have real data, render with it
  return <ChartVisualizerWithData charts={charts} kpis={kpis} sheetData={sheetData} />;
};

// Internal component that handles rendering with actual data
const ChartVisualizerWithData: React.FC<ChartVisualizerProps> = ({ charts, kpis, sheetData }) => {
  // Debug logging
  console.log('🔍 ChartVisualizerWithData received data:', { charts, kpis, sheetData: sheetData?.slice(0, 3) });

  // Process sheet data for charts
  const processChartData = (chart: ChartConfig) => {
    console.log(`🔍 Processing chart "${chart.title}":`, {
      xColumn: chart.x_column,
      yColumn: chart.y_column,
      hasChartData: !!chart.data && chart.data.length > 0,
      chartDataLength: chart.data?.length || 0,
      sheetDataLength: sheetData?.length || 0
    });

    // If chart already has processed data from backend, use it directly
    if (chart.data && chart.data.length > 0) {
      console.log(`📊 Using chart's pre-processed data for "${chart.title}": ${chart.data.length} points`);
      console.log(`📊 Chart data sample:`, chart.data.slice(0, 2));
      console.log(`📊 Chart columns:`, { x_column: chart.x_column, y_column: chart.y_column });

      // The backend data should already have the correct keys (x_column and y_column)
      // No transformation needed - use the data directly
      console.log(`✅ Using backend chart data directly:`, chart.data.slice(0, 3));
      return chart.data;
    }

    // Fallback: Use sheet data processing if no pre-processed data
    if (!sheetData || sheetData.length === 0) {
      console.log('❌ No data available for chart:', chart.title);
      return [];
    }

    console.log(`📊 Falling back to sheet data processing for "${chart.title}"`);

    // Map Gemini column names to Excel column letters
    const columnMapping: { [key: string]: string } = {
      'EEID': 'A',
      'Full Name': 'B',
      'Job Title': 'C',
      'Department': 'D',
      'Business Unit': 'E',
      'Gender': 'F',
      'Ethnicity': 'G',
      'Age': 'H',
      'Hire Date': 'I',
      'Annual Salary': 'J',
      'Bonus %': 'K',
      'Country': 'L',
      'City': 'M',
      'Exit Date': 'N'
    };

    // Get the actual Excel column letters for the chart
    // If chart.x_column is already an Excel letter (A, B, C, etc.), use it directly
    // Otherwise, try to map from human-readable name to Excel letter
    const xColumnLetter = /^[A-Z]$/.test(chart.x_column)
      ? chart.x_column
      : (columnMapping[chart.x_column] || chart.x_column);
    const yColumnLetter = /^[A-Z]$/.test(chart.y_column)
      ? chart.y_column
      : (columnMapping[chart.y_column] || chart.y_column);

    console.log(`🔍 Processing chart "${chart.title}":`, {
      xColumn: chart.x_column,
      yColumn: chart.y_column,
      xColumnLetter,
      yColumnLetter,
      sampleRow: sheetData[0],
      chartType: chart.type,
      allColumns: Object.keys(sheetData[0] || {}),
      firstFewRows: sheetData.slice(0, 3)
    });

    // Filter out rows with empty or invalid data
    // For counting charts (like Employee Count), we only need valid x values
    // For numeric charts, we need both x and y values to be valid
    console.log(`🔍 Filtering data for chart "${chart.title}":`, {
      xColumnLetter,
      yColumnLetter,
      totalRows: sheetData.length,
      sampleRow: sheetData[0]
    });

    const validRows = sheetData.filter((row, index) => {
      const xValue = row[xColumnLetter];
      const yValue = row[yColumnLetter];

      // Always need valid x value
      if (!xValue || xValue === '') {
        if (index < 3) console.log(`❌ Row ${index}: Invalid x value "${xValue}"`);
        return false;
      }

      // Determine if this is a counting operation based on the chart's y_column name and actual data
      const isCountingOperation = chart.y_column.includes('Count') ||
                                 chart.y_column.includes('count') ||
                                 chart.y_column.includes('Number') ||
                                 chart.y_column.includes('number') ||
                                 chart.y_column.toLowerCase().includes('employee') && chart.y_column.toLowerCase().includes('count');

      if (isCountingOperation) {
        // For counting, we need the x value (category) and any non-empty y value
        const isValid = xValue && xValue !== '' && yValue !== null && yValue !== undefined;
        if (index < 3) console.log(`🔍 Row ${index}: Counting operation check - x="${xValue}", y="${yValue}" -> ${isValid}`);
        return isValid;
      }

      // For numeric aggregations, check if y value is a valid number
      const isNumericOperation = chart.aggregation === 'average' ||
                                chart.aggregation === 'sum' ||
                                chart.aggregation === 'count' ||
                                !isNaN(parseFloat(yValue));

      if (isNumericOperation) {
        const isValid = xValue && xValue !== '' && yValue && yValue !== '' && !isNaN(parseFloat(yValue));
        if (index < 3) console.log(`🔍 Row ${index}: Numeric operation check - x="${xValue}", y="${yValue}" -> ${isValid} (parsed: ${parseFloat(yValue)})`);
        return isValid;
      }

      // For categorical/text data, just check if values exist
      const isValid = xValue && xValue !== '' && yValue && yValue !== '';
      if (index < 3) console.log(`🔍 Row ${index}: General validation - x="${xValue}", y="${yValue}" -> ${isValid}`);
      return isValid;
    });

    console.log(`🔍 Valid rows for chart "${chart.title}":`, validRows.length);

    if (validRows.length === 0) {
      console.log(`❌ No valid data found for chart "${chart.title}"`);
      return [];
    }

    // Group data by x_column for aggregation - completely generic approach
    const groupedData = validRows.reduce((acc: any, row: any) => {
      const xValue = row[xColumnLetter];
      const yValue = row[yColumnLetter];

      if (!acc[xValue]) {
        acc[xValue] = { [chart.x_column]: xValue, [chart.y_column]: 0, count: 0 };
      }

      // Determine operation type from the actual data and chart configuration
      const isCountingBasedOnName = chart.y_column.includes('Count') ||
                                   chart.y_column.includes('count') ||
                                   chart.y_column.includes('Number') ||
                                   chart.y_column.includes('number');

      const yValueStr = String(yValue || '');
      const isCountingBasedOnData = yValueStr && !isNaN(parseFloat(yValueStr)) && parseFloat(yValueStr) === 1; // Often counting uses 1s

      const isNumericAggregation = chart.aggregation === 'average' ||
                                  chart.aggregation === 'sum' ||
                                  (!isNaN(parseFloat(yValueStr)) && parseFloat(yValueStr) !== 1);

      if (isCountingBasedOnName || isCountingBasedOnData) {
        // For counting operations, increment the count
        acc[xValue][chart.y_column] += 1;
        console.log(`📊 Counting operation: ${xValue} -> count: ${acc[xValue][chart.y_column]} (yValue: ${yValue})`);
      } else if (isNumericAggregation) {
        // For numeric aggregations, sum the values
        const numericValue = parseFloat(yValue) || 0;
        acc[xValue][chart.y_column] += numericValue;
        console.log(`📊 Numeric aggregation: ${xValue} -> sum: ${acc[xValue][chart.y_column]} (yValue: ${yValue})`);
      } else {
        // For other operations, try to handle based on data type
        if (!isNaN(parseFloat(yValue))) {
          acc[xValue][chart.y_column] += parseFloat(yValue);
        } else {
          acc[xValue][chart.y_column] += 1; // Default to counting
        }
        console.log(`📊 Generic operation: ${xValue} -> value: ${acc[xValue][chart.y_column]} (yValue: ${yValue})`);
      }

      acc[xValue].count += 1;

      return acc;
    }, {});

    // Convert to array and apply final calculations - completely generic
    const result = Object.values(groupedData).map((item: any) => {
      let finalValue = item[chart.y_column];

      // Apply aggregation based on chart configuration and data characteristics
      if (chart.aggregation === 'average' && item.count > 1) {
        // Calculate average for aggregated numeric data
        finalValue = item[chart.y_column] / item.count;
        console.log(`📊 Applied average aggregation: ${item[chart.y_column]} / ${item.count} = ${finalValue}`);
      } else if (chart.aggregation === 'sum') {
        // Sum is already calculated, use as-is
        finalValue = item[chart.y_column];
        console.log(`📊 Applied sum aggregation: ${finalValue}`);
      } else if (chart.aggregation === 'count') {
        // Use the count directly
        finalValue = item.count;
        console.log(`📊 Applied count aggregation: ${finalValue}`);
      } else {
        // No specific aggregation requested, use the calculated value
        finalValue = item[chart.y_column];
        console.log(`📊 No aggregation specified, using: ${finalValue}`);
      }

      return {
        [chart.x_column]: item[chart.x_column],
        [chart.y_column]: finalValue
      };
    });

    console.log(`✅ Chart "${chart.title}" processed data:`, result);
    return result;
  };

  // Render individual chart based on type
  const renderChart = (chart: ChartConfig, index: number) => {
    console.log(`🎯 Attempting to render chart "${chart.title}" (type: ${chart.type})`);

    const data = processChartData(chart);

    console.log(`📊 Chart "${chart.title}" data processing result:`, {
      originalChart: chart,
      processedData: data,
      dataLength: data.length,
      sampleData: data.slice(0, 3),
      xColumn: chart.x_column,
      yColumn: chart.y_column
    });

    if (data.length === 0) {
      console.log(`❌ No data for chart "${chart.title}" - showing empty state`);
      return (
        <Card key={index} className="w-full h-full shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{chart.title}</CardTitle>
            <Badge variant="secondary">{chart.type}</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-96 flex items-center justify-center text-muted-foreground">
              No data available for {chart.x_column} vs {chart.y_column}
            </div>
          </CardContent>
        </Card>
      );
    }

    console.log(`✅ Rendering chart "${chart.title}" with ${data.length} data points`);

    const chartProps = {
      data,
      margin: { top: 20, right: 40, left: 30, bottom: 20 },
      className: "w-full"
    };

    switch (chart.type.toLowerCase()) {
      case 'bar':
        return (
          <Card key={index} className="w-full h-full shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{chart.title}</CardTitle>
              <Badge variant="secondary">{chart.type} • {chart.chart_purpose}</Badge>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart {...chartProps}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={chart.x_column} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={chart.y_column} fill={COLORS[index % COLORS.length]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case 'line':
        return (
          <Card key={index} className="w-full h-full shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{chart.title}</CardTitle>
              <Badge variant="secondary">{chart.type} • {chart.chart_purpose}</Badge>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart {...chartProps}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={chart.x_column} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={chart.y_column} stroke={COLORS[index % COLORS.length]} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case 'pie':
        return (
          <Card key={index} className="w-full h-full shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{chart.title}</CardTitle>
              <Badge variant="secondary">{chart.type} • {chart.chart_purpose}</Badge>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ [chart.x_column]: name, [chart.y_column]: value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey={chart.y_column}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case 'scatter':
        return (
          <Card key={index} className="w-full h-full shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{chart.title}</CardTitle>
              <Badge variant="secondary">{chart.type} • {chart.chart_purpose}</Badge>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart {...chartProps}>
                  <CartesianGrid />
                  <XAxis type="number" dataKey={chart.x_column} />
                  <YAxis type="number" dataKey={chart.y_column} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={data} fill={COLORS[index % COLORS.length]} />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      case 'histogram':
        // For histogram, we'll create frequency data based on x-axis values
        console.log(`📊 Creating histogram data for "${chart.title}"`);

        // Group data by x values to create frequency
        const frequencyData = data.reduce((acc: any, item: any) => {
          const xValue = item[chart.x_column];
          if (!acc[xValue]) {
            acc[xValue] = { [chart.x_column]: xValue, frequency: 0 };
          }
          acc[xValue].frequency += 1;
          return acc;
        }, {});

        const histogramData = Object.values(frequencyData);

        console.log(`📊 Histogram data created:`, histogramData);

        return (
          <Card key={index} className="w-full h-full shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{chart.title}</CardTitle>
              <Badge variant="secondary">{chart.type} • {chart.chart_purpose}</Badge>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={histogramData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={chart.x_column} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="frequency" fill={COLORS[index % COLORS.length]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card key={index} className="w-full h-full shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{chart.title}</CardTitle>
              <Badge variant="outline">Unsupported chart type: {chart.type}</Badge>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center text-muted-foreground">
                Chart type "{chart.type}" not supported
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  // Render KPI cards
  const renderKPI = (kpi: KPIConfig, index: number) => {
    // Calculate KPI value from sheet data
    let value = 0;
    let formattedValue = '0';

    if (sheetData && sheetData.length > 0) {
      // Map Gemini column names to Excel column letters
      const columnMapping: { [key: string]: string } = {
        'EEID': 'A',
        'Full Name': 'B', 
        'Job Title': 'C',
        'Department': 'D',
        'Business Unit': 'E',
        'Gender': 'F',
        'Ethnicity': 'G',
        'Age': 'H',
        'Hire Date': 'I',
        'Annual Salary': 'J',
        'Bonus %': 'K',
        'Country': 'L',
        'City': 'M',
        'Exit Date': 'N'
      };

      // If kpi.column is already an Excel letter (A, B, C, etc.), use it directly
      // Otherwise, try to map from human-readable name to Excel letter
      const columnLetter = /^[A-Z]$/.test(kpi.column)
        ? kpi.column
        : (columnMapping[kpi.column] || kpi.column);
      
      console.log(`🔍 Processing KPI "${kpi.name}":`, {
        originalColumn: kpi.column,
        mappedColumn: columnLetter,
        calculation: kpi.calc,
        sampleRow: sheetData[0],
        availableColumns: Object.keys(sheetData[0] || {}),
        totalRows: sheetData.length
      });

      const columnData = sheetData
        .map(row => {
          const rawValue = row[columnLetter];
          const parsedValue = parseFloat(rawValue);
          console.log(`Row ${columnLetter}: raw="${rawValue}", parsed=${parsedValue}`);
          return parsedValue;
        })
        .filter(val => !isNaN(val));

      console.log(`🔍 KPI "${kpi.name}" valid values:`, columnData.length, 'out of', sheetData.length, 'sample values:', columnData.slice(0, 5));

      if (columnData.length > 0) {
        console.log(`✅ Calculating KPI "${kpi.name}" with ${columnData.length} values`);
        switch (kpi.calc.toLowerCase()) {
          case 'sum':
            value = columnData.reduce((sum, val) => sum + val, 0);
            break;
          case 'average':
            value = columnData.reduce((sum, val) => sum + val, 0) / columnData.length;
            break;
          case 'count':
            value = columnData.length;
            break;
          case 'min':
            value = Math.min(...columnData);
            break;
          case 'max':
            value = Math.max(...columnData);
            break;
          default:
            value = 0;
        }

        // Format value based on type
        switch (kpi.format.toLowerCase()) {
          case 'currency':
            formattedValue = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(value);
            break;
          case 'percentage':
            formattedValue = `${value.toFixed(2)}%`;
            break;
          case 'decimal':
            formattedValue = value.toFixed(2);
            break;
          default:
            formattedValue = value.toString();
        }
        }
      }

    console.log(`🎯 Final KPI "${kpi.name}":`, {
      rawValue: value,
      formattedValue,
      calculation: kpi.calc,
      column: kpi.column
    });

    return (
      <Card key={index} className="w-full h-full shadow-md hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-muted-foreground">{kpi.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold mb-3">{formattedValue}</div>
          <p className="text-sm text-muted-foreground">
            {kpi.calc} of {kpi.column}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-12 w-full max-w-none">
      {/* KPI Cards */}
      {kpis && kpis.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-8">Key Performance Indicators</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {kpis.map((kpi, index) => renderKPI(kpi, index))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div>
        <h3 className="text-xl font-semibold mb-8">Data Visualizations</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {charts.map((chart, index) => renderChart(chart, index))}
        </div>
      </div>
    </div>
  );
};
