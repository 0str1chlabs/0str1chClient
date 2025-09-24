/**
 * Test script for smart statistics with occurrences
 */

import { calculateSmartStatistics } from './smartStatistics';

// Test data with similar values
const testSheet = {
  cells: {
    'A1': { value: 'Sales' },
    'A2': { value: 'Marketing' },
    'A3': { value: 'Sales' },
    'A4': { value: 'HR' },
    'A5': { value: 'Sales' },
    'B1': { value: 'Marketing' },
    'B2': { value: 'Sales' },
    'B3': { value: 'Finance' },
    'B4': { value: 'Marketing' },
    'B5': { value: 'Sales' },
    'C1': { value: 'HR' },
    'C2': { value: 'Sales' },
    'C3': { value: 'Marketing' },
    'C4': { value: 'Sales' },
    'C5': { value: 'HR' }
  }
};

// Test AI schema
const testAiSchema = {
  columns: [
    { name: 'Department', type: 'VARCHAR' as const },
    { name: 'Department2', type: 'VARCHAR' as const },
    { name: 'Department3', type: 'VARCHAR' as const }
  ]
};

// Test function
export function testSmartStatisticsWithOccurrences() {
  console.log('🧪 Testing Smart Statistics with Occurrences...');
  
  // Test 1: Select cells with "Sales" values
  const selectedCells = ['A1', 'A3', 'A5'];
  console.log('📊 Selected cells:', selectedCells);
  
  const stats = calculateSmartStatistics(selectedCells, testSheet, testAiSchema);
  
  if (stats) {
    console.log('✅ Smart Statistics calculated successfully:');
    console.log('  - Count:', stats.count);
    console.log('  - All Numeric:', stats.allNumeric);
    console.log('  - Occurrences:', stats.occurrences?.length || 0);
    
    if (stats.occurrences && stats.occurrences.length > 0) {
      console.log('📈 Occurrences Details:');
      stats.occurrences.forEach((occurrence, index) => {
        console.log(`  ${index + 1}. Value: "${occurrence.value}"`);
        console.log(`     Count: ${occurrence.count}`);
        console.log(`     Cells: [${occurrence.cells.join(', ')}]`);
      });
    }
  } else {
    console.log('❌ Failed to calculate smart statistics');
  }
  
  // Test 2: Select cells with numeric values
  const numericSheet = {
    cells: {
      'A1': { value: 100 },
      'A2': { value: 200 },
      'A3': { value: 100 },
      'A4': { value: 300 },
      'A5': { value: 100 },
      'B1': { value: 200 },
      'B2': { value: 100 },
      'B3': { value: 400 },
      'B4': { value: 200 },
      'B5': { value: 100 }
    }
  };
  
  const numericSchema = {
    columns: [
      { name: 'Amount', type: 'INTEGER' as const },
      { name: 'Amount2', type: 'INTEGER' as const }
    ]
  };
  
  const numericSelectedCells = ['A1', 'A3', 'A5'];
  console.log('\n🧮 Testing with numeric values...');
  console.log('📊 Selected numeric cells:', numericSelectedCells);
  
  const numericStats = calculateSmartStatistics(numericSelectedCells, numericSheet, numericSchema);
  
  if (numericStats) {
    console.log('✅ Numeric Statistics calculated successfully:');
    console.log('  - Sum:', numericStats.sum);
    console.log('  - Average:', numericStats.avg);
    console.log('  - Min:', numericStats.min);
    console.log('  - Max:', numericStats.max);
    console.log('  - Count:', numericStats.count);
    console.log('  - All Numeric:', numericStats.allNumeric);
    console.log('  - Occurrences:', numericStats.occurrences?.length || 0);
    
    if (numericStats.occurrences && numericStats.occurrences.length > 0) {
      console.log('📈 Numeric Occurrences Details:');
      numericStats.occurrences.forEach((occurrence, index) => {
        console.log(`  ${index + 1}. Value: ${occurrence.value}`);
        console.log(`     Count: ${occurrence.count}`);
        console.log(`     Cells: [${occurrence.cells.join(', ')}]`);
      });
    }
  } else {
    console.log('❌ Failed to calculate numeric statistics');
  }
  
  console.log('\n🎉 Test completed!');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testSmartStatisticsWithOccurrences();
}
