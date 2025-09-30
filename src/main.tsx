import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.tsx'
import './index.css'

// Disable console methods in production at runtime when stripping is enabled
if (import.meta.env.PROD && import.meta.env.VITE_STRIP_CONSOLE === 'true') {
  const noop = () => {};
  // Preserve error and warn if you prefer, otherwise no-op them as well
  console.log = noop;
  console.debug = noop;
  console.info = noop;
  console.trace = noop;
  console.table = noop as unknown as typeof console.table;
  console.group = noop;
  console.groupCollapsed = noop;
  console.groupEnd = noop;
  console.time = noop as unknown as typeof console.time;
  console.timeEnd = noop as unknown as typeof console.timeEnd;
  // Uncomment to silence warnings/errors too:
  // console.warn = noop;
  // console.error = noop;
}

// Global error surfacing to help debug stalls
window.addEventListener('error', (e) => {
  // Surface to console and optionally to a toast if available later
  console.error('Global error:', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id'}>
    <App />
  </GoogleOAuthProvider>
);
