import { useEffect, useRef, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNavigationStore } from './store/navigationStore'
import { usePlayerStore } from './store/playerStore'
import { useServiceStore } from './store/serviceStore'
import { useThemeStore } from './store/themeStore'
import { backendAPI } from './services/backendClient'
import { useDeviceControls } from './hooks/useDeviceControls'
import { ui } from 'r1-create'
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
import PlaylistDetailsView from './views/PlaylistDetailsView'
import ArtistDetailsView from './views/ArtistDetailsView'
import AlbumDetailsView from './views/AlbumDetailsView'
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
      const newTime = audio.currentTime
      updateCurrentTime(newTime)
    }
    
        const handleDurationChange = () => {
      const newDuration = audio.duration
      console.log('[Audio] Duration changed:', newDuration, 'Current time:', audio.currentTime)
      if (newDuration && !isNaN(newDuration) && newDuration > 0) {
        setDuration(newDuration)
      }
    }
    
    // Fallback: Check duration periodically for streaming audio
    const checkDurationFallback = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        const currentDuration = get().duration
        if (audio.duration !== currentDuration) {
          console.log('[Audio] Duration fallback:', audio.duration)
          setDuration(audio.duration)
        }
      }
    }
    
    const handleEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0
        audio.play()
      } else {
        playNext()
      }
    }
    
    // Periodic duration check for streaming audio
    const durationCheckInterval = setInterval(checkDurationFallback, 1000)
    
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
      clearInterval(durationCheckInterval)
    }
  }, [updateCurrentTime, setDuration, playNext, repeat])
  
  // Handle authentication for audio streams
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack?.streamUrl) return

    const loadAudio = async () => {
      try {
        console.log('[Audio] Loading stream:', currentTrack.streamUrl)
        
        // Clear any previous error
        usePlayerStore.setState({ error: null })
        
        // Reset audio
        audio.pause()
        audio.currentTime = 0
        
        // Set the stream URL directly - our backend proxies it
        audio.src = currentTrack.streamUrl
        
        // Load and play
        await audio.load()
        
        if (isPlaying) {
          try {
            await audio.play()
            console.log('[Audio] ✓ Playback started')
          } catch (playError) {
            console.error('[Audio] Play error:', playError)
            usePlayerStore.setState({ error: 'Playback failed. Try another song.' })
          }
        }
      } catch (error) {
        console.error('[Audio] Load error:', error)
        usePlayerStore.setState({ error: 'Failed to load audio. Check connection.' })
      }
    }

    loadAudio()
  }, [currentTrack])

  return (
    <audio
      ref={audioRef}
      preload="auto"
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
  const { theme } = useThemeStore()

  // Initialize device controls
  useDeviceControls(sdk)

  // Setup viewport for R1 device
  useEffect(() => {
    ui.setupViewport()
  }, [])

  // Apply theme to body
  useEffect(() => {
    document.body.className = theme
  }, [theme])

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
      case 'playlistDetails':
        return <PlaylistDetailsView />
      case 'artistDetails':
        return <ArtistDetailsView />
      case 'albumDetails':
        return <AlbumDetailsView />
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
    <div className={`ipod-app ${theme}`}>
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
