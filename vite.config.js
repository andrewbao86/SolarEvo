import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  // Entry point for the application
  build: {
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    },
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  
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
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['aws-amplify', '@aws-amplify/ui-react']
  },
  
  // Handle CommonJS modules
  resolve: {
    alias: {
      './runtimeConfig': './runtimeConfig.browser',
    }
  }
}) 