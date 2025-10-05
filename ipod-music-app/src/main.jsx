import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createR1App } from 'r1-create'
import App from './App'
import './styles/index.css'

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
})

// Initialize R1 app
createR1App(async (sdk) => {
  console.log('🎵 iPod Music App initializing...')
  
  // Mount React app
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App sdk={sdk} />
      </QueryClientProvider>
    </React.StrictMode>,
  )
  
  console.log('✅ iPod Music App ready!')
})

// Fallback for browser development (no R1 device)
if (typeof window.PluginMessageHandler === 'undefined') {
  console.log('🌐 Running in browser mode (development)')
  
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App sdk={null} />
      </QueryClientProvider>
    </React.StrictMode>,
  )
}
