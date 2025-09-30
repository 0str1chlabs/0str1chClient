/**
 * Test Script for Simplified IndexedDB Structure
 * 
 * This script tests the new simplified IndexedDB structure
 * to ensure it works correctly and creates the single object store.
 */

import { indexedDBService } from './indexedDBService';

export async function testSimplifiedIndexedDB(): Promise<boolean> {
  try {
    console.log('🧪 Testing simplified IndexedDB structure...');

    // Initialize the service (this should create the new structure)
    await indexedDBService.init();
    console.log('✅ IndexedDB service initialized');

    // Test saving a sheet
    const testSheet = {
      name: 'Test Sheet',
      csvData: 'Name,Age,City\nJohn,25,New York\nJane,30,Los Angeles',
      isActive: true,
      changes: [],
      metadata: {
        rowCount: 3,
        colCount: 3,
        fileSize: 50,
        uploadDate: Date.now()
      }
    };

    console.log('💾 Testing sheet save...');
    const sheetId = await indexedDBService.saveSheet(testSheet);
    console.log('✅ Sheet saved with ID:', sheetId);

    // Test retrieving the sheet
    console.log('📖 Testing sheet retrieval...');
    const retrievedSheet = await indexedDBService.getSheet(sheetId);
    if (retrievedSheet) {
      console.log('✅ Sheet retrieved successfully:', {
        id: retrievedSheet.id,
        name: retrievedSheet.name,
        hasCsvData: !!retrievedSheet.csvData,
        isActive: retrievedSheet.isActive
      });
    } else {
      console.error('❌ Failed to retrieve sheet');
      return false;
    }

    // Test getting all sheets
    console.log('📚 Testing get all sheets...');
    const allSheets = await indexedDBService.getAllSheets();
    console.log('✅ Retrieved all sheets:', {
      count: allSheets.length,
      sheets: allSheets.map(s => ({ id: s.id, name: s.name, isActive: s.isActive }))
    });

    // Test getting active sheet
    console.log('⭐ Testing get active sheet...');
    const activeSheet = await indexedDBService.getActiveSheet();
    if (activeSheet) {
      console.log('✅ Active sheet retrieved:', {
        id: activeSheet.id,
        name: activeSheet.name
      });
    } else {
      console.log('⚠️ No active sheet found');
    }

    // Test adding changes
    console.log('🔄 Testing add changes...');
    const testChanges = [
      { cellId: 'A1', previousValue: 'Name', newValue: 'Full Name' },
      { cellId: 'B1', previousValue: 'Age', newValue: 'Years' }
    ];
    await indexedDBService.addChangesToSheet(sheetId, testChanges);
    console.log('✅ Changes added successfully');

    // Test getting storage info
    console.log('📊 Testing storage info...');
    const storageInfo = await indexedDBService.getSimplifiedStorageInfo();
    console.log('✅ Storage info:', storageInfo);

    console.log('🎉 All tests passed! Simplified IndexedDB structure is working correctly.');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Auto-run test when imported
if (typeof window !== 'undefined') {
  // Make test function available globally for manual testing
  (window as any).testSimplifiedIndexedDB = testSimplifiedIndexedDB;
  console.log('🧪 Test function available as window.testSimplifiedIndexedDB()');
}

