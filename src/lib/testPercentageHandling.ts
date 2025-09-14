/**
 * Test script for percentage handling in smart statistics
 */

import { calculateSmartStatistics } from './smartStatistics';

// Test data with percentage values
const testData = [
  ['Name', 'Salary', 'Bonus %', 'Performance %'],
  ['John Doe', '$50000', '15%', '85%'],
  ['Jane Smith', '$75000', '20%', '92%'],
  ['Bob Johnson', '$60000', '12%', '78%'],
  ['Alice Brown', '$55000', '18%', '88%']
];

// Mock sheet data
const mockSheet = {
  cells: {
    'A1': { value: 'Name', colHeader: 'Name' },
    'B1': { value: 'Salary', colHeader: 'Salary' },
    'C1': { value: 'Bonus %', colHeader: 'Bonus %' },
    'D1': { value: 'Performance %', colHeader: 'Performance %' },
    'A2': { value: 'John Doe', colHeader: 'Name' },
    'B2': { value: '$50000', colHeader: 'Salary' },
    'C2': { value: '15%', colHeader: 'Bonus %' },
    'D2': { value: '85%', colHeader: 'Performance %' },
    'A3': { value: 'Jane Smith', colHeader: 'Name' },
    'B3': { value: '$75000', colHeader: 'Salary' },
    'C3': { value: '20%', colHeader: 'Bonus %' },
    'D3': { value: '92%', colHeader: 'Performance %' },
    'A4': { value: 'Bob Johnson', colHeader: 'Name' },
    'B4': { value: '$60000', colHeader: 'Salary' },
    'C4': { value: '12%', colHeader: 'Bonus %' },
    'D4': { value: '78%', colHeader: 'Performance %' },
    'A5': { value: 'Alice Brown', colHeader: 'Name' },
    'B5': { value: '$55000', colHeader: 'Salary' },
    'C5': { value: '18%', colHeader: 'Bonus %' },
    'D5': { value: '88%', colHeader: 'Performance %' }
  }
};

// Mock AI schema
const mockAISchema = {
  columns: [
    { name: 'Name', type: 'VARCHAR', displayFormat: undefined },
    { name: 'Salary', type: 'INTEGER', displayFormat: '$' },
    { name: 'Bonus %', type: 'INTEGER', displayFormat: '%' },
    { name: 'Performance %', type: 'INTEGER', displayFormat: '%' }
  ]
};

export async function testPercentageHandling() {
  console.log('🧪 Testing Percentage Handling in Smart Statistics...');
  
  try {
    // Test salary column (with $ prefix)
    console.log('\n📊 Testing Salary Column:');
    const salaryStats = calculateSmartStatistics(['B2', 'B3', 'B4', 'B5'], mockSheet, mockAISchema);
    console.log('Salary Stats:', salaryStats);
    console.log('Expected: Sum should be $240000, Avg should be $60000');
    
    // Test bonus percentage column
    console.log('\n📊 Testing Bonus % Column:');
    const bonusStats = calculateSmartStatistics(['C2', 'C3', 'C4', 'C5'], mockSheet, mockAISchema);
    console.log('Bonus Stats:', bonusStats);
    console.log('Expected: Sum should be 65%, Avg should be 16.25%');
    
    // Test performance percentage column
    console.log('\n📊 Testing Performance % Column:');
    const performanceStats = calculateSmartStatistics(['D2', 'D3', 'D4', 'D5'], mockSheet, mockAISchema);
    console.log('Performance Stats:', performanceStats);
    console.log('Expected: Sum should be 343%, Avg should be 85.75%');
    
    // Test mixed selection
    console.log('\n📊 Testing Mixed Selection:');
    const mixedStats = calculateSmartStatistics(['B2', 'C2', 'D2'], mockSheet, mockAISchema);
    console.log('Mixed Stats:', mixedStats);
    console.log('Expected: Should show count only (not all numeric)');
    
    return { 
      success: true, 
      salaryStats, 
      bonusStats, 
      performanceStats, 
      mixedStats 
    };
  } catch (error) {
    console.error('❌ Percentage handling test failed:', error);
    return { success: false, error };
  }
}

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  (window as any).testPercentageHandling = testPercentageHandling;
}
