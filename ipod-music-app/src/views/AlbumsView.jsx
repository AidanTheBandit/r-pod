import { useState } from 'react'
import { useServiceStore } from '../store/serviceStore'
import { useAlbums } from '../hooks/useMusicData'
import ListView from '../components/ListView'
import './AlbumsView.css'

function AlbumsView() {
  const [albumType, setAlbumType] = useState('user') // 'user' or 'popular'
  
  // Fetch albums from configured services with infinite scroll
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useAlbums(albumType)
  
  // Flatten the paginated data
  const albums = data?.pages?.flatMap(page => page.data) || []
  
  // Format albums for ListView
  const formattedAlbums = albums.map(album => ({
    ...album,
    subtitle: album.year ? `${album.artist} • ${album.year}` : album.artist,
  }))
  
  const handleAlbumClick = (album) => {
    console.log('Album clicked:', album.title)
    // TODO: Navigate to album details view with tracks
  }
  
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      return fetchNextPage()
    }
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
          <h2>{albumType === 'user' ? 'Your Albums' : 'Popular Albums'}</h2>
          <div className="view-controls">
            <button 
              className={`control-btn ${albumType === 'user' ? 'active' : ''}`}
              onClick={() => setAlbumType('user')}
            >
              Your Albums
            </button>
            <button 
              className={`control-btn ${albumType === 'popular' ? 'active' : ''}`}
              onClick={() => setAlbumType('popular')}
            >
              Popular
            </button>
          </div>
        </div>
      )}
      <ListView 
        items={formattedAlbums} 
        onItemClick={handleAlbumClick}
        onLoadMore={handleLoadMore}
        hasMore={hasNextPage}
        loading={isFetchingNextPage}
      />
    </div>
  )
}

export default AlbumsView
