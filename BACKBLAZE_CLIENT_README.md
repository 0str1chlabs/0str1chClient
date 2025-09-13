# Backblaze B2 Client-Side Integration

This guide explains how to test and use the client-side Backblaze B2 integration for uploading and retrieving sheet data.

## 🎯 Architecture Overview

### Current Architecture (Backend Proxy)
```
Frontend → Backend API → Backblaze B2
```

- **Frontend** calls `/api/backblaze/*` endpoints
- **Backend** handles authentication and proxies requests to Backblaze B2
- **Backblaze B2** stores the actual files

### Future Direct Upload Architecture
```
Frontend → Backend (get upload URL) → Backblaze B2
Frontend → Backblaze B2 (direct upload)
```

## 🧪 Testing Approaches

### 1. Backend API Testing (AIServer)
Tests the backend API endpoints directly.

```bash
cd AIServer
node test-backblaze-storage.js
```

**What it tests:**
- ✅ Backblaze B2 authentication
- ✅ Data storage via backend API
- ✅ Data retrieval via backend API
- ✅ File listing via backend API
- ✅ Data deletion via backend API
- ✅ Backend service functionality

### 2. Client-Side Integration Testing
Tests the complete frontend-to-backend flow.

```bash
cd sheet-scribe-ai-lab
npm run test:client-backblaze
```

**What it tests:**
- ✅ Client-side data compression
- ✅ API calls from frontend to backend
- ✅ End-to-end data flow
- ✅ Error handling
- ✅ User experience flow

### 3. Browser Console Testing
Test directly in the browser console.

```javascript
// Open browser console and run:
import BackblazeApiService from './src/services/backblazeApiService';

// Test service status
await BackblazeApiService.checkBackblazeStatus();

// Test with sample data
const sampleData = {
  cells: {
    'A1': { value: 'Name', colHeader: 'Name' },
    'B1': { value: 'Age', colHeader: 'Age' },
    'A2': { value: 'John', colHeader: 'Name' },
    'B2': { value: 25, colHeader: 'Age' }
  },
  rowCount: 2,
  colCount: 2
};

// Upload data
await BackblazeApiService.storeSheetData('test@example.com', 'test-sheet', sampleData, {});

// List files
await BackblazeApiService.listUserFiles('test@example.com');

// Retrieve data
await BackblazeApiService.retrieveSheetData('test@example.com', 'test-sheet');
```

## 📋 API Endpoints

### Upload Data
```javascript
POST /api/backblaze/upload
{
  "userEmail": "user@example.com",
  "fileName": "my-sheet",
  "compressedData": "base64-encoded-gzipped-data",
  "metadata": {
    "totalRows": 100,
    "totalColumns": 10,
    "compressionRatio": 75.5
  }
}
```

### Check User Data
```javascript
GET /api/backblaze/check/user@example.com
```

### List User Files
```javascript
GET /api/backblaze/files/user@example.com
```

### Retrieve Data
```javascript
GET /api/backblaze/retrieve/user@example.com/my-sheet
```

### Delete Data
```javascript
DELETE /api/backblaze/delete/user@example.com/my-sheet
```

### Service Authentication
```javascript
POST /api/backblaze/authenticate
```

## 🔧 Client-Side Service Usage

### Import the Service
```javascript
import BackblazeApiService from '../services/backblazeApiService';
```

### Check Service Status
```javascript
const status = await BackblazeApiService.checkBackblazeStatus();
if (status.success) {
  console.log('✅ Backblaze service available');
} else {
  console.error('❌ Backblaze service unavailable:', status.message);
}
```

### Upload Sheet Data
```javascript
const result = await BackblazeApiService.storeSheetData(
  userEmail,
  fileName,
  sheetData,
  metadata
);

if (result.success) {
  console.log('✅ Data uploaded successfully');
} else {
  console.error('❌ Upload failed:', result.message);
}
```

### List User Files
```javascript
const filesResult = await BackblazeApiService.listUserFiles(userEmail);
if (filesResult.success && filesResult.data) {
  console.log('📁 User files:', filesResult.data);
}
```

