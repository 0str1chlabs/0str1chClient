#!/usr/bin/env node

console.log('🧪 Testing Direct Client-Side Backblaze Integration');
console.log('==================================================\n');

// Test environment variables
console.log('1️⃣ Checking Environment Variables...');
const requiredVars = [
    'VITE_BACKBLAZE_ACCOUNT_ID',
    'VITE_BACKBLAZE_APPLICATION_KEY', 
    'VITE_BACKBLAZE_BUCKET_NAME'
];

let missingVars = [];
requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.includes('your-') || value.includes('here')) {
        missingVars.push(varName);
        console.log(`❌ ${varName}: Not configured`);
    } else {
        console.log(`✅ ${varName}: Configured`);
    }
});

if (missingVars.length > 0) {
    console.log('\n❌ MISSING ENVIRONMENT VARIABLES!');
    console.log('📝 Create a .env.local file in sheet-scribe-ai-lab/ with:');
    console.log('');
    missingVars.forEach(varName => {
        console.log(`${varName}=your-${varName.toLowerCase().replace('vite_backblaze_', '')}-here`);
    });
    console.log('');
    console.log('🔧 Get your credentials from: https://secure.backblaze.com/user_signin.htm');
    process.exit(1);
}

console.log('\n✅ All environment variables configured!');

// Test Backblaze service
console.log('\n2️⃣ Testing Backblaze Service...');

try {
    // Import the service (this will work in Node.js with proper module resolution)
    const BackblazeApiService = require('./src/services/backblazeApiService.ts').default;
    
    if (!BackblazeApiService) {
        throw new Error('Failed to import BackblazeApiService');
    }
    
    console.log('✅ BackblazeApiService imported successfully');
    
    // Test service instantiation
    const service = BackblazeApiService.getInstance();
    console.log('✅ Service instance created');
    
    // Test authentication
    console.log('\n3️⃣ Testing Authentication...');
    service.authenticate()
        .then(result => {
            if (result.success) {
                console.log('✅ Backblaze authentication successful');
                
                // Test file operations
                console.log('\n4️⃣ Testing File Operations...');
                
                const testData = {
                    cells: { 'A1': { value: 'Test' }, 'B1': { value: 'Data' } },
                    rowCount: 1,
                    colCount: 2
                };
                
                const testMetadata = {
                    totalRows: 1,
                    totalColumns: 2,
                    headers: ['Test', 'Data'],
                    dataTypes: ['text', 'text']
                };
                
                // Test upload
                console.log('📤 Testing file upload...');
                return service.storeSheetData('test@example.com', 'test.csv', testData, testMetadata);
            } else {
                throw new Error(`Authentication failed: ${result.message}`);
            }
        })
        .then(uploadResult => {
            if (uploadResult.success) {
                console.log('✅ File upload successful');
                console.log('📊 Upload result:', uploadResult.data);
                
                // Test file listing
                console.log('\n📁 Testing file listing...');
                return service.listUserFiles('test@example.com');
            } else {
                throw new Error(`Upload failed: ${uploadResult.message}`);
            }
        })
        .then(listResult => {
            if (listResult.success) {
                console.log('✅ File listing successful');
                console.log(`📋 Found ${listResult.files?.length || 0} files`);
                
                // Test file download
                if (listResult.files && listResult.files.length > 0) {
                    const file = listResult.files[0];
                    console.log(`\n📥 Testing file download: ${file.fileName}`);
                    return service.retrieveSheetData('test@example.com', file.fileName);
                } else {
                    console.log('⚠️ No files found to download');
                    return { success: true, message: 'No files to download' };
                }
            } else {
                throw new Error(`File listing failed: ${listResult.message}`);
            }
        })
        .then(downloadResult => {
            if (downloadResult.success) {
                console.log('✅ File download successful');
                console.log('📊 Download result:', downloadResult.data ? 'Data received' : 'No data');
                
                console.log('\n🎉 All tests passed! Direct client-side Backblaze integration is working.');
                console.log('\n🚀 Next steps:');
                console.log('1. Start the frontend: npm run dev');
                console.log('2. Open http://localhost:8080');
                console.log('3. Login and upload a CSV file');
                console.log('4. Check your Backblaze B2 console to see the uploaded file');
                
            } else {
                throw new Error(`Download failed: ${downloadResult.message}`);
            }
        })
        .catch(error => {
            console.error('❌ Test failed:', error.message);
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Check your Backblaze B2 credentials');
            console.log('2. Ensure your bucket exists');
            console.log('3. Verify your application key has proper permissions');
            console.log('4. Check your internet connection');
        });
        
} catch (error) {
    console.error('❌ Setup error:', error.message);
    console.log('\n🔧 Make sure you have:');
    console.log('1. Node.js installed');
    console.log('2. All dependencies installed (npm install)');
    console.log('3. TypeScript configured properly');
}
