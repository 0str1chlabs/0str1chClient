# Production Environment Setup Guide

## 🚀 Backend URL Configuration

### Problem
Your MEGA API service was hitting `localhost:8080` in production instead of your Render backend URL.

### Root Cause
While `VITE_BACKEND_URL` was properly configured in production, some services had inconsistent fallback logic that could potentially cause issues.

### Solution
All frontend services now consistently use the following pattern:

```typescript
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090';
```

## 🔧 Environment Variables

### Required Environment Variables for Production

Set these in your frontend deployment platform (Lovable, Vercel, Netlify, etc.):

```bash
# Your Render backend URL (replace with actual Render URL)
VITE_BACKEND_URL=https://your-app-name.onrender.com

# Optional: Alternative API URL (fallback)
VITE_API_URL=https://your-app-name.onrender.com

# Optional: AI Server URL (if different from main backend)
VITE_AISERVER_URL=https://your-app-name.onrender.com
```

### Finding Your Render URL

1. Go to your Render dashboard
2. Select your backend service
3. Copy the service URL (e.g., `https://your-app-name.onrender.com`)

## 🧪 Testing & Debugging

### 1. Check Environment Variables
Open browser console and look for debug logs from services:
```
🔧 MegaApiService initialized with baseUrl: https://your-render-url.onrender.com/api/mega
🔧 AuthService initialized with baseURL: https://your-render-url.onrender.com/api/auth
🔧 MongoDBService initialized with baseUrl: https://your-render-url.onrender.com/api
```

### 2. Run Environment Test
Import and run the test script:
```javascript
import('./test-env-urls.js').then(() => {
  window.testBackendUrls();
});
```

### 3. Manual Verification
Check browser Network tab to ensure all API calls go to your Render URL, not localhost.

## 📋 Services Updated

The following services have been updated to use consistent URL resolution:

- ✅ `MegaApiService` - MEGA cloud storage operations
- ✅ `AuthService` - Authentication and user management
- ✅ `MongoDBService` - Database operations
- ✅ `GeminiService` - AI chart generation
- ✅ `AIReportGenerator` - Enhanced AI reports
- ✅ `CSVUploader` - File upload operations
- ✅ `AIAssistant` - AI assistant functionality
- ✅ `reportUtils` - Category report generation
- ✅ `Index.tsx` - Main page API calls

## 🚨 Common Issues & Solutions

### Issue: Still hitting localhost in production
**Solution**: Ensure `VITE_BACKEND_URL` is set in your frontend deployment environment variables.

### Issue: Mixed localhost and production URLs
**Solution**: Clear browser cache and hard refresh (Ctrl+F5) to ensure new code is loaded.

### Issue: CORS errors
**Solution**: Ensure your Render backend has CORS configured for your frontend domain.

## 🔍 Debugging Steps

1. **Check browser console** for the debug logs showing which URLs are being used
2. **Check Network tab** in browser dev tools to see actual API call destinations
3. **Verify environment variables** are set correctly in your deployment platform
4. **Test with the debug script** provided in `src/test-env-urls.js`

## ✅ Verification Checklist

- [ ] `VITE_BACKEND_URL` is set in production environment
- [ ] All API calls in Network tab show Render URL (not localhost)
- [ ] Console logs show correct production URLs
- [ ] MEGA operations work correctly
- [ ] Authentication works correctly
- [ ] All other API calls work correctly

## 📞 Support

If you're still experiencing issues:

1. Check the browser console for error messages
2. Run the test script to verify environment variables
3. Ensure your Render service is running and accessible
4. Verify CORS configuration on your backend

---

**Last Updated**: September 11, 2025
