import { useEffect, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNavigationStore } from './store/navigationStore'
import { usePlayerStore } from './store/playerStore'
import { useDeviceControls } from './hooks/useDeviceControls'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import MainMenu from './views/MainMenu'
import SongsView from './views/SongsView'
import AlbumsView from './views/AlbumsView'
import ArtistsView from './views/ArtistsView'
import PlaylistsView from './views/PlaylistsView'
import NowPlayingView from './views/NowPlayingView'
import SettingsView from './views/SettingsView'
import SearchView from './views/SearchView'
import './styles/App.css'

// Create React Query client with production settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: false,
    },
  },
})

// Loading fallback component
const LoadingFallback = () => (
  <div className="loading-fallback view-wrapper">
    <div className="loading-container">
      <div className="loading-spinner" />
      <div>Loading...</div>
    </div>
  </div>
)

function AppContent({ sdk }) {
  const { currentView } = useNavigationStore()

  // Initialize device controls
  useDeviceControls(sdk)

  useEffect(() => {
    console.log('App mounted, current view:', currentView)
  }, [currentView])

  // Render current view with error boundary
  const renderView = () => {
    switch (currentView) {
      case 'mainMenu':
        return <MainMenu />
      case 'songs':
        return <SongsView />
      case 'albums':
        return <AlbumsView />
      case 'artists':
        return <ArtistsView />
      case 'playlists':
        return <PlaylistsView />
      case 'nowPlaying':
        return <NowPlayingView />
      case 'settings':
        return <SettingsView />
      case 'search':
        return <SearchView />
      default:
        return <MainMenu />
    }
  }

  return (
    <div className="ipod-app">
      <Header />
      <div className="view-container">
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            {renderView()}
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}

function App({ sdk }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent sdk={sdk} />
    </QueryClientProvider>
  )
}

export default App
