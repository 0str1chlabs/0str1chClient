import React, { useState, useEffect } from 'react';
import { X, Minus, Maximize2, Minimize2, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Chart } from '@/types/spreadsheet';

interface ChartBlockProps {
  chart: Chart;
  onUpdate: (chartId: string, updates: Partial<Chart>) => void;
  onRemove: (chartId: string) => void;
  position?: { x: number; y: number };
  onPositionChange?: (chartId: string, position: { x: number; y: number }) => void;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#ff0000'];

export const ChartBlock = ({ chart, onUpdate, onRemove, position, onPositionChange }: ChartBlockProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleCardMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - (position?.x || 0),
      y: e.clientY - (position?.y || 0)
    });
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && onPositionChange) {
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      onPositionChange(chart.id, newPosition);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.userSelect = '';
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const renderChart = () => {
    const commonProps = {
      data: chart.data,
      width: '100%',
      height: chart.minimized ? 150 : isExpanded ? 500 : 300,
    };

    switch (chart.type) {
      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer {...commonProps}>
            <PieChart>
              <Pie
                data={chart.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={chart.minimized ? 60 : 80}
                fill="#8884d8"
                dataKey="value"
              >
                {chart.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <Card 
      className={`mb-4 transition-all duration-200 shadow-lg rounded-xl border-2 ${
        chart.minimized ? 'h-auto' : ''
      } ${isDragging ? 'shadow-2xl scale-105 opacity-80' : ''}`}
      style={{
        position: 'absolute',
        left: position?.x || 0,
        top: position?.y || 0,
        width: isExpanded ? '600px' : '400px',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 100 : 10,
      }}
      onMouseDown={handleCardMouseDown}
    >
      <CardHeader className="cursor-grab select-none">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Move 
              size={16} 
              className="cursor-grab" 
            />
            {chart.title}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onUpdate(chart.id, { minimized: !chart.minimized })}
              className="h-6 w-6"
            >
              {chart.minimized ? <Maximize2 size={12} /> : <Minus size={12} />}
            </Button>
            {!chart.minimized && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6"
              >
                {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(chart.id)}
              className="h-6 w-6 hover:bg-destructive/20"
            >
              <X size={12} />
            </Button>
          </div>
        </div>
      </CardHeader>
      {!chart.minimized && (
        <CardContent className="pt-4">
          {renderChart()}
        </CardContent>
      )}
    </Card>
  );
};
