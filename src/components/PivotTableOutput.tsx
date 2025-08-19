import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PivotTableOutputProps {
  data: any[][];
  headers: string[];
}

export const PivotTableOutput: React.FC<PivotTableOutputProps> = ({ data, headers }) => {
  if (data.length === 0 || headers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No Pivot Data</div>
          <div className="text-sm">Add fields to Rows and Values to generate a pivot table</div>
        </div>
      </div>
    );
  }

  const isLastRow = (rowIndex: number) => rowIndex === data.length - 1;
  const isLastColumn = (colIndex: number) => colIndex === headers.length - 1;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Pivot Table Output</h3>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header, index) => (
                    <TableHead 
                      key={index}
                      className={`text-sm font-medium ${
                        index === 0 
                          ? 'text-left' 
                          : 'text-right'
                      } ${
                        isLastColumn(index) 
                          ? 'bg-gray-100 dark:bg-gray-800 font-bold' 
                          : ''
                      }`}
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, rowIndex) => (
                  <TableRow 
                    key={rowIndex}
                    className={isLastRow(rowIndex) ? 'bg-gray-50 dark:bg-gray-800 font-bold' : ''}
                  >
                    {row.map((cell, colIndex) => (
                      <TableCell 
                        key={colIndex}
                        className={`text-sm ${
                          colIndex === 0 
                            ? 'text-left font-medium' 
                            : 'text-right'
                        } ${
                          isLastRow(rowIndex) || isLastColumn(colIndex)
                            ? 'font-bold'
                            : ''
                        }`}
                      >
                        {typeof cell === 'number' 
                          ? cell.toLocaleString() 
                          : cell?.toString() || ''
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
