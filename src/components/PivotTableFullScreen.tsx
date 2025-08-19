import React, { useState, useMemo } from 'react';
import { ArrowLeft, Save, Download, BarChart3, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PivotField, PivotZone, PivotTable as PivotTableType, SheetData } from '@/types/spreadsheet';
import { PivotFieldSelector } from './PivotFieldSelector';
import { PivotTableOutput } from './PivotTableOutput';

interface PivotTableFullScreenProps {
  sheet: SheetData;
  onBackToSheet: () => void;
  onSavePivot: (pivotTable: PivotTableType) => void;
  onExport: () => void;
  onGenerateChart: (type: 'bar' | 'line' | 'pie' | 'area') => void;
}

export const PivotTableFullScreen: React.FC<PivotTableFullScreenProps> = ({
  sheet,
  onBackToSheet,
  onSavePivot,
  onExport,
  onGenerateChart
}) => {
  const [pivotTable, setPivotTable] = useState<PivotTableType>({
    id: 'pivot-fullscreen',
    name: 'Full Screen Pivot',
    zones: [
      { type: 'rows', fields: [] },
      { type: 'columns', fields: [] },
      { type: 'values', fields: [] },
      { type: 'filters', fields: [] }
    ],
    data: [],
    headers: [],
    isVisible: true
  });

  const [showChartOverlay, setShowChartOverlay] = useState(false);

  // Extract available fields from sheet data
  const availableFields = useMemo(() => {
    const fields: PivotField[] = [];
    const maxCols = Math.min(26, sheet.colCount);
    
    for (let i = 0; i < maxCols; i++) {
      const column = String.fromCharCode(65 + i);
      const firstCell = sheet.cells[`${column}1`];
      
      if (firstCell) {
        const sampleValues = [];
        for (let row = 2; row <= Math.min(6, sheet.rowCount); row++) {
          const cell = sheet.cells[`${column}${row}`];
          if (cell?.value !== undefined) {
            sampleValues.push(cell.value);
          }
        }
        
        const type = determineFieldType(sampleValues);
        fields.push({
          id: `field-${column}`,
          name: firstCell.value?.toString() || `Column ${column}`,
          type,
          column
        });
      }
    }
    
    return fields;
  }, [sheet]);

  const determineFieldType = (values: any[]): 'text' | 'number' | 'date' => {
    if (values.length === 0) return 'text';
    
    const numericCount = values.filter(v => typeof v === 'number' || !isNaN(Number(v))).length;
    const dateCount = values.filter(v => {
      if (typeof v === 'string') {
        const date = new Date(v);
        return !isNaN(date.getTime());
      }
      return false;
    }).length;
    
    if (numericCount > values.length * 0.7) return 'number';
    if (dateCount > values.length * 0.7) return 'date';
    return 'text';
  };

  const handleFieldDrop = (field: PivotField, zoneType: 'rows' | 'columns' | 'values' | 'filters') => {
    setPivotTable(prev => {
      const newZones = prev.zones.map(zone => {
        if (zone.type === zoneType) {
          const exists = zone.fields.some(f => f.id === field.id);
          if (!exists) {
            return { ...zone, fields: [...zone.fields, field] };
          }
        }
        return zone;
      });
      
      return { ...prev, zones: newZones };
    });
  };

  const handleFieldRemove = (fieldId: string, zoneType: 'rows' | 'columns' | 'values' | 'filters') => {
    setPivotTable(prev => {
      const newZones = prev.zones.map(zone => {
        if (zone.type === zoneType) {
          return { ...zone, fields: zone.fields.filter(f => f.id !== fieldId) };
        }
        return zone;
      });
      
      return { ...prev, zones: newZones };
    });
  };

  const generatePivotData = () => {
    const rowFields = pivotTable.zones.find(z => z.type === 'rows')?.fields || [];
    const colFields = pivotTable.zones.find(z => z.type === 'columns')?.fields || [];
    const valueFields = pivotTable.zones.find(z => z.type === 'values')?.fields || [];
    
    if (rowFields.length === 0 || valueFields.length === 0) {
      return { data: [], headers: [] };
    }

    const rowValues = getUniqueValues(rowFields[0]);
    const colValues = colFields.length > 0 ? getUniqueValues(colFields[0]) : ['Total'];
    
    const headers = ['Row', ...colValues];
    
    const data = rowValues.map(rowValue => {
      const row = [rowValue];
      colValues.forEach(colValue => {
        if (colValue === 'Total') {
          const total = calculateRowTotal(rowValue, rowFields[0], valueFields[0]);
          row.push(total);
        } else {
          const value = calculateCellValue(rowValue, colValue, rowFields[0], colFields[0], valueFields[0]);
          row.push(value);
        }
      });
      return row;
    });
    
    if (colValues.length > 1) {
      const totalsRow = ['Total'];
      colValues.forEach(colValue => {
        if (colValue === 'Total') {
          const grandTotal = data.reduce((sum, row) => sum + (row[row.length - 1] || 0), 0);
          totalsRow.push(grandTotal);
        } else {
          const colTotal = data.reduce((sum, row) => {
            const colIndex = colValues.indexOf(colValue) + 1;
            return sum + (row[colIndex] || 0);
          }, 0);
          totalsRow.push(colTotal);
        }
      });
      data.push(totalsRow);
    }
    
    return { data, headers };
  };

  const getUniqueValues = (field: PivotField): any[] => {
    const values = new Set();
    for (let row = 2; row <= sheet.rowCount; row++) {
      const cell = sheet.cells[`${field.column}${row}`];
      if (cell?.value !== undefined) {
        values.add(cell.value);
      }
    }
    return Array.from(values);
  };

  const calculateRowTotal = (rowValue: any, rowField: PivotField, valueField: PivotField): number => {
    let total = 0;
    let count = 0;
    
    for (let row = 2; row <= sheet.rowCount; row++) {
      const rowCell = sheet.cells[`${rowField.column}${row}`];
      const valueCell = sheet.cells[`${valueField.column}${row}`];
      
      if (rowCell?.value === rowValue && valueCell?.value !== undefined) {
        const numValue = Number(valueCell.value);
        if (!isNaN(numValue)) {
          total += numValue;
          count++;
        }
      }
    }
    
    return count > 0 ? total : 0;
  };

  const calculateCellValue = (
    rowValue: any, 
    colValue: any, 
    rowField: PivotField, 
    colField: PivotField, 
    valueField: PivotField
  ): number => {
    let total = 0;
    let count = 0;
    
    for (let row = 2; row <= sheet.rowCount; row++) {
      const rowCell = sheet.cells[`${rowField.column}${row}`];
      const colCell = sheet.cells[`${colField.column}${row}`];
      const valueCell = sheet.cells[`${valueField.column}${row}`];
      
      if (rowCell?.value === rowValue && 
          colCell?.value === colValue && 
          valueCell?.value !== undefined) {
        const numValue = Number(valueCell.value);
        if (!isNaN(numValue)) {
          total += numValue;
          count++;
        }
      }
    }
    
    return count > 0 ? total : 0;
  };

  const pivotData = useMemo(() => generatePivotData(), [pivotTable, sheet]);

  const handleSavePivot = () => {
    onSavePivot(pivotTable);
  };

  const handleToggleChartOverlay = () => {
    setShowChartOverlay(!showChartOverlay);
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBackToSheet}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sheet
          </Button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Pivot Table Mode</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleToggleChartOverlay}>
            {showChartOverlay ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showChartOverlay ? 'Hide Chart' : 'Show Chart'}
          </Button>
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleSavePivot}>
            <Save className="h-4 w-4 mr-2" />
            Save Pivot
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Field Selector */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Field Configuration</h2>
            <ScrollArea className="h-full">
              <PivotFieldSelector
                availableFields={availableFields}
                zones={pivotTable.zones}
                onFieldDrop={handleFieldDrop}
                onFieldRemove={handleFieldRemove}
              />
            </ScrollArea>
          </div>
        </div>

        {/* Right Side - Pivot Table Output */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full">
            <PivotTableOutput
              data={pivotData.data}
              headers={pivotData.headers}
            />
          </div>
        </div>

        {/* Chart Overlay */}
        {showChartOverlay && (
          <div className="absolute inset-0 bg-white dark:bg-gray-900 z-10 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Chart Overlay</h3>
              <p className="text-gray-500 mb-4">Chart visualization would appear here</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => onGenerateChart('bar')}>Bar Chart</Button>
                <Button onClick={() => onGenerateChart('line')}>Line Chart</Button>
                <Button onClick={() => onGenerateChart('pie')}>Pie Chart</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
