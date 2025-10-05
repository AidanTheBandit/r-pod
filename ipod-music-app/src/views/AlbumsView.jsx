import { useServiceStore } from '../store/serviceStore'
import { useAlbums } from '../hooks/useMusicData'
import ListView from '../components/ListView'
import './AlbumsView.css'

function AlbumsView() {
  // Fetch albums from configured services
  const { data: albums = [], isLoading, error } = useAlbums()
  
  // Format albums for ListView
  const formattedAlbums = albums.map(album => ({
    ...album,
    subtitle: album.year ? `${album.artist} • ${album.year}` : album.artist,
  }))
  
  const handleAlbumClick = (album) => {
    console.log('Album clicked:', album.title)
    // TODO: Navigate to album details view with tracks
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="albums-view view-wrapper">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div>Loading albums...</div>
        </div>
      </div>
    )
  }
  
  // Show error state
  if (error) {
    return (
      <div className="albums-view view-wrapper">
        <div className="error-container">
          <div className="error-icon">!</div>
          <div className="error-message">Failed to load albums</div>
        </div>
      </div>
    )
  }
  
  // Show empty state if no albums
  if (formattedAlbums.length === 0) {
    return (
      <div className="albums-view view-wrapper">
        <div className="empty-container">
          <div className="empty-text">No albums available</div>
          <div className="empty-subtext">Try searching for albums in the Search tab</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="albums-view view-wrapper">
      {formattedAlbums.length > 0 && (
        <div className="view-header">
          <h2>Popular Albums</h2>
        </div>
      )}
      <ListView items={formattedAlbums} onItemClick={handleAlbumClick} />
    </div>
  )
}

export default AlbumsView
