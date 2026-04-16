import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    // Load environment variables based on the current mode
    const env = loadEnv(mode, path.resolve(), '');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Map Gemini API Key to process.env for SDK compatibility
        'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY || ''),
        
        // Define standard process.env to prevent crashes in libraries
        'process.env': {},

        // Explicitly define VITE variables for consistent access in the preview
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY || 'AIzaSyBNgp4ZKBq_sHjVC0OGwSidhzCOtoGYR4k'),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || 'smart-health-dce40.firebaseapp.com'),
        'import.meta.env.VITE_FIREBASE_DATABASE_URL': JSON.stringify(env.VITE_FIREBASE_DATABASE_URL || 'https://smart-health-dce40-default-rtdb.asia-southeast1.firebasedatabase.app'),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || 'smart-health-dce40'),
        'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || 'smart-health-dce40.firebasestorage.app'),
        'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || '81529782106'),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID || '1:81529782106:web:286029a5dc050cd0423d63'),
        'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(env.VITE_FIREBASE_MEASUREMENT_ID || 'G-CSK81WMJEQ'),
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false,
      }
    };
});
