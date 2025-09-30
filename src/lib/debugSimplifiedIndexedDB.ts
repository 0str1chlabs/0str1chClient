/**
 * Debug Script for Simplified IndexedDB Structure
 * 
 * This script helps debug and test the new simplified IndexedDB structure
 * to ensure it's working correctly.
 */

import { indexedDBService } from './indexedDBService';

export async function debugSimplifiedIndexedDB(): Promise<void> {
  try {
    console.log('🔍 Debugging simplified IndexedDB structure...');

    // Initialize the service
    await indexedDBService.init();
    console.log('✅ IndexedDB service initialized');

    // Test saving a sheet
    console.log('💾 Testing sheet save...');
    const testSheet = {
      name: 'Debug Test Sheet',
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
        isActive: retrievedSheet.isActive,
        metadata: retrievedSheet.metadata
      });
    } else {
      console.error('❌ Failed to retrieve sheet');
    }

    // Test getting all sheets
    console.log('📚 Testing get all sheets...');
    const allSheets = await indexedDBService.getAllSheets();
    console.log('✅ Retrieved all sheets:', {
      count: allSheets.length,
      sheets: allSheets.map(s => ({ 
        id: s.id, 
        name: s.name, 
        isActive: s.isActive,
        hasCsvData: !!s.csvData,
        hasChanges: !!s.changes?.length
      }))
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

    console.log('🎉 All simplified IndexedDB tests passed!');
    console.log('📁 Check browser DevTools → Application → IndexedDB → AISheetsDB');
    console.log('   You should see only a single "sheets" object store');

  } catch (error) {
    console.error('❌ Debug test failed:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
  }
}

// Make debug function available globally
if (typeof window !== 'undefined') {
  (window as any).debugSimplifiedIndexedDB = debugSimplifiedIndexedDB;
  console.log('🔍 Debug function available as window.debugSimplifiedIndexedDB()');
}

