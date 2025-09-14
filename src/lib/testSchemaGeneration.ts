/**
 * Test script for AI Schema Generation
 */

import { generateAISchema, generateDuckDBSQL, cleanDataForSchema } from './aiSchemaGenerator';

// Test data with various data types
const testData = [
  ['Name', 'Age', 'Salary', 'IsActive', 'HireDate', 'Department'],
  ['John Doe', '25', '$50000', 'true', '2023-01-15', 'Engineering'],
  ['Jane Smith', '30', '$75000', 'false', '2022-06-01', 'Marketing'],
  ['Bob Johnson', '35', '$60000', 'true', '2021-03-10', 'Sales'],
  ['Alice Brown', '28', '$55000', 'true', '2023-02-20', 'Engineering'],
  ['Charlie Wilson', '42', '$80000', 'false', '2020-11-05', 'Management']
];

export async function testSchemaGeneration() {
  console.log('🧪 Testing AI Schema Generation...');
  
  try {
    // Generate schema
    const schema = await generateAISchema('test_table', testData, 5);
    console.log('✅ Schema generated:', JSON.stringify(schema, null, 2));
    
    // Generate DuckDB SQL
    const sql = generateDuckDBSQL(schema);
    console.log('✅ DuckDB SQL:', sql);
    
    // Test data cleaning
    const cleanedData = cleanDataForSchema(testData, schema);
    console.log('✅ Cleaned data:', cleanedData);
    
    // Test display values
    console.log('✅ Display values:');
    schema.columns.forEach(column => {
      const sampleValue = column.sampleValues[0];
      if (sampleValue !== undefined) {
        const displayValue = getDisplayValue(sampleValue, column);
        console.log(`  ${column.name}: ${sampleValue} → ${displayValue}`);
      }
    });
    
    return { success: true, schema, sql, cleanedData };
  } catch (error) {
    console.error('❌ Schema generation failed:', error);
    return { success: false, error };
  }
}

function getDisplayValue(value: any, schema: any): string {
  if (value === null || value === undefined) return '';

  switch (schema.type) {
    case 'INTEGER':
    case 'DOUBLE':
      if (schema.displayFormat) {
        return `${schema.displayFormat}${value}`;
      }
      return String(value);

    case 'DATE':
      return new Date(value).toLocaleDateString();

    case 'BOOLEAN':
      return value ? 'Yes' : 'No';

    case 'VARCHAR':
    default:
      return String(value);
  }
}

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  (window as any).testSchemaGeneration = testSchemaGeneration;
}
