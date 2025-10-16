#!/usr/bin/env node

/**
 * Advanced Development Server with Hot Reload, Proxy, and Development Tools
 */
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')

// Development configuration
const config = {
  plugins: [react()],
  root,
  server: {
    port: 5173,
    host: true,
    open: '/maestro',
    cors: true,
    
    // Development proxy for API calls
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.log('🔴 Proxy error:', err.message)
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔵 Proxying:', req.method, req.url)
          })
        }
      },
      
      // WebSocket proxy for real-time features
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true
      }
    },
    
    // Development middleware
    middlewareMode: false,
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    }
  },
  
  // Development optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom', 
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      'recharts'
    ]
  },
  
  // Development build configuration
  build: {
    sourcemap: true,
    minify: false
  },
  
  // Environment variables
  define: {
    __DEV__: true,
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
}

async function startDevServer() {
  console.log('🚀 Starting Maestro Development Server...')
  
  try {
    // Create Vite development server
    const server = await createServer(config)
    
    // Start the server
    await server.listen()
    
    console.log('✅ Development server started successfully!')
    console.log('')
    console.log('📋 Server Information:')
    console.log(`  - Local:   http://localhost:5173/maestro`)
    const ip = await getLocalIP()
    console.log(`  - Network: http://${ip}:5173/maestro`)
    console.log('')
    console.log('🛠️  Development Features:')
    console.log('  - Hot Module Replacement (HMR) enabled')
    console.log('  - API proxy to backend services')
    console.log('  - Source maps for debugging')
    console.log('  - Real-time error overlay')
    console.log('')
    console.log('⌨️  Keyboard Shortcuts:')
    console.log('  - r + enter: Restart server')
    console.log('  - o + enter: Open in browser')
    console.log('  - c + enter: Clear console')
    console.log('  - q + enter: Quit server')
    
    // Add development helpers
    setupDevHelpers(server)
    
    // Handle process termination
    process.on('SIGTERM', () => {
      console.log('\n👋 Shutting down development server...')
      server.close()
      process.exit(0)
    })
    
  } catch (error) {
    console.error('❌ Failed to start development server:', error)
    process.exit(1)
  }
}

function setupDevHelpers(server) {
  // Keyboard shortcuts for development
  process.stdin.setRawMode?.(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')
  
  process.stdin.on('data', async (key) => {
    const str = key.toString().trim()
    
    switch (str) {
      case 'r':
        console.log('🔄 Restarting server...')
        await server.restart()
        console.log('✅ Server restarted!')
        break
        
      case 'o':
        const { exec } = await import('child_process')
        exec('open http://localhost:5173/maestro')
        console.log('🌐 Opening browser...')
        break
        
      case 'c':
        console.clear()
        console.log('🧹 Console cleared!')
        break
        
      case 'q':
        console.log('\n👋 Shutting down...')
        process.exit(0)
        break
        
      case '\u0003': // Ctrl+C
        console.log('\n👋 Shutting down...')
        process.exit(0)
        break
    }
  })
}

async function getLocalIP() {
  const { networkInterfaces } = await import('os')
  const nets = networkInterfaces()
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  
  return 'localhost'
}

// Start the development server
startDevServer()
