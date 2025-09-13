#!/usr/bin/env node

console.log('🧪 Testing Backend Proxy Backblaze Integration');
console.log('==============================================\n');

const API_BASE_URL = 'http://localhost:8090/api/backblaze';

async function testBackendProxy() {
    console.log('1️⃣ Testing Backend Health...');
    
    try {
        // Test backend health
        const healthResponse = await fetch('http://localhost:8090/health');
        if (healthResponse.ok) {
            console.log('✅ Backend server is running');
        } else {
            console.log('❌ Backend server health check failed');
            return;
        }
    } catch (error) {
        console.log('❌ Backend server is not running');
        console.log('📝 Start the backend server first:');
        console.log('   cd ../AIServer');
        console.log('   npm start');
        return;
    }

    console.log('\n2️⃣ Testing Backblaze Authentication...');
    
    try {
        const authResponse = await fetch(`${API_BASE_URL}/authenticate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (authResponse.ok) {
            const result = await authResponse.json();
            console.log('✅ Backblaze authentication successful');
            console.log('   Message:', result.message);
        } else {
            console.log('❌ Backblaze authentication failed');
            const error = await authResponse.text();
            console.log('   Error:', error);
            return;
        }
    } catch (error) {
        console.log('❌ Authentication request failed:', error.message);
        return;
    }

    console.log('\n3️⃣ Testing File Upload...');
    
    try {
        const testData = {
            test: 'data',
            timestamp: new Date().toISOString(),
            message: 'This is a test file for backend proxy integration'
        };

        // Compress the data (simplified version)
        const jsonString = JSON.stringify(testData);
        const compressedData = Buffer.from(jsonString).toString('base64');

        const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileName: 'test-user/test-file.json',
                compressedData: compressedData,
                metadata: {
                    originalSize: jsonString.length,
                    compressedSize: compressedData.length,
                    testFile: true
                }
            })
        });

        if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            console.log('✅ File upload successful');
            console.log('   File ID:', result.fileId);
        } else {
            console.log('❌ File upload failed');
            const error = await uploadResponse.text();
            console.log('   Error:', error);
        }
    } catch (error) {
        console.log('❌ Upload request failed:', error.message);
    }

    console.log('\n4️⃣ Testing File Listing...');
    
    try {
        const listResponse = await fetch(`${API_BASE_URL}/files/test-user`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (listResponse.ok) {
            const result = await listResponse.json();
            console.log('✅ File listing successful');
            console.log('   Files found:', result.files?.length || 0);
            if (result.files && result.files.length > 0) {
                console.log('   Sample file:', result.files[0].fileName);
            }
        } else {
            console.log('❌ File listing failed');
            const error = await listResponse.text();
            console.log('   Error:', error);
        }
    } catch (error) {
        console.log('❌ List request failed:', error.message);
    }

    console.log('\n5️⃣ Testing Storage Info...');
    
    try {
        const storageResponse = await fetch(`${API_BASE_URL}/storage-info`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (storageResponse.ok) {
            const result = await storageResponse.json();
            console.log('✅ Storage info retrieved');
            console.log('   Account ID:', result.data?.accountId);
            console.log('   Account Type:', result.data?.accountType);
        } else {
            console.log('❌ Storage info failed');
            const error = await storageResponse.text();
            console.log('   Error:', error);
        }
    } catch (error) {
        console.log('❌ Storage info request failed:', error.message);
    }

    console.log('\n✅ Backend Proxy Test Complete!');
    console.log('\n📝 Next Steps:');
    console.log('1. Make sure your frontend is configured to use the backend proxy');
    console.log('2. Update your frontend environment variables:');
    console.log('   VITE_API_URL=http://localhost:8090');
    console.log('3. Test the frontend integration');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.log('❌ This test requires Node.js 18+ or a fetch polyfill');
    console.log('📝 Install node-fetch: npm install node-fetch');
    process.exit(1);
}

testBackendProxy().catch(console.error);
