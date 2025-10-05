import { useEffect, useRef, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNavigationStore } from './store/navigationStore'
import { usePlayerStore } from './store/playerStore'
import { useServiceStore } from './store/serviceStore'
import { backendAPI } from './services/backendClient'
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

// Background player component that stays mounted
function BackgroundPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    updateCurrentTime,
    setDuration,
    setAudioElement,
    repeat,
  } = usePlayerStore()
  
  const audioRef = useRef(null)
  
  // Set audio element in store
  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current)
    }
  }, [setAudioElement])
  
  // Update current time
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    
    const handleTimeUpdate = () => {
      updateCurrentTime(audio.currentTime)
    }
    
    const handleDurationChange = () => {
      setDuration(audio.duration)
    }
    
    const handleEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0
        audio.play()
      } else {
        playNext()
      }
    }
    
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [updateCurrentTime, setDuration, playNext, repeat])
  
  // Handle authentication for audio streams
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack?.streamUrl) return

    const loadAudio = async () => {
      try {
        // First, try to fetch the stream URL to see if it's a redirect
        const response = await fetch(currentTrack.streamUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, audio/*',
          },
        })

        if (response.headers.get('content-type')?.includes('application/json')) {
          // This is a JSON response (redirect to YouTube)
          const data = await response.json()
          if (data.type === 'youtube_url') {
            console.log('Streaming not available, opening YouTube:', data.url)
            // Open YouTube in new tab
            window.open(data.url, '_blank')
            // Show error in player
            usePlayerStore.setState({ error: 'Streaming not available. Opened in YouTube.' })
            return
          }
        }

        // It's audio data, set it as src
        const urlWithAuth = currentTrack.streamUrl
        audio.src = urlWithAuth
      } catch (error) {
        console.error('Error loading audio:', error)
        usePlayerStore.setState({ error: 'Failed to load audio stream' })
      }
    }

    loadAudio()
  }, [currentTrack])

  return (
    <audio
      ref={audioRef}
      crossOrigin="anonymous"
      autoPlay={isPlaying}
    />
  )
}

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
  const { toggleService, services } = useServiceStore()

  // Initialize device controls
  useDeviceControls(sdk)

  // Auto-connect YouTube Music on app startup
  useEffect(() => {
    const autoConnectYouTubeMusic = async () => {
      // Only auto-connect if not already connected
      if (!services.youtubeMusic.enabled) {
        try {
          console.log('Attempting to auto-connect YouTube Music...')
          await backendAPI.connectService('youtubeMusic', {})
          toggleService('youtubeMusic', true)
          console.log('YouTube Music auto-connected successfully!')
        } catch (error) {
          console.log('YouTube Music auto-connect failed (expected if no cookie):', error.message)
        }
      }
    }

    // Small delay to ensure backend is ready
    const timer = setTimeout(autoConnectYouTubeMusic, 1000)
    return () => clearTimeout(timer)
  }, [services.youtubeMusic.enabled, toggleService])

  useEffect(() => {
    console.log('App mounted, current view:', currentView)
  }, [])

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
      <BackgroundPlayer />
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
