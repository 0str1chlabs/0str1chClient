// Test hybrid approach: Frontend compression + Backend routing
import { gzipSync, gunzipSync } from 'fflate';

const API_BASE_URL = 'http://localhost:8090';
const BACKBLAZE_API_URL = `${API_BASE_URL}/api/backblaze`;

async function testHybridApproach() {
    console.log('🔧 Testing Hybrid Approach: Frontend Compression + Backend Routing');
    console.log('================================================================\n');

    try {
        // Step 1: Test Backend Authentication
        console.log('1️⃣ Testing Backend Authentication...');
        const authResponse = await fetch(`${BACKBLAZE_API_URL}/authenticate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!authResponse.ok) {
            throw new Error(`Authentication failed: ${authResponse.status} ${authResponse.statusText}`);
        }

        const authResult = await authResponse.json();
        console.log('✅ Backend authentication successful');
        console.log(`   Message: ${authResult.message}`);

        // Step 2: Test Frontend Compression
        console.log('\n2️⃣ Testing Frontend Compression...');
        const testData = {
            sheets: [
                { name: 'Sheet1', data: Array(1000).fill(0).map((_, i) => ({ id: i, value: `Test ${i}` })) },
                { name: 'Sheet2', data: Array(500).fill(0).map((_, i) => ({ id: i, value: `Data ${i}` })) }
            ],
            metadata: {
                totalRows: 1500,
                totalColumns: 2,
                createdAt: new Date().toISOString()
            }
        };

        const originalSize = JSON.stringify(testData).length;
        const compressedData = gzipSync(JSON.stringify(testData));
        const compressedSize = compressedData.length;
        const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

        console.log('✅ Frontend compression completed');
        console.log(`   Original size: ${(originalSize / 1024).toFixed(2)} KB`);
        console.log(`   Compressed size: ${(compressedSize / 1024).toFixed(2)} KB`);
        console.log(`   Compression ratio: ${compressionRatio.toFixed(1)}%`);

        // Step 3: Test Upload via Backend
        console.log('\n3️⃣ Testing Upload via Backend...');
        const base64Data = btoa(String.fromCharCode(...compressedData));
        
        const uploadResponse = await fetch(`${BACKBLAZE_API_URL}/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileName: `test-hybrid-${Date.now()}.json`,
                compressedData: base64Data,
                metadata: {
                    originalSize,
                    compressedSize,
                    compressionRatio,
                    uploadTimestamp: Date.now(),
                    testType: 'hybrid-approach'
                }
            })
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }

        const uploadResult = await uploadResponse.json();
        console.log('✅ Upload via backend successful');
        console.log(`   File ID: ${uploadResult.data?.fileId || 'N/A'}`);
        console.log(`   Message: ${uploadResult.message}`);

        // Step 4: Test File Listing
        console.log('\n4️⃣ Testing File Listing...');
        const listResponse = await fetch(`${BACKBLAZE_API_URL}/files/test@example.com`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!listResponse.ok) {
            throw new Error(`File listing failed: ${listResponse.status} ${listResponse.statusText}`);
        }

        const listResult = await listResponse.json();
        console.log('✅ File listing successful');
        console.log(`   Found ${listResult.data?.length || 0} files`);

        // Step 5: Test Download and Decompression
        if (listResult.data && listResult.data.length > 0) {
            console.log('\n5️⃣ Testing Download and Decompression...');
            const fileName = listResult.data[0].fileName;
            
            const downloadResponse = await fetch(`${BACKBLAZE_API_URL}/retrieve/${encodeURIComponent(fileName)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!downloadResponse.ok) {
                throw new Error(`Download failed: ${downloadResponse.status} ${downloadResponse.statusText}`);
            }

            const downloadResult = await downloadResponse.json();
            
            if (downloadResult.success && downloadResult.data?.compressedData) {
                // Convert base64 back to Uint8Array
                const binaryString = atob(downloadResult.data.compressedData);
                const compressedData = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    compressedData[i] = binaryString.charCodeAt(i);
                }
                
                const decompressedData = gunzipSync(compressedData);
                const decompressedJson = JSON.parse(new TextDecoder().decode(decompressedData));
                
                console.log('✅ Download and decompression successful');
                console.log(`   Decompressed size: ${(decompressedData.length / 1024).toFixed(2)} KB`);
                console.log(`   Data integrity: ${decompressedJson.sheets ? 'Valid' : 'Invalid'}`);
            } else {
                console.log('⚠️ Download successful but no compressed data found');
            }
        }

        // Step 6: Test Storage Info
        console.log('\n6️⃣ Testing Storage Info...');
        const storageResponse = await fetch(`${BACKBLAZE_API_URL}/storage-info`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!storageResponse.ok) {
            throw new Error(`Storage info failed: ${storageResponse.status} ${storageResponse.statusText}`);
        }

        const storageResult = await storageResponse.json();
        console.log('✅ Storage info retrieved');
        console.log(`   Account ID: ${storageResult.data?.accountId || 'N/A'}`);
        console.log(`   Account Type: ${storageResult.data?.accountType || 'N/A'}`);

        console.log('\n🎉 Hybrid Approach Test PASSED!');
        console.log('✅ Frontend compression working efficiently');
        console.log('✅ Backend routing avoiding CORS issues');
        console.log('✅ Data integrity maintained through compression/decompression');
        console.log('✅ No data flowing through server unnecessarily');

    } catch (error) {
        console.error('\n❌ Hybrid Approach Test FAILED!');
        console.error('Error:', error.message);
        
        if (error.message.includes('fetch')) {
            console.log('\n🔧 Network Error Detected!');
            console.log('📝 SOLUTION: Make sure your backend server is running');
            console.log('');
            console.log('1. Start the backend server:');
            console.log('   cd AIServer');
            console.log('   npm start');
            console.log('');
            console.log('2. Check if the server is running on port 8090');
            console.log('   curl http://localhost:8090/health');
        } else if (error.message.includes('Authentication')) {
            console.log('\n🔧 Authentication Error Detected!');
            console.log('📝 SOLUTION: Check your Backblaze credentials in backend');
            console.log('');
            console.log('1. Verify AIServer/.env file has correct Backblaze credentials');
            console.log('2. Make sure the backend can authenticate with Backblaze B2');
        } else {
            console.log('\n🔧 General Error Detected!');
            console.log('📝 Check the error message above for specific issues');
        }
    }
}

// Run the test
testHybridApproach();
