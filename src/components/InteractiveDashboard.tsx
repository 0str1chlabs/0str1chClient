import React, { useState, useRef, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Move, 
  Maximize2, 
  Minimize2, 
  Settings, 
  RefreshCw, 
  Plus,
  X,
  BarChart3,
  TrendingUp,
  PieChart,
  Activity
} from 'lucide-react';
import { Chart } from '@/components/ui/chart';

interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'filter';
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: any;
  data?: any;
  isMinimized: boolean;
  isMaximized: boolean;
}

interface DashboardFilter {
  id: string;
  field: string;
  type: 'range' | 'select' | 'date';
  value: any;
  label: string;
}

interface InteractiveDashboardProps {
  charts: any[];
  dataRanges: any[];
  filters: DashboardFilter[];
  onFilterChange: (filters: DashboardFilter[]) => void;
  className?: string;
}

export const InteractiveDashboard: React.FC<InteractiveDashboardProps> = ({
  charts,
  dataRanges,
  filters,
  onFilterChange,
  className = ''
}) => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [newWidgetType, setNewWidgetType] = useState<'chart' | 'metric' | 'table'>('chart');
  const [newWidgetTitle, setNewWidgetTitle] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize widgets from charts
  React.useEffect(() => {
    const initialWidgets: DashboardWidget[] = charts.map((chart, index) => ({
      id: `chart-${chart.id}`,
      type: 'chart',
      title: chart.name,
      position: { x: (index % 3) * 350, y: Math.floor(index / 3) * 300 },
      size: { width: 350, height: 300 },
      config: chart.config,
      data: chart.data,
      isMinimized: false,
      isMaximized: false
    }));

    // Add metric widgets for data ranges
    const metricWidgets: DashboardWidget[] = dataRanges.slice(0, 4).map((range, index) => ({
      id: `metric-${range.id}`,
      type: 'metric',
      title: `${range.name} Summary`,
      position: { x: (index % 4) * 200, y: 600 },
      size: { width: 200, height: 150 },
      config: { range },
      data: range.summary,
      isMinimized: false,
      isMaximized: false
    }));

    setWidgets([...initialWidgets, ...metricWidgets]);
  }, [charts, dataRanges]);

  const handleWidgetMove = useCallback((id: string, x: number, y: number) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === id ? { ...widget, position: { x, y } } : widget
    ));
  }, []);

  const handleWidgetResize = useCallback((id: string, width: number, height: number) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === id ? { ...widget, size: { width, height } } : widget
    ));
  }, []);

  const toggleWidgetMinimize = useCallback((id: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === id ? { ...widget, isMinimized: !widget.isMinimized } : widget
    ));
  }, []);

  const toggleWidgetMaximize = useCallback((id: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === id ? { ...widget, isMaximized: !widget.isMaximized } : widget
    ));
  }, []);

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => prev.filter(widget => widget.id !== id));
  }, []);

  const addWidget = useCallback(() => {
    if (!newWidgetTitle.trim()) return;

    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type: newWidgetType,
      title: newWidgetTitle,
      position: { x: 50, y: 50 },
      size: { width: 300, height: 250 },
      config: {},
      isMinimized: false,
      isMaximized: false
    };

    setWidgets(prev => [...prev, newWidget]);
    setNewWidgetTitle('');
    setNewWidgetType('chart');
    setIsAddingWidget(false);
  }, [newWidgetTitle, newWidgetType]);

  const renderWidgetContent = (widget: DashboardWidget) => {
    if (widget.isMinimized) {
      return (
        <div className="flex items-center justify-center h-full text-sm text-gray-500">
          {widget.title}
        </div>
      );
    }

    switch (widget.type) {
      case 'chart':
        const chart = charts.find(c => c.id === widget.config.chartId);
        if (chart) {
          return (
            <div className="h-full">
              <Chart
                data={chart.data || []}
                type={chart.type === "heatmap" || chart.type === "scatter" ? "bar" : chart.type}
                xKey="category"
                yKey="value"
                height={widget.size.height - 80}
                showGrid={true}
                showLegend={true}
                showTooltip={true}
              />
            </div>
          );
        }
        return <div className="flex items-center justify-center h-full text-sm text-gray-500">Chart not found</div>;

      case 'metric':
        const metricData = widget.data;
        if (metricData) {
          return (
            <div className="flex flex-col items-center justify-center h-full space-y-2">
              <div className="text-3xl font-bold text-blue-600">
                {metricData.count || metricData.sum || 'N/A'}
              </div>
              <div className="text-sm text-gray-600 text-center">
                {widget.title}
              </div>
              {metricData.average && (
                <div className="text-xs text-gray-500">
                  Avg: {metricData.average.toFixed(2)}
                </div>
              )}
            </div>
          );
        }
        return <div className="flex items-center justify-center h-full text-sm text-gray-500">No data</div>;

      case 'table':
        return (
          <div className="h-full overflow-auto">
            <div className="text-sm text-gray-500 text-center py-8">
              Table widget - Data display coming soon
            </div>
          </div>
        );

      default:
        return <div className="flex items-center justify-center h-full text-sm text-gray-500">Unknown widget type</div>;
    }
  };

  const renderWidgetIcon = (type: string) => {
    switch (type) {
      case 'chart':
        return <BarChart3 className="h-4 w-4" />;
      case 'metric':
        return <TrendingUp className="h-4 w-4" />;
      case 'table':
        return <Activity className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  return (
    <div className={`relative w-full h-full bg-gray-50 dark:bg-gray-900 ${className}`} ref={containerRef}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Interactive Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {widgets.length} widgets • Drag to reposition • Resize to customize
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingWidget(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Widget</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Add Widget Modal */}
      {isAddingWidget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Add New Widget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Widget Type</label>
                <Select value={newWidgetType} onValueChange={(value: any) => setNewWidgetType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chart">Chart</SelectItem>
                    <SelectItem value="metric">Metric</SelectItem>
                    <SelectItem value="table">Table</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Widget Title</label>
                <Input
                  value={newWidgetTitle}
                  onChange={(e) => setNewWidgetTitle(e.target.value)}
                  placeholder="Enter widget title"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={addWidget} className="flex-1">Add Widget</Button>
                <Button variant="outline" onClick={() => setIsAddingWidget(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dashboard Canvas */}
      <div className="relative w-full h-[calc(100vh-200px)] overflow-hidden">
        {widgets.map((widget) => (
          <Rnd
            key={widget.id}
            position={widget.position}
            size={widget.size}
            onDragStop={(e, d) => handleWidgetMove(widget.id, d.x, d.y)}
            onResizeStop={(e, direction, ref, delta, position) => {
              handleWidgetResize(widget.id, ref.offsetWidth, ref.offsetHeight);
              handleWidgetMove(widget.id, position.x, position.y);
            }}
            minWidth={200}
            minHeight={150}
            maxWidth={800}
            maxHeight={600}
            bounds="parent"
            className="z-10"
          >
            <Card className={`w-full h-full ${widget.isMaximized ? 'fixed inset-0 z-50' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {renderWidgetIcon(widget.type)}
                    <CardTitle className="text-sm">{widget.title}</CardTitle>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleWidgetMinimize(widget.id)}
                      className="h-6 w-6 p-0"
                    >
                      {widget.isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleWidgetMaximize(widget.id)}
                      className="h-6 w-6 p-0"
                    >
                      {widget.isMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWidget(widget.id)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 flex-1">
                {renderWidgetContent(widget)}
              </CardContent>
            </Card>
          </Rnd>
        ))}
      </div>

      {/* Filters Panel */}
      {filters.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium mb-3">Dashboard Filters</h3>
          <div className="space-y-2">
            {filters.map((filter) => (
              <div key={filter.id} className="flex items-center space-x-2">
                <label className="text-xs text-gray-600 dark:text-gray-400 min-w-[60px]">
                  {filter.label}:
                </label>
                <Input
                  value={filter.value}
                  onChange={(e) => {
                    const newFilters = filters.map(f => 
                      f.id === filter.id ? { ...f, value: e.target.value } : f
                    );
                    onFilterChange(newFilters);
                  }}
                  className="h-6 text-xs"
                  placeholder={filter.type}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
