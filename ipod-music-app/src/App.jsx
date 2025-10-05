import { useEffect } from 'react'
import { useNavigationStore } from './store/navigationStore'
import { usePlayerStore } from './store/playerStore'
import { useDeviceControls } from './hooks/useDeviceControls'
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

function App({ sdk }) {
  const { currentView } = useNavigationStore()
  
  // Initialize device controls
  useDeviceControls(sdk)
  
  useEffect(() => {
    console.log('App mounted, current view:', currentView)
  }, [currentView])
  
  // Render current view
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
        {renderView()}
      </div>
    </div>
  )
}

export default App
