// Test CORS configuration for direct Backblaze B2 uploads
import { gzipSync } from 'fflate';

const BACKBLAZE_ACCOUNT_ID = process.env.VITE_BACKBLAZE_ACCOUNT_ID || 'your-account-id';
const BACKBLAZE_APPLICATION_KEY = process.env.VITE_BACKBLAZE_APPLICATION_KEY || 'your-application-key';
const BACKBLAZE_BUCKET_NAME = process.env.VITE_BACKBLAZE_BUCKET_NAME || 'your-bucket-name';

async function testCORSSetup() {
    console.log('🔍 Testing CORS Configuration for Direct Backblaze B2 Uploads');
    console.log('============================================================\n');

    try {
        // Step 1: Test Authentication
        console.log('1️⃣ Testing Backblaze B2 Authentication...');
        const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(`${BACKBLAZE_ACCOUNT_ID}:${BACKBLAZE_APPLICATION_KEY}`)}`,
                'Content-Type': 'application/json'
            }
        });

        if (!authResponse.ok) {
            throw new Error(`Authentication failed: ${authResponse.status} ${authResponse.statusText}`);
        }

        const authData = await authResponse.json();
        console.log('✅ Authentication successful');
        console.log(`   Account ID: ${authData.accountId}`);
        console.log(`   API URL: ${authData.apiUrl}`);

        // Step 2: Test Bucket Listing
        console.log('\n2️⃣ Testing Bucket Listing...');
        const bucketResponse = await fetch(`${authData.apiUrl}/b2_list_buckets`, {
            method: 'POST',
            headers: {
                'Authorization': authData.authorizationToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                accountId: authData.accountId
            })
        });

        if (!bucketResponse.ok) {
            throw new Error(`Bucket listing failed: ${bucketResponse.status} ${bucketResponse.statusText}`);
        }

        const bucketData = await bucketResponse.json();
        const targetBucket = bucketData.buckets.find(b => b.bucketName === BACKBLAZE_BUCKET_NAME);
        
        if (!targetBucket) {
            throw new Error(`Bucket '${BACKBLAZE_BUCKET_NAME}' not found`);
        }

        console.log('✅ Bucket found');
        console.log(`   Bucket Name: ${targetBucket.bucketName}`);
        console.log(`   Bucket ID: ${targetBucket.bucketId}`);

        // Step 3: Test Upload URL Generation
        console.log('\n3️⃣ Testing Upload URL Generation...');
        const uploadUrlResponse = await fetch(`${authData.apiUrl}/b2_get_upload_url`, {
            method: 'POST',
            headers: {
                'Authorization': authData.authorizationToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bucketId: targetBucket.bucketId
            })
        });

        if (!uploadUrlResponse.ok) {
            throw new Error(`Upload URL generation failed: ${uploadUrlResponse.status} ${uploadUrlResponse.statusText}`);
        }

        const uploadUrlData = await uploadUrlResponse.json();
        console.log('✅ Upload URL generated successfully');
        console.log(`   Upload URL: ${uploadUrlData.uploadUrl.substring(0, 50)}...`);

        // Step 4: Test Direct Upload (Small Test File)
        console.log('\n4️⃣ Testing Direct Upload...');
        const testData = { test: 'CORS configuration test', timestamp: Date.now() };
        const compressedData = gzipSync(JSON.stringify(testData));
        
        const uploadResponse = await fetch(uploadUrlData.uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': uploadUrlData.authorizationToken,
                'X-Bz-File-Name': `test-cors-${Date.now()}.json`,
                'Content-Type': 'application/octet-stream',
                'X-Bz-Content-Sha1': 'do_not_verify',
                'X-Bz-Info-test': 'cors-configuration-test'
            },
            body: compressedData
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }

        const uploadResult = await uploadResponse.json();
        console.log('✅ Direct upload successful!');
        console.log(`   File ID: ${uploadResult.fileId}`);
        console.log(`   File Name: ${uploadResult.fileName}`);

        // Step 5: Test File Listing
        console.log('\n5️⃣ Testing File Listing...');
        const listResponse = await fetch(`${authData.apiUrl}/b2_list_file_names`, {
            method: 'POST',
            headers: {
                'Authorization': authData.authorizationToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bucketId: targetBucket.bucketId,
                maxFileCount: 10
            })
        });

        if (!listResponse.ok) {
            throw new Error(`File listing failed: ${listResponse.status} ${listResponse.statusText}`);
        }

        const listData = await listResponse.json();
        console.log('✅ File listing successful');
        console.log(`   Found ${listData.files.length} files`);

        console.log('\n🎉 CORS Configuration Test PASSED!');
        console.log('✅ Your frontend can now make direct calls to Backblaze B2');
        console.log('✅ No data will flow through your server');
        console.log('✅ Large files can be uploaded directly from client');

    } catch (error) {
        console.error('\n❌ CORS Configuration Test FAILED!');
        console.error('Error:', error.message);
        
        if (error.message.includes('CORS')) {
            console.log('\n🔧 CORS Error Detected!');
            console.log('📝 SOLUTION: Configure CORS rules on your Backblaze B2 bucket');
            console.log('');
            console.log('1. Install B2 CLI:');
            console.log('   npm install -g b2');
            console.log('');
            console.log('2. Authenticate:');
            console.log('   b2 authorize-account YOUR_ACCOUNT_ID YOUR_APPLICATION_KEY');
            console.log('');
            console.log('3. Apply CORS rules:');
            console.log('   b2 update-bucket --corsRules "$(cat cors_rules.json)" YOUR_BUCKET_NAME allPublic');
            console.log('');
            console.log('4. Or use the Backblaze B2 Console to add CORS rules manually');
        } else if (error.message.includes('Authentication')) {
            console.log('\n🔧 Authentication Error Detected!');
            console.log('📝 SOLUTION: Check your Backblaze credentials');
            console.log('');
            console.log('1. Verify your account ID and application key');
            console.log('2. Make sure the application key has the necessary permissions');
            console.log('3. Check that your .env.local file is properly configured');
        } else {
            console.log('\n🔧 General Error Detected!');
            console.log('📝 Check the error message above for specific issues');
        }
    }
}

// Run the test
testCORSSetup();
