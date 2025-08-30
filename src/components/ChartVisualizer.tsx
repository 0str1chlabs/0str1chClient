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
  console.log('🔍 ChartVisualizer received data:', { charts, kpis, sheetData: sheetData?.slice(0, 3) });

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
    if (!sheetData || sheetData.length === 0) {
      console.log('❌ No data available for chart:', chart.title);
      return [];
    }

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
    const xColumnLetter = columnMapping[chart.x_column] || chart.x_column;
    const yColumnLetter = columnMapping[chart.y_column] || chart.y_column;

    console.log(`🔍 Processing chart "${chart.title}":`, {
      xColumn: chart.x_column,
      yColumn: chart.y_column,
      xColumnLetter,
      yColumnLetter,
      sampleRow: sheetData[0]
    });

    // Filter out rows with empty or invalid data
    // For counting charts (like Employee Count), we only need valid x values
    // For numeric charts, we need both x and y values to be valid
    const validRows = sheetData.filter(row => {
      const xValue = row[xColumnLetter];
      const yValue = row[yColumnLetter];
      
      // Always need valid x value
      if (!xValue || xValue === '') return false;
      
      // For EEID (counting) or other non-numeric columns, just check if y value exists
      if (chart.y_column === 'EEID' || chart.y_column === 'Country' || chart.y_column === 'City' || chart.y_column === 'Department') {
        return yValue && yValue !== '';
      }
      
      // For numeric columns, check if it's a valid number
      return yValue && yValue !== '' && !isNaN(parseFloat(yValue));
    });

    console.log(`🔍 Valid rows for chart "${chart.title}":`, validRows.length);

    if (validRows.length === 0) {
      console.log(`❌ No valid data found for chart "${chart.title}"`);
      return [];
    }

    // Group data by x_column for aggregation
    const groupedData = validRows.reduce((acc: any, row: any) => {
      const xValue = row[xColumnLetter];
      
      if (!acc[xValue]) {
        acc[xValue] = { [chart.x_column]: xValue, [chart.y_column]: 0, count: 0 };
      }
      
      // For counting charts (EEID), increment count
      if (chart.y_column === 'EEID') {
        acc[xValue][chart.y_column] += 1;
      } else {
        // For numeric charts, sum the values
        const yValue = parseFloat(row[yColumnLetter]) || 0;
        acc[xValue][chart.y_column] += yValue;
      }
      
      acc[xValue].count += 1;
      
      return acc;
    }, {});

    // Convert to array and calculate averages if needed
    const result = Object.values(groupedData).map((item: any) => {
      let finalValue = item[chart.y_column];
      
      // Check if we need to calculate average (from Gemini's aggregation field)
      if (chart.aggregation === 'average' && item.count > 1) {
        finalValue = item[chart.y_column] / item.count;
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
    const data = processChartData(chart);
    
    console.log(`🎯 Rendering chart "${chart.title}":`, {
      chart,
      data,
      dataLength: data.length,
      sampleData: data.slice(0, 2)
    });
    
    if (data.length === 0) {
                     return (
       <Card key={index} className="w-full h-full">
         <CardHeader className="pb-4">
           <CardTitle className="text-lg">{chart.title}</CardTitle>
           <Badge variant="secondary">{chart.type}</Badge>
         </CardHeader>
         <CardContent>
           <div className="h-80 flex items-center justify-center text-muted-foreground">
             No data available for {chart.x_column} vs {chart.y_column}
           </div>
         </CardContent>
       </Card>
     );
    }

    const chartProps = {
      data,
      margin: { top: 20, right: 40, left: 30, bottom: 20 },
      className: "w-full h-80"
    };

    switch (chart.type.toLowerCase()) {
      case 'bar':
        return (
          <Card key={index} className="w-full h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{chart.title}</CardTitle>
              <Badge variant="secondary">{chart.type} • {chart.chart_purpose}</Badge>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
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
          <Card key={index} className="w-full h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{chart.title}</CardTitle>
              <Badge variant="secondary">{chart.type} • {chart.chart_purpose}</Badge>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
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
          <Card key={index} className="w-full h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{chart.title}</CardTitle>
              <Badge variant="secondary">{chart.type} • {chart.chart_purpose}</Badge>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
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
          <Card key={index} className="w-full h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{chart.title}</CardTitle>
              <Badge variant="secondary">{chart.type} • {chart.chart_purpose}</Badge>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
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

      default:
        return (
          <Card key={index} className="w-full h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{chart.title}</CardTitle>
              <Badge variant="outline">Unsupported chart type: {chart.type}</Badge>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center text-muted-foreground">
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

      const columnLetter = columnMapping[kpi.column] || kpi.column;
      
      console.log(`🔍 Processing KPI "${kpi.name}":`, {
        column: kpi.column,
        columnLetter,
        sampleRow: sheetData[0],
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

      console.log(`🔍 KPI "${kpi.name}" valid values:`, columnData.length, 'out of', sheetData.length);

      if (columnData.length > 0) {
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

    return (
      <Card key={index} className="w-full h-full">
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
    <div className="space-y-10 w-full">
      {/* KPI Cards */}
      {kpis && kpis.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-8">Key Performance Indicators</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {kpis.map((kpi, index) => renderKPI(kpi, index))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div>
        <h3 className="text-xl font-semibold mb-8">Data Visualizations</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {charts.map((chart, index) => renderChart(chart, index))}
        </div>
      </div>
    </div>
  );
};
