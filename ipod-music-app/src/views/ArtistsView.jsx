import { useState } from 'react'
import { useServiceStore } from '../store/serviceStore'
import { useArtists } from '../hooks/useMusicData'
import ListView from '../components/ListView'
import './ArtistsView.css'

function ArtistsView() {
  const [artistType, setArtistType] = useState('user') // 'user' or 'popular'
  
  // Fetch artists from configured services with infinite scroll
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useArtists(artistType)
  
  // Flatten the paginated data
  const artists = data?.pages?.flatMap(page => page.data) || []
  
  // Format artists for ListView
  const formattedArtists = artists.map(artist => ({
    ...artist,
    title: artist.name,
    subtitle: artist.trackCount ? `${artist.trackCount} songs` : 'Unknown songs',
  }))
  
  const handleArtistClick = (artist) => {
    console.log('Artist clicked:', artist.name)
    // TODO: Navigate to artist details view with albums/tracks
  }
  
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      return fetchNextPage()
    }
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="artists-view view-wrapper">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div>Loading artists...</div>
        </div>
      </div>
    )
  }
  
  // Show error state
  if (error) {
    return (
      <div className="artists-view view-wrapper">
        <div className="error-container">
          <div className="error-icon">!</div>
          <div className="error-message">Failed to load artists</div>
        </div>
      </div>
    )
  }
  
  // Show empty state if no artists
  if (formattedArtists.length === 0) {
    return (
      <div className="artists-view view-wrapper">
        <div className="empty-container">
          <div className="empty-text">No artists available</div>
          <div className="empty-subtext">Try searching for artists in the Search tab</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="artists-view view-wrapper">
      {formattedArtists.length > 0 && (
        <div className="view-header">
          <h2>{artistType === 'user' ? 'Your Artists' : 'Popular Artists'}</h2>
          <div className="view-controls">
            <button 
              className={`control-btn ${artistType === 'user' ? 'active' : ''}`}
              onClick={() => setArtistType('user')}
            >
              Your Artists
            </button>
            <button 
              className={`control-btn ${artistType === 'popular' ? 'active' : ''}`}
              onClick={() => setArtistType('popular')}
            >
              Popular
            </button>
          </div>
        </div>
      )}
      <ListView 
        items={formattedArtists} 
        onItemClick={handleArtistClick}
        onLoadMore={handleLoadMore}
        hasMore={hasNextPage}
        loading={isFetchingNextPage}
      />
    </div>
  )
}

export default ArtistsView
