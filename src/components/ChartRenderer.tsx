import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface ChartSpec {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  title: string;
  x: { field: string; type: 'category' | 'time' | 'numeric' };
  y: { field: string; type: 'numeric'; format: 'number' | 'currency' | 'percentage' };
  color?: string;
  sort?: { field: string; order: 'asc' | 'desc' };
}

interface ChartRendererProps {
  data: any[];
  chartSpec: ChartSpec;
  width?: number;
  height?: number;
  className?: string;
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  data,
  chartSpec,
  width = 600,
  height = 400,
  className = ''
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Initialize chart
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    chartInstance.current = echarts.init(chartRef.current);

    // Generate ECharts option based on chartSpec
    const option = generateEChartsOption(data, chartSpec);
    
    // Set the option and render
    chartInstance.current.setOption(option);

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [data, chartSpec]);

  const generateEChartsOption = (data: any[], spec: ChartSpec) => {
    const { type, title, x, y, color, sort } = spec;

    // Sort data if specified
    let processedData = [...data];
    if (sort) {
      processedData.sort((a, b) => {
        const aVal = a[sort.field];
        const bVal = b[sort.field];
        return sort.order === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    // Format y-axis values
    const formatYAxis = (value: number) => {
      switch (y.format) {
        case 'currency':
          return `$${value.toLocaleString()}`;
        case 'percentage':
          return `${value.toFixed(1)}%`;
        default:
          return value.toLocaleString();
      }
    };

    const baseOption = {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: type === 'pie' ? 'item' : 'axis',
        formatter: (params: any) => {
          if (type === 'pie') {
            return `${params.name}: ${formatYAxis(params.value)}`;
          }
          return `${params[0].name}: ${formatYAxis(params[0].value)}`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      }
    };

    switch (type) {
      case 'bar':
        return {
          ...baseOption,
          xAxis: {
            type: 'category',
            data: processedData.map(item => item[x.field]),
            axisLabel: {
              rotate: 45
            }
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: formatYAxis
            }
          },
          series: [{
            type: 'bar',
            data: processedData.map(item => item[y.field]),
            itemStyle: {
              color: color ? undefined : '#5470c6'
            }
          }]
        };

      case 'line':
        return {
          ...baseOption,
          xAxis: {
            type: 'category',
            data: processedData.map(item => item[x.field])
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: formatYAxis
            }
          },
          series: [{
            type: 'line',
            data: processedData.map(item => item[y.field]),
            smooth: true,
            itemStyle: {
              color: color ? undefined : '#5470c6'
            }
          }]
        };

      case 'pie':
        return {
          ...baseOption,
          series: [{
            type: 'pie',
            radius: '50%',
            data: processedData.map(item => ({
              name: item[x.field],
              value: item[y.field]
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }]
        };

      case 'area':
        return {
          ...baseOption,
          xAxis: {
            type: 'category',
            data: processedData.map(item => item[x.field])
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: formatYAxis
            }
          },
          series: [{
            type: 'line',
            data: processedData.map(item => item[y.field]),
            smooth: true,
            areaStyle: {
              opacity: 0.3
            },
            itemStyle: {
              color: color ? undefined : '#5470c6'
            }
          }]
        };

      case 'scatter':
        return {
          ...baseOption,
          xAxis: {
            type: 'value',
            name: x.field
          },
          yAxis: {
            type: 'value',
            name: y.field,
            axisLabel: {
              formatter: formatYAxis
            }
          },
          series: [{
            type: 'scatter',
            data: processedData.map(item => [item[x.field], item[y.field]]),
            symbolSize: 8,
            itemStyle: {
              color: color ? undefined : '#5470c6'
            }
          }]
        };

      default:
        return baseOption;
    }
  };

  return (
    <div 
      ref={chartRef} 
      style={{ width, height }} 
      className={`chart-renderer ${className}`}
    />
  );
};
