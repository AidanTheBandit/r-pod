import { useServiceStore } from '../store/serviceStore'
import { usePlaylists } from '../hooks/useMusicData'
import ListView from '../components/ListView'
import './PlaylistsView.css'

function PlaylistsView() {
  const { hasConfiguredServices } = useServiceStore()
  
  // Fetch playlists from configured services
  const { data: playlists = [], isLoading, error } = usePlaylists()
  
  // Format playlists for ListView
  const formattedPlaylists = playlists.map(playlist => ({
    ...playlist,
    subtitle: playlist.trackCount ? `${playlist.trackCount} songs` : 'Unknown songs',
  }))
  
  const handlePlaylistClick = (playlist) => {
    console.log('Playlist clicked:', playlist.title)
    // TODO: Navigate to playlist details view with tracks
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="playlists-view view-wrapper">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div>Loading playlists...</div>
        </div>
      </div>
    )
  }
  
  // Show error state
  if (error) {
    return (
      <div className="playlists-view view-wrapper">
        <div className="error-container">
          <div className="error-icon">!</div>
          <div className="error-message">Failed to load playlists</div>
        </div>
      </div>
    )
  }
  
  // Show empty state if no services configured
  if (!hasConfiguredServices()) {
    return (
      <div className="playlists-view view-wrapper">
        <div className="empty-container">
          <div className="empty-text">No services configured</div>
          <div className="empty-subtext">Go to Settings to connect a music service</div>
        </div>
      </div>
    )
  }
  
  // Show empty state if no playlists
  if (formattedPlaylists.length === 0) {
    return (
      <div className="playlists-view view-wrapper">
        <div className="empty-container">
          <div className="empty-text">No playlists in library</div>
          <div className="empty-subtext">Use the Search tab to find and play music from YouTube Music</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="playlists-view view-wrapper">
      <ListView items={formattedPlaylists} onItemClick={handlePlaylistClick} />
    </div>
  )
}

export default PlaylistsView
