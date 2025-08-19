import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PivotTableModal } from './PivotTableModal';
import { EnhancedPivotTableFullScreen } from './EnhancedPivotTableFullScreen';
import { SheetData } from '@/types/spreadsheet';
import { BarChart3, Maximize2 } from 'lucide-react';

export const PivotTableDemo: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);

  // Sample sheet data for demonstration
  const sampleSheetData: SheetData = useMemo(() => {
    const cells: { [key: string]: { value: string | number } } = {};
    
    // Headers
    cells['A1'] = { value: 'Department' };
    cells['B1'] = { value: 'Employee Name' };
    cells['C1'] = { value: 'Salary' };
    cells['D1'] = { value: 'Years of Experience' };
    cells['E1'] = { value: 'Performance Rating' };
    cells['F1'] = { value: 'Location' };
    cells['G1'] = { value: 'Start Date' };
    cells['H1'] = { value: 'Bonus' };
    
    // Sample data rows - Generic sample data for demonstration
    const categories = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E', 'Category F'];
    const names = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5', 'Item 6', 'Item 7', 'Item 8', 'Item 9', 'Item 10'];
    const values = [100, 85, 120, 95, 150, 110, 75, 130, 90, 105];
    const scores = [3, 2, 4, 1, 5, 3, 2, 4, 6, 3];
    const ratings = [4.2, 3.8, 4.5, 3.5, 4.8, 4.1, 3.9, 4.3, 4.7, 4.0];
    const locations = ['Location A', 'Location B', 'Location C', 'Location D', 'Location E', 'Location F', 'Location G', 'Location H', 'Location I', 'Location J'];
    const dates = ['2020-01-15', '2021-03-20', '2019-11-10', '2022-06-01', '2018-09-15', '2020-12-01', '2021-08-15', '2019-04-20', '2017-12-01', '2020-07-01'];
    const bonuses = [50, 30, 40, 20, 60, 45, 35, 50, 70, 40];
    
    for (let i = 0; i < 10; i++) {
      const row = i + 2;
      cells[`A${row}`] = { value: categories[i % categories.length] };
      cells[`B${row}`] = { value: names[i] };
      cells[`C${row}`] = { value: values[i] };
      cells[`D${row}`] = { value: scores[i] };
      cells[`E${row}`] = { value: ratings[i] };
      cells[`F${row}`] = { value: locations[i] };
      cells[`G${row}`] = { value: dates[i] };
      cells[`H${row}`] = { value: bonuses[i] };
    }
    
    return {
      id: 'demo-sheet',
      name: 'Demo Sheet',
      cells,
      isVisible: true,
      rowCount: 11, // 1 header row + 10 data rows
      colCount: 8   // A through H columns
    };
  }, []);

  const handleGenerateChart = (type: 'bar' | 'line' | 'pie' | 'area') => {
    console.log(`Generating ${type} chart from pivot table`);
    // Chart generation logic would go here
  };

  const handleExportCSV = () => {
    console.log('Exporting pivot table data to CSV');
    // Export logic would go here
  };

  const handleSavePivot = (pivotTable: any) => {
    console.log('Saving pivot table configuration:', pivotTable);
    // Save logic would go here
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Pivot Table Demo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Experience the power of interactive pivot tables with modern UI and smooth animations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Modal Pivot Table
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Open a beautiful animated modal with the pivot table. Perfect for quick analysis while keeping your sheets visible.
              </p>
              <Button 
                onClick={() => setShowModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Open Modal Pivot Table
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Maximize2 className="h-5 w-5 text-green-600" />
                Full Screen Pivot Table
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Immersive full-screen experience with advanced options, perfect for deep data analysis and complex configurations.
              </p>
              <Button 
                onClick={() => setShowFullScreen(true)}
                variant="outline"
                className="w-full"
              >
                Open Full Screen Pivot Table
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Sample Data Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-2 font-medium">Department</th>
                    <th className="text-left p-2 font-medium">Employee</th>
                    <th className="text-left p-2 font-medium">Salary</th>
                    <th className="text-left p-2 font-medium">Experience</th>
                    <th className="text-left p-2 font-medium">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }, (_, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-2">{sampleSheetData.cells[`A${i + 2}`]?.value}</td>
                      <td className="p-2">{sampleSheetData.cells[`B${i + 2}`]?.value}</td>
                      <td className="p-2">${sampleSheetData.cells[`C${i + 2}`]?.value?.toLocaleString()}</td>
                      <td className="p-2">{sampleSheetData.cells[`D${i + 2}`]?.value} years</td>
                      <td className="p-2">{sampleSheetData.cells[`E${i + 2}`]?.value}/5.0</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Showing 5 of {Object.keys(sampleSheetData.cells).length / 8} rows
            </p>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Click on either button above to experience the pivot table functionality</p>
          <p className="mt-1">The modal version keeps your sheets visible while the full-screen version provides maximum workspace</p>
        </div>
      </div>

      {/* Pivot Table Modal */}
      <PivotTableModal
        sheet={sampleSheetData}
        isVisible={showModal}
        onClose={() => setShowModal(false)}
        onGenerateChart={handleGenerateChart}
        onExportCSV={handleExportCSV}
        onSavePivot={handleSavePivot}
      />

      {/* Full Screen Pivot Table */}
      {showFullScreen && (
        <EnhancedPivotTableFullScreen
          sheet={sampleSheetData}
          onBackToSheet={() => setShowFullScreen(false)}
          onSavePivot={handleSavePivot}
          onExport={handleExportCSV}
          onGenerateChart={handleGenerateChart}
        />
      )}
    </div>
  );
};
