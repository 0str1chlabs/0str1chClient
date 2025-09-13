# Client-Side Backblaze B2 Setup Guide

This guide explains how to set up direct client-side Backblaze B2 integration for the frontend.

## 🚀 Quick Setup

### 1. Environment Variables

Create a `.env.local` file in the `sheet-scribe-ai-lab` directory with:

```env
# Backblaze B2 Configuration (REQUIRED)
VITE_BACKBLAZE_ACCOUNT_ID=your-backblaze-account-id
VITE_BACKBLAZE_APPLICATION_KEY=your-backblaze-application-key
VITE_BACKBLAZE_BUCKET_NAME=sheet-scribe-storage

# API Configuration (optional - for backend calls)
VITE_API_URL=http://localhost:8090

# Google OAuth (optional)
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

### 2. Get Backblaze B2 Credentials

1. Go to [Backblaze B2 Console](https://secure.backblaze.com/user_signin.htm)
2. Sign in to your account
3. Go to "App Keys" section
4. Create a new Application Key with:
   - **Name**: `sheet-scribe-client`
   - **Allow access to Bucket(s)**: Select your bucket or "All Buckets"
   - **Type of Access**: "Read and Write"
5. Copy the `keyID` and `applicationKey`

### 3. Create Backblaze B2 Bucket

1. In Backblaze B2 Console, go to "Buckets"
2. Create a new bucket:
   - **Bucket Name**: `sheet-scribe-storage` (or update `VITE_BACKBLAZE_BUCKET_NAME`)
   - **Files in Bucket are**: `Private` (recommended for security)
3. Note the bucket name for your environment variables

## 🔧 How It Works

### Direct Client-Side Integration

The frontend now communicates directly with Backblaze B2 without going through the backend:

1. **Authentication**: Client authenticates directly with Backblaze B2 API
2. **File Upload**: CSV files are compressed and uploaded directly to Backblaze B2
3. **File Download**: Sheets are downloaded and decompressed directly from Backblaze B2
4. **File Management**: List, delete, and manage files directly from the frontend

### File Structure in Backblaze B2

```
sheet-scribe-storage/
├── user_user@example.com/
│   ├── sheet1.csv.gz
│   ├── sheet2.csv.gz
│   └── data.csv.gz
├── user_another@example.com/
│   ├── report.csv.gz
│   └── analysis.csv.gz
└── ...
```

### Compression

- All files are compressed using `fflate` (gzip) before upload
- Compression ratio is typically 60-80% for CSV data
- Files are automatically decompressed when downloaded

## 🧪 Testing

### 1. Test Client-Side Integration

```bash
cd sheet-scribe-ai-lab
npm run test:client-backblaze
```

### 2. Test in Browser

Open `test-backblaze-browser.html` in your browser for interactive testing.

### 3. Test Full Application

1. Start the frontend: `npm run dev`
2. Login with your account
3. Upload a CSV file
4. Check Backblaze B2 console to see the uploaded file

## 🔒 Security Considerations

### Environment Variables

- **Never commit** `.env.local` to version control
- Use different credentials for development and production
- Rotate keys regularly

### CORS Configuration

The current setup allows direct client-side uploads. For production, consider:

1. **Pre-signed URLs**: Generate upload URLs on the backend
2. **Token-based Auth**: Use JWT tokens for authentication
3. **Rate Limiting**: Implement rate limiting on the backend

### File Access

- Files are stored per user in separate folders
- Each user can only access their own files
- Files are compressed and encrypted in transit

## 🚨 Troubleshooting

### Common Issues

1. **"Backblaze credentials not found"**
   - Check your `.env.local` file
   - Ensure variables start with `VITE_`
   - Restart the development server

2. **"Authentication failed"**
   - Verify your `VITE_BACKBLAZE_ACCOUNT_ID` and `VITE_BACKBLAZE_APPLICATION_KEY`
   - Check that the application key has proper permissions

3. **"Bucket not found"**
   - Verify your `VITE_BACKBLAZE_BUCKET_NAME`
   - Ensure the bucket exists in your Backblaze account

4. **"Upload failed"**
   - Check your internet connection
   - Verify the file size (Backblaze has limits)
   - Check browser console for detailed error messages

### Debug Mode

Enable debug logging by adding to your `.env.local`:

```env
VITE_DEBUG_BACKBLAZE=true
```

## 📊 Performance Benefits

### Direct Client-Side Uploads

- **Faster Uploads**: No backend bottleneck
- **Better Scalability**: Backend doesn't handle file transfers
- **Reduced Server Load**: Backend only handles authentication and metadata
- **Better User Experience**: Real-time progress and immediate feedback

### Compression Benefits

- **Reduced Storage Costs**: 60-80% smaller files
- **Faster Transfers**: Less data to upload/download
- **Better Performance**: Faster loading times

## 🔄 Migration from Backend Uploads

The system now uses direct client-side uploads by default. If you need to fall back to backend uploads:

1. Set `VITE_USE_BACKEND_UPLOADS=true` in your `.env.local`
2. Ensure your backend is running and configured
3. The system will automatically use backend uploads

## 📝 API Reference

### BackblazeApiService Methods

- `authenticate()`: Authenticate with Backblaze B2
- `storeSheetData(userEmail, fileName, data, metadata)`: Upload sheet data
- `retrieveSheetData(userEmail, fileName)`: Download sheet data
- `listUserFiles(userEmail)`: List user's files
- `deleteSheetData(userEmail, fileName, fileId)`: Delete sheet data
- `checkUserFiles(userEmail)`: Check if user has files

### Example Usage

```typescript
import BackblazeApiService from './services/backblazeApiService';

const backblazeService = BackblazeApiService.getInstance();

// Authenticate
const authResult = await backblazeService.authenticate();

// Upload data
const uploadResult = await backblazeService.storeSheetData(
  'user@example.com',
  'data.csv',
  { cells: {...}, rowCount: 100, colCount: 10 },
  { totalRows: 100, totalColumns: 10 }
);

// Download data
const downloadResult = await backblazeService.retrieveSheetData(
  'user@example.com',
  'data.csv'
);
```

## 🎯 Next Steps

1. **Configure Environment Variables**: Set up your `.env.local` file
2. **Test Integration**: Run the test scripts
3. **Deploy**: Update production environment variables
4. **Monitor**: Check Backblaze B2 console for file uploads
5. **Optimize**: Adjust compression settings if needed

For more information, see:
- [Backblaze B2 API Documentation](https://www.backblaze.com/apidocs)
- [fflate Compression Library](https://github.com/101arrowz/fflate)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
