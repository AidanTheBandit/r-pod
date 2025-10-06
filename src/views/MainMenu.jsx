import { useNavigationStore } from '../store/navigationStore'
import ListView from '../components/ListView'
import './MainMenu.css'

function MainMenu() {
  const { navigateTo } = useNavigationStore()
  
  const menuItems = [
    { id: 'playlists', title: 'Playlists', view: 'playlists' },
    { id: 'artists', title: 'Artists', view: 'artists' },
    { id: 'albums', title: 'Albums', view: 'albums' },
    { id: 'songs', title: 'Songs', view: 'songs' },
    { id: 'search', title: 'Search', view: 'search' },
    { id: 'nowPlaying', title: 'Now Playing', view: 'nowPlaying' },
    { id: 'settings', title: 'Settings', view: 'settings' },
  ]
  
  const handleItemClick = (item) => {
    console.log('Main menu item clicked:', item.title)
    navigateTo(item.view, true)
  }
  
  return (
    <div className="main-menu-view view-wrapper">
      <ListView items={menuItems} onItemClick={handleItemClick} className="ui-list" />
    </div>
  )
}

export default MainMenu
