"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts"
import { cn } from "@/lib/utils"

interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: any[]
  type: 'bar' | 'line' | 'pie' | 'area'
  xKey: string
  yKey: string
  title?: string
  height?: number
  colors?: string[]
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
}

const chartConfig = {
  colors: {
    chart1: "hsl(var(--chart-1))",
    chart2: "hsl(var(--chart-2))",
    chart3: "hsl(var(--chart-3))",
    chart4: "hsl(var(--chart-4))",
    chart5: "hsl(var(--chart-5))",
  },
}

export function Chart({
  data,
  type,
  xKey,
  yKey,
  title,
  height = 300,
  colors = [chartConfig.colors.chart1, chartConfig.colors.chart2, chartConfig.colors.chart3],
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  className,
  ...props
}: ChartProps) {
  // Validate data
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error('Chart: Invalid or empty data provided:', data);
    return (
      <div className={cn("w-full flex items-center justify-center", className)} style={{ height }}>
        <div className="text-center text-muted-foreground">
          <p>No data available for chart</p>
          <p className="text-sm">Data: {JSON.stringify(data)}</p>
        </div>
      </div>
    );
  }

  // Validate keys exist in data
  const firstRow = data[0];
  if (!firstRow || typeof firstRow !== 'object') {
    console.error('Chart: Invalid data structure:', firstRow);
    return (
      <div className={cn("w-full flex items-center justify-center", className)} style={{ height }}>
        <div className="text-center text-muted-foreground">
          <p>Invalid data structure</p>
          <p className="text-sm">First row: {JSON.stringify(firstRow)}</p>
        </div>
      </div>
    );
  }

  if (!(xKey in firstRow) || !(yKey in firstRow)) {
    console.error('Chart: Missing required keys:', { xKey, yKey, availableKeys: Object.keys(firstRow) });
    return (
      <div className={cn("w-full flex items-center justify-center", className)} style={{ height }}>
        <div className="text-center text-muted-foreground">
          <p>Missing required data fields</p>
          <p className="text-sm">Required: {xKey}, {yKey}</p>
          <p className="text-sm">Available: {Object.keys(firstRow).join(', ')}</p>
        </div>
      </div>
    );
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xKey} />
              <YAxis />
              {showTooltip && <Tooltip />}
              {showLegend && <Legend />}
              <Bar dataKey={yKey} fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        )
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xKey} />
              <YAxis />
              {showTooltip && <Tooltip />}
              {showLegend && <Legend />}
              <Line type="monotone" dataKey={yKey} stroke={colors[0]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              {showTooltip && <Tooltip />}
              {showLegend && <Legend />}
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill={colors[0]}
                dataKey={yKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xKey} />
              <YAxis />
              {showTooltip && <Tooltip />}
              {showLegend && <Legend />}
              <Area type="monotone" dataKey={yKey} stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        )
      
      default:
        return null
    }
  }

  return (
    <div className={cn("w-full", className)} {...props}>
      {title && (
        <h3 className="text-lg font-semibold text-center mb-4 text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      )}
      {renderChart()}
    </div>
  )
}

// Multi-series chart component
interface MultiSeriesChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: any[]
  type: 'bar' | 'line' | 'area'
  xKey: string
  series: Array<{ key: string; label: string; color?: string }>
  title?: string
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
}

export function MultiSeriesChart({
  data,
  type,
  xKey,
  series,
  title,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  className,
  ...props
}: MultiSeriesChartProps) {
  const defaultColors = [chartConfig.colors.chart1, chartConfig.colors.chart2, chartConfig.colors.chart3, chartConfig.colors.chart4, chartConfig.colors.chart5]
  
  const renderMultiSeriesChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xKey} />
              <YAxis />
              {showTooltip && <Tooltip />}
              {showLegend && <Legend />}
              {series.map((s, index) => (
                <Bar 
                  key={s.key} 
                  dataKey={s.key} 
                  fill={s.color || defaultColors[index % defaultColors.length]} 
                  name={s.label}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xKey} />
              <YAxis />
              {showTooltip && <Tooltip />}
              {showLegend && <Legend />}
              {series.map((s, index) => (
                <Line 
                  key={s.key} 
                  type="monotone" 
                  dataKey={s.key} 
                  stroke={s.color || defaultColors[index % defaultColors.length]} 
                  strokeWidth={2}
                  name={s.label}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xKey} />
              <YAxis />
              {showTooltip && <Tooltip />}
              {showLegend && <Legend />}
              {series.map((s, index) => (
                <Area 
                  key={s.key} 
                  type="monotone" 
                  dataKey={s.key} 
                  stroke={s.color || defaultColors[index % defaultColors.length]} 
                  fill={s.color || defaultColors[index % defaultColors.length]} 
                  fillOpacity={0.3}
                  name={s.label}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )
      
      default:
        return null
    }
  }

  return (
    <div className={cn("w-full", className)} {...props}>
      {title && (
        <h3 className="text-lg font-semibold text-center mb-4 text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      )}
      {renderMultiSeriesChart()}
    </div>
  )
}

// Metric card component for displaying key metrics
interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: React.ReactNode
}

export function MetricCard({ title, value, change, changeType = 'neutral', icon, className, ...props }: MetricCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 dark:text-green-400'
      case 'negative':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive':
        return '↗'
      case 'negative':
        return '↘'
      default:
        return '→'
    }
  }

  return (
    <div className={cn("p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700", className)} {...props}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {change && (
            <p className={cn("text-sm font-medium flex items-center gap-1", getChangeColor())}>
              <span>{getChangeIcon()}</span>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

// Chart container with responsive design
interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function ChartContainer({ children, title, description, className, ...props }: ChartContainerProps) {
  return (
    <div className={cn("bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6", className)} {...props}>
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>}
          {description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
