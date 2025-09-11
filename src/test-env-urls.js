// Test script to verify backend URL configuration
// Run this in the browser console to debug environment variables

console.log('🔧 Environment Variables Test:');
console.log('================================');
console.log('VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('VITE_AISERVER_URL:', import.meta.env.VITE_AISERVER_URL);
console.log('MODE:', import.meta.env.MODE);
console.log('PROD:', import.meta.env.PROD);
console.log('DEV:', import.meta.env.DEV);
console.log('================================');

// Test URL resolution
const testUrls = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090';

  console.log('🔧 URL Resolution Test:');
  console.log('Resolved backend URL:', backendUrl);
  console.log('Mega API endpoint:', `${backendUrl}/api/mega`);
  console.log('Auth API endpoint:', `${backendUrl}/api/auth`);
  console.log('AI API endpoint:', `${backendUrl}/api/ai`);

  // Test if URL is localhost (which would indicate a problem)
  if (backendUrl.includes('localhost') && import.meta.env.PROD) {
    console.error('❌ WARNING: Using localhost in production! This is likely the issue.');
    console.error('   Make sure VITE_BACKEND_URL is set to your Render URL in production.');
  } else if (backendUrl.includes('localhost') && import.meta.env.DEV) {
    console.log('✅ Using localhost in development - this is correct.');
  } else {
    console.log('✅ Using production URL - this looks good.');
  }
};

testUrls();

// Export for manual testing
window.testBackendUrls = testUrls;
