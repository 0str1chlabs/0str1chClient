import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chart, MultiSeriesChart, MetricCard, ChartContainer } from '@/components/ui/chart';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

// Sample data for demonstration
const sampleData = [
  { category: 'Q1', value: 120, sales: 150, users: 80 },
  { category: 'Q2', value: 180, sales: 220, users: 120 },
  { category: 'Q3', value: 150, sales: 180, users: 100 },
  { category: 'Q4', value: 220, sales: 280, users: 150 },
];

const pieData = [
  { category: 'Desktop', value: 45 },
  { category: 'Mobile', value: 35 },
  { category: 'Tablet', value: 20 },
];

const multiSeriesData = [
  { month: 'Jan', revenue: 12000, expenses: 8000, profit: 4000 },
  { month: 'Feb', revenue: 15000, expenses: 9000, profit: 6000 },
  { month: 'Mar', revenue: 18000, expenses: 10000, profit: 8000 },
  { month: 'Apr', revenue: 14000, expenses: 8500, profit: 5500 },
  { month: 'May', revenue: 20000, expenses: 11000, profit: 9000 },
  { month: 'Jun', revenue: 22000, expenses: 12000, profit: 10000 },
];

export const ChartShowcase: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Shadcn Chart Components
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Beautiful, responsive charts built with Recharts and styled with your theme
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value="$89,400"
          change="+20.1%"
          changeType="positive"
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
        />
        <MetricCard
          title="Active Users"
          value="2,847"
          change="+180.1%"
          changeType="positive"
          icon={<Users className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title="Conversion Rate"
          value="3.24%"
          change="-1.2%"
          changeType="negative"
          icon={<TrendingUp className="h-5 w-5 text-red-600" />}
        />
        <MetricCard
          title="Avg. Session"
          value="2m 32s"
          change="+12.5%"
          changeType="positive"
          icon={<Activity className="h-5 w-5 text-purple-600" />}
        />
      </div>

      {/* Basic Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Bar Chart" description="Simple bar chart showing quarterly performance">
          <Chart
            data={sampleData}
            type="bar"
            xKey="category"
            yKey="value"
            height={300}
            showGrid={true}
            showLegend={true}
            showTooltip={true}
          />
        </ChartContainer>

        <ChartContainer title="Line Chart" description="Trend line showing growth over time">
          <Chart
            data={sampleData}
            type="line"
            xKey="category"
            yKey="value"
            height={300}
            showGrid={true}
            showLegend={true}
            showTooltip={true}
          />
        </ChartContainer>

        <ChartContainer title="Area Chart" description="Filled area showing cumulative data">
          <Chart
            data={sampleData}
            type="area"
            xKey="category"
            yKey="value"
            height={300}
            showGrid={true}
            showLegend={true}
            showTooltip={true}
          />
        </ChartContainer>

        <ChartContainer title="Pie Chart" description="Distribution of traffic sources">
          <Chart
            data={pieData}
            type="pie"
            xKey="category"
            yKey="value"
            height={300}
            showGrid={false}
            showLegend={true}
            showTooltip={true}
          />
        </ChartContainer>
      </div>

      {/* Multi-Series Charts */}
      <ChartContainer 
        title="Multi-Series Chart" 
        description="Multiple data series in a single chart for comparison"
      >
        <MultiSeriesChart
          data={multiSeriesData}
          type="bar"
          xKey="month"
          series={[
            { key: 'revenue', label: 'Revenue' },
            { key: 'expenses', label: 'Expenses' },
            { key: 'profit', label: 'Profit' }
          ]}
          height={400}
          showGrid={true}
          showLegend={true}
          showTooltip={true}
        />
      </ChartContainer>

      <ChartContainer 
        title="Multi-Series Line Chart" 
        description="Trend lines for multiple metrics"
      >
        <MultiSeriesChart
          data={multiSeriesData}
          type="line"
          xKey="month"
          series={[
            { key: 'revenue', label: 'Revenue' },
            { key: 'expenses', label: 'Expenses' },
            { key: 'profit', label: 'Profit' }
          ]}
          height={400}
          showGrid={true}
          showLegend={true}
          showTooltip={true}
        />
      </ChartContainer>

      {/* Customization Examples */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer 
          title="Minimal Chart" 
          description="Chart with minimal styling - no grid, legend, or tooltip"
        >
          <Chart
            data={sampleData}
            type="bar"
            xKey="category"
            yKey="value"
            height={250}
            showGrid={false}
            showLegend={false}
            showTooltip={false}
          />
        </ChartContainer>

        <ChartContainer 
          title="Compact Chart" 
          description="Smaller height for dashboard widgets"
        >
          <Chart
            data={sampleData.slice(0, 3)}
            type="line"
            xKey="category"
            yKey="value"
            height={200}
            showGrid={true}
            showLegend={false}
            showTooltip={true}
          />
        </ChartContainer>
      </div>
    </div>
  );
};
