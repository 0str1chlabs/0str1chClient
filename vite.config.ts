import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': 'http://localhost:8090',
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Expose environment variables to the client
  define: {
    // Expose all VITE_ prefixed environment variables
    'process.env': process.env
  },
  // Optionally strip console/debugger in production builds via env flag
  // Production build configuration for maximum obfuscation
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove all console.log calls
        drop_debugger: true, // Remove debugger statements
      },
      mangle: {
        toplevel: true, // Mangle top-level variable names
      },
      format: {
        comments: false, // Remove all comments
      },
    },
  },
  // Environment variable handling
  envPrefix: 'VITE_'
}));
