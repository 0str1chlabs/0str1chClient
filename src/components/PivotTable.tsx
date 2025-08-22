import React, { useState, useEffect, useMemo } from 'react';
import { X, BarChart3, Download, Settings, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PivotField, PivotZone, PivotTable as PivotTableType, SheetData } from '@/types/spreadsheet';
import { PivotFieldSelector } from './PivotFieldSelector';
import { PivotTableOutput } from './PivotTableOutput';
import { PivotTableModal } from './PivotTableModal';

interface PivotTableProps {
  sheet: SheetData;
  isVisible: boolean;
  onClose: () => void;
  onGenerateChart: (type: 'bar' | 'line' | 'pie' | 'area') => void;
  onExportCSV: () => void;
}

export const PivotTable: React.FC<PivotTableProps> = ({
  sheet,
  isVisible,
  onClose,
  onGenerateChart,
  onExportCSV
}) => {
  const [pivotTable, setPivotTable] = useState<PivotTableType>({
    id: 'pivot-1',
    name: 'Pivot Table',
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

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'ai-suggested' | 'custom'>('ai-suggested');

  // Extract available fields from sheet data
  const availableFields = useMemo(() => {
    const fields: PivotField[] = [];
    const maxCols = Math.min(26, sheet.colCount); // Limit to 26 columns (A-Z)
    
    for (let i = 0; i < maxCols; i++) {
      const column = String.fromCharCode(65 + i); // A, B, C, etc.
      const firstCell = sheet.cells[`${column}1`];
      
      if (firstCell) {
        const sampleValues = [];
        // Get a few sample values to determine type
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
          // Check if field is already in this zone
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
    // This is a simplified pivot table generation
    // In a real implementation, you'd want more sophisticated aggregation logic
    
    const rowFields = pivotTable.zones.find(z => z.type === 'rows')?.fields || [];
    const colFields = pivotTable.zones.find(z => z.type === 'columns')?.fields || [];
    const valueFields = pivotTable.zones.find(z => z.type === 'values')?.fields || [];
    
    if (rowFields.length === 0 || valueFields.length === 0) {
      return { data: [], headers: [] };
    }

    // Get unique values for rows and columns
    const rowValues = getUniqueValues(rowFields[0]);
    const colValues = colFields.length > 0 ? getUniqueValues(colFields[0]) : ['Total'];
    
    // Generate headers
    const headers = ['Row', ...colValues];
    
    // Generate data
    const data = rowValues.map(rowValue => {
      const row = [rowValue];
      colValues.forEach(colValue => {
        if (colValue === 'Total') {
          // Calculate total for this row
          const total = calculateRowTotal(rowValue, rowFields[0], valueFields[0]);
          row.push(total);
        } else {
          // Calculate value for specific row/column combination
          const value = calculateCellValue(rowValue, colValue, rowFields[0], colFields[0], valueFields[0]);
          row.push(value);
        }
      });
      return row;
    });
    
    // Add totals row
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

  const handleExportCSV = () => {
    const csvContent = [
      pivotData.headers.join(','),
      ...pivotData.data.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pivot-table.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    onExportCSV();
  };

  const handleConvertToChart = () => {
    // Convert pivot data to chart format
    const chartData = pivotData.data.slice(0, -1).map((row, index) => ({
      name: row[0],
      value: row[row.length - 1] || 0
    }));
    
    // Generate a bar chart by default
    onGenerateChart('bar');
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="fixed right-0 top-16 w-96 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-lg z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pivot Table</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowModal(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Field Selector */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <PivotFieldSelector
                availableFields={availableFields}
                zones={pivotTable.zones}
                onFieldDrop={handleFieldDrop}
                onFieldRemove={handleFieldRemove}
              />
            </div>
          </ScrollArea>
        </div>

        {/* Pivot Table Output */}
        <div className="flex-1 border-t border-gray-200 dark:border-gray-700">
          <PivotTableOutput
            data={pivotData.data}
            headers={pivotData.headers}
          />
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleExportCSV}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleConvertToChart}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Convert to Chart
            </Button>
          </div>
        </div>
      </div>

      {/* Pivot Table Modal */}
      {showModal && (
        <PivotTableModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          mode={modalMode}
          onModeChange={setModalMode}
          pivotTable={pivotTable}
          onPivotTableChange={setPivotTable}
          availableFields={availableFields}
        />
      )}
    </>
  );
};
