import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createR1App, ui } from 'r1-create'
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

// Check if we're in R1 environment
const isR1Environment = typeof window.PluginMessageHandler !== 'undefined'

if (isR1Environment) {
  // Initialize R1 app
  createR1App(async (sdk) => {
    console.log('[R1] iPod Music App initializing...')
    
    // Setup R1 viewport optimization
    ui.setupViewport()
    console.log('[R1] Viewport configured for 240x282px display')

    // Mount React app
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <App sdk={sdk} />
        </QueryClientProvider>
      </React.StrictMode>,
    )

    console.log('[R1] App ready - Controls: Scroll Wheel + PTT Button')
  })
} else {
  // Fallback for browser development (no R1 device)
  console.log('[Browser] Running in development mode')
  console.log('[Browser] Use arrow keys + space bar to simulate scroll wheel & PTT')

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App sdk={null} />
      </QueryClientProvider>
    </React.StrictMode>,
  )
}
