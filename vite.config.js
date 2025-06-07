import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  // Entry point for the application
  root: 'frontend',
    build: {
    rollupOptions: {
      input: {
        main: 'frontend/index.html',
        admin: 'frontend/admin.html',
        debug: 'frontend/debug-env.html'
      }
    },
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: true,
    copyPublicDir: true
  },
  
  // Static file handling - includes all environment files
  publicDir: 'frontend/public',
  
  // Plugins for legacy browser support and optimization
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  
  // Server configuration for development
  server: {
    port: 3000,
    open: true
  },
  
  // Define global constants
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['aws-amplify', '@aws-amplify/ui-react'],
    exclude: ['app.js', 'public/app.js']
  },
  
  // Handle CommonJS modules
  resolve: {
    alias: {
      '@backend': new URL('./backend', import.meta.url).pathname,
      '@config': new URL('./config', import.meta.url).pathname,
      './runtimeConfig': './runtimeConfig.browser',
    }
  }
}) 