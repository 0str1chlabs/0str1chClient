# 🔒 Frontend Security Guide

## ✅ Current Security Status

### **GOOD NEWS: Most API Calls Are Secure**

Your frontend codebase correctly routes **all production AI API calls** through the backend server:

- ✅ **Gemini API**: All calls go through `/api/ai/gemini/generate-charts-kpis` on backend
- ✅ **Mistral/OpenRouter**: All production calls go through `/api/ai/ai1` on backend
- ✅ **No hardcoded API keys** found in source code
- ✅ **No direct external API calls** in production code paths

### ⚠️ **FIXED: Security Issue**

**Issue**: The `testConnection()` method in `mistralService.ts` was making direct calls to OpenRouter API with frontend API keys.

**Status**: ✅ **FIXED** - Now tests backend health endpoint instead

---

## 🚫 **NEVER DO THIS**

### ❌ **DO NOT** set these in frontend `.env` files:

```bash
# ❌ NEVER SET THESE IN FRONTEND
VITE_OPENROUTER_API_KEY=your_key_here    # EXPOSES API KEY TO CLIENT
VITE_GEMINI_API_KEY=your_key_here        # EXPOSES API KEY TO CLIENT
VITE_TAVILY_API_KEY=your_key_here        # EXPOSES API KEY TO CLIENT
```

**Why?** Any environment variable prefixed with `VITE_` is bundled into your frontend JavaScript and becomes **publicly visible** to anyone who:
- Views page source
- Opens browser DevTools
- Inspects network requests
- Downloads your frontend bundle

---

## ✅ **CORRECT APPROACH**

### **All API Keys Should Be in Backend Only**

1. **Store API keys in backend** (AIServer folder):
   ```bash
   # AIServer/.env (backend only)
   OPENROUTER_API_KEY=your_key_here
   GEMINI_API_KEY=your_key_here
   TAVILY_API_KEY=your_key_here
   ```

2. **Frontend calls backend endpoints**:
   ```typescript
   // ✅ CORRECT - Frontend calls backend
   const response = await fetch(`${backendUrl}/api/ai/ai1`, {
     method: 'POST',
     body: JSON.stringify({ message: prompt })
   });
   ```

3. **Backend makes API calls** with keys:
   ```typescript
   // ✅ CORRECT - Backend uses API keys
   const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
     headers: {
       'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` // Server-side only
     }
   });
   ```

---

## 📋 **Frontend Environment Variables**

### **Safe to Use in Frontend:**

```bash
# ✅ These are safe - they're just URLs, not secrets
VITE_BACKEND_URL=https://your-backend.onrender.com
VITE_API_URL=https://your-backend.onrender.com
VITE_AISERVER_URL=https://your-backend.onrender.com

# ✅ Public client IDs are OK (used for OAuth)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### **Never Use in Frontend:**

```bash
# ❌ These are SECRETS - backend only!
OPENROUTER_API_KEY
GEMINI_API_KEY
TAVILY_API_KEY
JWT_SECRET
JWT_REFRESH_SECRET
EMAIL_ENCRYPTION_KEY
DATABASE_URL
MONGODB_URI
BACKBLAZE_ACCOUNT_ID
BACKBLAZE_APPLICATION_KEY
```

---

## 🔍 **How to Verify Security**

### 1. **Check Built Frontend Code**

After building (`npm run build`), check the `dist` folder:

```bash
# Search for any API keys in built files
grep -r "sk-" dist/
grep -r "AIza" dist/
grep -r "Bearer" dist/
```

Should return **no results** if secure.

### 2. **Check Browser DevTools**

1. Open your deployed frontend
2. Open DevTools → Sources tab
3. Search for `OPENROUTER_API_KEY` or `GEMINI_API_KEY`
4. Should **not find** any API keys

### 3. **Check Network Tab**

1. Open DevTools → Network tab
2. Make an AI request
3. Check request headers - should **not** contain API keys
4. API keys should only be in backend requests (which are server-side)

---

## 🛡️ **Security Best Practices**

### 1. **Always Use Backend Proxy**

```typescript
// ✅ CORRECT
const backendUrl = import.meta.env.VITE_BACKEND_URL;
await fetch(`${backendUrl}/api/ai/ai1`, { ... });

// ❌ WRONG
await fetch('https://openrouter.ai/api/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${apiKey}` } // DON'T DO THIS
});
```

### 2. **Validate Environment Variables**

Add validation in your backend to ensure API keys are set:

```typescript
// Backend startup validation
if (!process.env.OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY not configured');
}
```

### 3. **Use Environment-Specific Configs**

- **Development**: `.env.local` (gitignored)
- **Production**: Set in deployment platform (Vercel, Render, etc.)
- **Never commit**: `.env` files with real keys

---

## 📝 **Current Architecture**

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │────────▶│   Backend    │────────▶│   AI APIs   │
│  (React)    │  HTTP   │  (Express)   │  API    │ (OpenRouter)│
│             │  POST   │              │  Keys   │             │
│             │         │  (API Keys)  │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
     ✅ Safe                  ✅ Secure              ✅ Protected
```

**Frontend** → Makes HTTP requests to backend  
**Backend** → Holds API keys, makes external API calls  
**AI APIs** → Receive requests from backend only

---

## ✅ **Security Checklist**

- [x] No API keys in frontend `.env` files
- [x] All AI calls route through backend
- [x] No hardcoded secrets in source code
- [x] `testConnection()` fixed to use backend
- [x] `.gitignore` properly configured
- [ ] Add API key validation on backend startup
- [ ] Set up monitoring for unauthorized API usage
- [ ] Implement rate limiting on backend
- [ ] Add request logging for security audits

---

## 🚨 **If You Accidentally Exposed a Key**

1. **Immediately rotate the API key** in the provider dashboard
2. **Remove the key** from frontend environment variables
3. **Check access logs** for unauthorized usage
4. **Review git history** to see if key was committed
5. **If committed**: Remove from git history (requires force push)

---

## 📚 **Additional Resources**

- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [React Security Best Practices](https://reactjs.org/docs/security.html)

---

**Last Updated**: January 2025  
**Status**: ✅ Secure (after fixes applied)