### Retrieve Sheet Data
```javascript
const retrieveResult = await BackblazeApiService.retrieveSheetData(
  userEmail,
  fileName
);

if (retrieveResult.success && retrieveResult.data) {
  // Data is automatically decompressed
  const decompressedData = retrieveResult.data;
  console.log('✅ Data retrieved:', decompressedData);
}
```

### Delete Sheet Data
```javascript
const deleteResult = await BackblazeApiService.deleteSheetData(
  userEmail,
  fileName
);

if (deleteResult.success) {
  console.log('🗑️ Data deleted successfully');
}
```

## 🔄 Data Flow

### Upload Process
1. **Client** compresses sheet data using `fflate` (gzip)
2. **Client** converts compressed data to base64
3. **Client** sends to `/api/backblaze/upload`
4. **Backend** authenticates with Backblaze B2
5. **Backend** uploads file to Backblaze B2
6. **Backend** returns success/failure to client

### Retrieval Process
1. **Client** requests `/api/backblaze/retrieve/user/file`
2. **Backend** authenticates with Backblaze B2
3. **Backend** downloads file from Backblaze B2
4. **Backend** decompresses the data
5. **Backend** returns decompressed data to client

## 🗜️ Compression Details

### Client-Side Compression
- Uses `fflate` library for gzip compression
- Compression level: 6 (good balance of speed/size)
- Data is compressed before sending to backend
- Metadata includes original size, compressed size, and compression ratio

### Automatic Decompression
- Backend automatically decompresses data when retrieving
- Client receives ready-to-use decompressed data
- No manual decompression needed in frontend

## 🐛 Troubleshooting

### Common Issues

#### 1. "Backblaze service not available"
- Check backend server is running
- Verify Backblaze credentials in `.env`
- Check Backblaze B2 bucket exists and is accessible

#### 2. Upload fails with 500 error
- Check backend logs for detailed error
- Verify data is properly compressed and base64 encoded
- Check file size limits

#### 3. Retrieval fails
- Verify file exists in Backblaze B2
- Check file name matches exactly
- Check user permissions

#### 4. Compression issues
- Ensure `fflate` is properly imported
- Check data structure before compression
- Verify base64 encoding is working

### Debug Mode
Enable detailed logging:

```javascript
// In browser console
localStorage.setItem('debug', 'backblaze');

// Check logs
console.log('Backblaze debug logs enabled');
```

## 🚀 Future Enhancements

### Direct Browser Uploads
For better performance, implement direct browser-to-Backblaze uploads:

1. **Backend** generates signed upload URLs
2. **Client** uploads directly to Backblaze B2
3. **Client** notifies backend of successful upload
4. **Backend** updates metadata

### Benefits:
- ⚡ Faster uploads (no backend proxy)
- 📊 Better progress tracking
- 🔒 Improved security (no credentials in browser)
- 📈 Better scalability

## 📊 Performance Metrics

### Current Architecture
- **Upload**: Client → Backend → Backblaze B2
- **Download**: Backblaze B2 → Backend → Client
- **Compression**: Client-side (fflate)
- **Decompression**: Server-side

### Compression Benchmarks
- **Typical compression ratio**: 70-90%
- **Compression speed**: ~10-50ms for typical sheets
- **Decompression speed**: ~5-20ms

## 🔐 Security

### Current Security Measures
- ✅ No Backblaze credentials exposed to client
- ✅ All authentication handled server-side
- ✅ Data encrypted in transit (HTTPS)
- ✅ Data compressed and encoded before transmission

### Future Security Enhancements
- 🔒 End-to-end encryption
- 🛡️ Request rate limiting
- 📋 Audit logging
- 🔐 JWT token validation

## 🎯 Best Practices

### Client-Side
1. Always check service status before operations
2. Compress data before upload
3. Handle errors gracefully
4. Show progress indicators for large files
5. Validate data before sending

### Backend
1. Validate all incoming requests
2. Implement rate limiting
3. Log all operations for debugging
4. Handle Backblaze B2 errors appropriately
5. Implement retry logic for failed operations

## 📞 Support

For issues with Backblaze B2 integration:

1. **Check the test files** first
2. **Review browser console** for errors
3. **Check backend logs** for server-side issues
4. **Verify Backblaze B2 credentials** and bucket setup
5. **Test with small data sets** first

---

**🎉 Your Sheet Scribe AI now has robust Backblaze B2 integration with client-side testing!**
