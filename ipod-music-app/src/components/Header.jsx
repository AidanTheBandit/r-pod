import { useNavigationStore } from '../store/navigationStore'
import './Header.css'

function Header() {
  const { currentView, navigateBack, canGoBack } = useNavigationStore()
  
  const viewTitles = {
    mainMenu: 'Music',
    songs: 'Songs',
    albums: 'Albums',
    artists: 'Artists',
    playlists: 'Playlists',
    nowPlaying: 'Now Playing',
    settings: 'Settings',
    search: 'Search',
  }
  
  const title = viewTitles[currentView] || 'Music'
  const showBack = canGoBack()
  
  return (
    <header className="ipod-header">
      <div className="header-left">
        {showBack && (
          <span
            className="back-indicator visible"
            onClick={navigateBack}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && navigateBack()}
          >
            ‹ Menu
          </span>
        )}
      </div>
      <div className="header-title">{title}</div>
      <div className="header-right">
        <span className="battery-icon">🔋</span>
      </div>
    </header>
  )
}

export default Header
