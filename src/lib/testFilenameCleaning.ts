/**
 * Test script to verify filename cleaning logic
 */

export function testFilenameCleaning() {
  const testCases = [
    'user_shashwat1499@gmail.com/pivot-table',
    'user_shashwat1499@gmail.com/Employee Sample Data',
    'user_shashwat1499@gmail.com/SampleCSVFile_2kb',
    'user_shashwat1499@gmail.com/folder/subfolder/file.csv',
    'user_shashwat1499@gmail.com/file.csv.gz',
    'pivot-table', // Already clean
    'Employee Sample Data.csv', // Has extension
  ];

  console.log('🧪 Testing filename cleaning logic...');
  
  testCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}: "${testCase}"`);
    
    let cleanFileName = testCase;
    
    // Remove user prefix patterns (e.g., "user_email@domain.com/")
    const userPrefix = `user_shashwat1499@gmail.com/`;
    if (cleanFileName.startsWith(userPrefix)) {
      cleanFileName = cleanFileName.replace(userPrefix, '');
      console.log(`  After removing user prefix: "${cleanFileName}"`);
    }
    // Also remove any other user prefix patterns
    cleanFileName = cleanFileName.replace(/^user_[^/]+\//, '');
    console.log(`  After regex cleanup: "${cleanFileName}"`);
    
    // Remove any remaining folder paths (keep only the filename)
    const pathParts = cleanFileName.split('/');
    cleanFileName = pathParts[pathParts.length - 1];
    console.log(`  After path cleanup: "${cleanFileName}"`);
    
    // Remove file extensions for display
    cleanFileName = cleanFileName.replace(/\.(csv|gz)$/g, '');
    console.log(`  Final result: "${cleanFileName}"`);
  });
}

// Make test function available globally
if (typeof window !== 'undefined') {
  (window as any).testFilenameCleaning = testFilenameCleaning;
  console.log('🧪 Test function available as window.testFilenameCleaning()');
}

