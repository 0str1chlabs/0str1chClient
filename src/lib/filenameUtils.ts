/**
 * Utility functions for cleaning and extracting filenames
 */

/**
 * Extracts only the filename from a full path, removing all directory information
 * @param fullPath - The full path including directories
 * @returns Clean filename without any path information
 */
export function extractFilename(fullPath: string): string {
  if (!fullPath) return '';
  
  // Handle both forward and backward slashes
  const pathSeparators = /[/\\]/;
  
  // Split by path separators and get the last part
  const pathParts = fullPath.split(pathSeparators);
  const filename = pathParts[pathParts.length - 1];
  
  return filename;
}

/**
 * Removes user prefix patterns from filenames
 * @param filename - The filename that may contain user prefixes
 * @param userEmail - The user email to create the prefix pattern
 * @returns Filename without user prefixes
 */
export function removeUserPrefix(filename: string, userEmail?: string): string {
  if (!filename) return '';
  
  let cleanFilename = filename;
  
  // Remove specific user prefix if userEmail is provided
  if (userEmail) {
    const userPrefix = `user_${userEmail}/`;
    if (cleanFilename.startsWith(userPrefix)) {
      cleanFilename = cleanFilename.replace(userPrefix, '');
    }
  }
  
  // Remove any user prefix pattern (user_[anything]/)
  cleanFilename = cleanFilename.replace(/^user_[^/]+\//, '');
  
  return cleanFilename;
}

/**
 * Removes file extensions from filenames
 * @param filename - The filename that may have extensions
 * @param extensions - Array of extensions to remove (default: ['csv', 'gz'])
 * @returns Filename without extensions
 */
export function removeFileExtensions(filename: string, extensions: string[] = ['csv', 'gz']): string {
  if (!filename) return '';
  
  let cleanFilename = filename;
  
  // Create regex pattern for extensions
  const extensionPattern = extensions.map(ext => `\\.${ext}`).join('|');
  const regex = new RegExp(`(${extensionPattern})$`, 'g');
  
  cleanFilename = cleanFilename.replace(regex, '');
  
  return cleanFilename;
}

/**
 * Comprehensive filename cleaning function
 * @param fullPath - The full path to clean
 * @param userEmail - Optional user email for prefix removal
 * @param removeExtensions - Whether to remove file extensions (default: true)
 * @returns Completely cleaned filename
 */
export function cleanFilename(
  fullPath: string, 
  userEmail?: string, 
  removeExtensions: boolean = true
): string {
  if (!fullPath) return '';
  
  console.log('🧹 Cleaning filename:', fullPath);
  
  // Step 1: Extract filename from path
  let cleanFilename = extractFilename(fullPath);
  console.log('  After path extraction:', cleanFilename);
  
  // Step 2: Remove user prefixes
  cleanFilename = removeUserPrefix(cleanFilename, userEmail);
  console.log('  After user prefix removal:', cleanFilename);
  
  // Step 3: Remove file extensions if requested
  if (removeExtensions) {
    cleanFilename = removeFileExtensions(cleanFilename);
    console.log('  After extension removal:', cleanFilename);
  }
  
  console.log('✅ Final cleaned filename:', cleanFilename);
  return cleanFilename;
}

/**
 * Test function to verify filename cleaning logic
 */
export function testFilenameCleaning(): void {
  const testCases = [
    'user_shashwat1499@gmail.com/pivot-table',
    'user_shashwat1499@gmail.com/Employee Sample Data',
    'user_shashwat1499@gmail.com/SampleCSVFile_2kb',
    'user_shashwat1499@gmail.com/folder/subfolder/file.csv',
    'user_shashwat1499@gmail.com/file.csv.gz',
    'pivot-table', // Already clean
    'Employee Sample Data.csv', // Has extension
    'user_test@example.com/deep/nested/path/filename.txt',
    'C:\\Users\\User\\Documents\\file.csv',
    '/home/user/documents/file.csv.gz'
  ];

  console.log('🧪 Testing comprehensive filename cleaning...');
  
  testCases.forEach((testCase, index) => {
    console.log(`\n--- Test ${index + 1}: "${testCase}" ---`);
    const result = cleanFilename(testCase, 'shashwat1499@gmail.com');
    console.log(`Result: "${result}"`);
  });
}

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).testFilenameCleaning = testFilenameCleaning;
  (window as any).cleanFilename = cleanFilename;
  (window as any).extractFilename = extractFilename;
  console.log('🧪 Filename utilities available globally:');
  console.log('  - window.testFilenameCleaning()');
  console.log('  - window.cleanFilename(path, userEmail)');
  console.log('  - window.extractFilename(path)');
}

