// Test file to demonstrate the data transformer functionality
import { 
  transformCsvToCellDocs, 
  createCellSearchText, 
  groupCellsByRow, 
  groupCellsByColumn,
  getHeaders,
  getDataCells,
  createSheetSummary 
} from './vectorDB';

// Sample CSV data for testing
const sampleCSVData = [
  ['Name', 'Age', 'City', 'Salary'],
  ['John Doe', '30', 'New York', '75000'],
  ['Jane Smith', '25', 'Los Angeles', '65000'],
  ['Bob Johnson', '35', 'Chicago', '85000'],
  ['Alice Brown', '28', 'Boston', '70000']
];

console.log('=== CSV Data Transformer Test ===\n');

// 1. Transform CSV to cell documents
console.log('1. Transforming CSV to cell documents:');
const cellDocs = transformCsvToCellDocs(sampleCSVData, 'Employee Data', 'sheet-1');
console.log(`Generated ${cellDocs.length} cell documents\n`);

// 2. Show sample cell documents
console.log('2. Sample cell documents:');
cellDocs.slice(0, 6).forEach(cell => {
  console.log(`- ${cell.cellId}: "${cell.value}" (${cell.dataType})`);
});
console.log('...\n');

// 3. Show search text for a specific cell
console.log('3. Search text for cell B2 (Age: 30):');
const cellB2 = cellDocs.find(cell => cell.cellId === 'B2');
if (cellB2) {
  console.log(createCellSearchText(cellB2));
}
console.log('\n');

// 4. Group cells by row
console.log('4. Grouping cells by row:');
const cellsByRow = groupCellsByRow(cellDocs);
Object.keys(cellsByRow).slice(0, 3).forEach(rowNum => {
  console.log(`Row ${rowNum}: ${cellsByRow[parseInt(rowNum)].map(cell => `${cell.cellId}="${cell.value}"`).join(', ')}`);
});
console.log('...\n');

// 5. Group cells by column
console.log('5. Grouping cells by column:');
const cellsByColumn = groupCellsByColumn(cellDocs);
Object.keys(cellsByColumn).forEach(col => {
  console.log(`Column ${col}: ${cellsByColumn[col].map(cell => `${cell.cellId}="${cell.value}"`).join(', ')}`);
});
console.log('\n');

// 6. Get headers and data cells
console.log('6. Headers vs Data cells:');
const headers = getHeaders(cellDocs);
const dataCells = getDataCells(cellDocs);
console.log(`Headers (${headers.length}): ${headers.map(h => h.value).join(', ')}`);
console.log(`Data cells (${dataCells.length}): ${dataCells.slice(0, 5).map(c => c.value).join(', ')}...`);
console.log('\n');

// 7. Create sheet summary
console.log('7. Sheet summary:');
const summary = createSheetSummary(cellDocs);
console.log(JSON.stringify(summary, null, 2));

console.log('\n=== Test Complete ===');

// Export for use in other files
export { sampleCSVData, cellDocs }; 