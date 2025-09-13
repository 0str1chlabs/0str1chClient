# Direct Client-to-Backblaze Upload Setup

## 🎯 **Overview**

This setup enables **direct file uploads** from your client application to Backblaze B2 without routing data through your server. This is perfect for large files as it:

- ✅ **No data through server** - Files go directly from client to Backblaze
- ✅ **Better performance** - No server bottleneck for large files
- ✅ **Lower server costs** - Server only handles authentication, not data transfer
- ✅ **Scalable** - Can handle files of any size

## 🔧 **Setup Steps**

### 1. **Configure CORS on Your Backblaze B2 Bucket**

You need to configure CORS rules on your Backblaze B2 bucket to allow direct browser uploads.

#### **Option A: Using Backblaze B2 CLI (Recommended)**

1. **Install B2 CLI**:
   ```bash
   # Download from: https://www.backblaze.com/b2/docs/quick_command_line.html
   # Or use package manager:
   npm install -g b2
   ```

2. **Authenticate with B2 CLI**:
   ```bash
   b2 authorize-account your-account-id your-application-key
   ```

3. **Apply CORS Rules**:
   ```bash
   b2 update-bucket --corsRules "$(cat cors_rules.json)" your-bucket-name allPublic
   ```

#### **Option B: Using Backblaze Web Console**

1. Go to [Backblaze B2 Console](https://secure.backblaze.com/user_signin.htm)
2. Navigate to your bucket
3. Go to "CORS Rules" section
4. Add the following CORS rule:

```json
{
  "corsRuleName": "allowClientUploads",
  "allowedOrigins": [
    "http://localhost:8080",
    "http://localhost:3000",
    "https://yourdomain.com"
  ],
  "allowedHeaders": [
    "authorization",
    "content-type",
    "x-bz-content-sha1",
    "x-bz-file-name",
    "x-bz-info-original-size",
    "x-bz-info-compressed-size",
    "x-bz-info-compression-ratio",
    "x-bz-info-metadata"
  ],
  "allowedOperations": [
    "b2_upload_file",
    "b2_upload_part",
    "b2_download_file_by_name",
    "b2_download_file_by_id",
    "b2_list_file_names",
    "b2_list_file_versions",
    "b2_delete_file_version",
    "b2_get_upload_url",
    "b2_authorize_account",
    "b2_list_buckets",
    "b2_get_account_info"
  ],
  "exposeHeaders": [
    "x-bz-content-sha1",
    "x-bz-file-id",
    "x-bz-file-name"
  ],
  "maxAgeSeconds": 3600
}
```

### 2. **Configure Frontend Environment Variables**

Create `sheet-scribe-ai-lab/.env.local`:

```env
# Backblaze B2 Direct Upload Configuration
VITE_BACKBLAZE_ACCOUNT_ID=your-backblaze-account-id
VITE_BACKBLAZE_APPLICATION_KEY=your-backblaze-application-key
VITE_BACKBLAZE_BUCKET_NAME=your-bucket-name

# Optional: API URL for fallback operations
VITE_API_URL=http://localhost:8090
```

### 3. **Test the Setup**

```bash
# Test direct upload functionality
cd sheet-scribe-ai-lab
npm run test:direct-backblaze
```

## 🏗️ **Architecture**

### **Direct Upload Flow**

```
1. Client → Backblaze B2 API (b2_authorize_account) ✅
2. Client → Backblaze B2 API (b2_get_upload_url) ✅
3. Client → Backblaze B2 Upload URL (direct file upload) ✅
4. Client → Backblaze B2 API (b2_list_file_names) ✅
5. Client → Backblaze B2 Download URL (direct file download) ✅
```

### **No Data Through Server**

- ✅ **Authentication**: Direct to Backblaze B2
- ✅ **Upload URLs**: Direct to Backblaze B2
- ✅ **File Upload**: Direct to Backblaze B2
- ✅ **File Download**: Direct from Backblaze B2
- ✅ **File Listing**: Direct to Backblaze B2
- ✅ **File Deletion**: Direct to Backblaze B2

## 🔐 **Security Considerations**

### **API Key Exposure**
- ⚠️ **Frontend API Keys**: Your Backblaze credentials will be visible in the frontend code
- ✅ **Mitigation**: Use application keys with limited permissions
- ✅ **Best Practice**: Create a separate application key for frontend use

### **Recommended Security Setup**

1. **Create Limited Application Key**:
   - Go to Backblaze B2 Console
   - Create new application key
   - Limit to specific bucket
   - Set appropriate permissions

2. **Environment Variables**:
   - Store credentials in `.env.local` (not committed to git)
   - Use different keys for development/production

3. **CORS Restrictions**:
   - Only allow your specific domains
   - Don't use wildcard origins in production

## 📊 **Performance Benefits**

### **Large File Handling**
- **Before**: Client → Server → Backblaze (2x network transfer)
- **After**: Client → Backblaze (1x network transfer)

### **Server Load**
- **Before**: Server handles all file data
- **After**: Server only handles authentication/metadata

### **Bandwidth Usage**
- **Before**: Server bandwidth used for all uploads
- **After**: Direct client-to-Backblaze transfer

## 🧪 **Testing**

### **Test Direct Upload**
```bash
cd sheet-scribe-ai-lab
npm run test:direct-backblaze
```

### **Test in Browser**
1. Start your frontend: `npm run dev`
2. Open browser console
3. Check for CORS errors
4. Test file upload functionality

### **Debug CORS Issues**
If you see CORS errors:

1. **Check CORS Configuration**:
   ```bash
   # Verify CORS rules are applied
   b2 get-bucket your-bucket-name
   ```

2. **Check Allowed Origins**:
   - Ensure your domain is in the CORS rules
   - Include both `http://localhost:8080` and `https://yourdomain.com`

3. **Check Allowed Headers**:
   - Ensure all required headers are in the CORS rules
   - Check for typos in header names

## 🚀 **Deployment**

### **Production Setup**

1. **Update CORS Rules**:
   ```json
   {
     "allowedOrigins": [
       "https://yourdomain.com",
       "https://www.yourdomain.com"
     ]
   }
   ```

2. **Environment Variables**:
   ```env
   VITE_BACKBLAZE_ACCOUNT_ID=your-production-account-id
   VITE_BACKBLAZE_APPLICATION_KEY=your-production-application-key
   VITE_BACKBLAZE_BUCKET_NAME=your-production-bucket
   ```

3. **Security**:
   - Use production-specific application keys
   - Limit permissions to necessary operations only
   - Monitor usage and access logs

## 🔍 **Troubleshooting**

### **Common Issues**

1. **CORS Error**: "No 'Access-Control-Allow-Origin' header"
   - **Solution**: Configure CORS rules on your Backblaze bucket

2. **Authentication Failed**: "Invalid credentials"
   - **Solution**: Check your environment variables

3. **Upload Failed**: "Upload URL expired"
   - **Solution**: The service automatically refreshes upload URLs

4. **File Not Found**: "File doesn't exist"
   - **Solution**: Check file path and naming convention

### **Debug Steps**

1. **Check Browser Console** for detailed error messages
2. **Verify CORS Configuration** using B2 CLI
3. **Test Authentication** separately
4. **Check Network Tab** for failed requests

## ✅ **Benefits Summary**

- 🚀 **Performance**: Direct uploads, no server bottleneck
- 💰 **Cost**: Lower server bandwidth usage
- 📈 **Scalability**: Handle files of any size
- 🔒 **Security**: Controlled access via CORS and application keys
- 🛠️ **Simplicity**: No complex server-side file handling

Your direct client-to-Backblaze upload setup is now complete! 🎉
