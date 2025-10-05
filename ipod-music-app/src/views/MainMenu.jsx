import { useNavigationStore } from '../store/navigationStore'
import ListView from '../components/ListView'
import './MainMenu.css'

function MainMenu() {
  const { navigateTo } = useNavigationStore()
  
  const menuItems = [
    { id: 'playlists', title: 'Playlists', icon: '📋', view: 'playlists' },
    { id: 'artists', title: 'Artists', icon: '🎤', view: 'artists' },
    { id: 'albums', title: 'Albums', icon: '💿', view: 'albums' },
    { id: 'songs', title: 'Songs', icon: '🎵', view: 'songs' },
    { id: 'search', title: 'Search', icon: '🔍', view: 'search' },
    { id: 'nowPlaying', title: 'Now Playing', icon: '▶️', view: 'nowPlaying' },
    { id: 'settings', title: 'Settings', icon: '⚙️', view: 'settings' },
  ]
  
  const handleItemClick = (item) => {
    console.log('Main menu item clicked:', item.title)
    navigateTo(item.view, true)
  }
  
  return (
    <div className="main-menu-view view-wrapper">
      <ListView items={menuItems} onItemClick={handleItemClick} />
    </div>
  )
}

export default MainMenu
