import { useServiceStore } from '../store/serviceStore'
import { useArtists } from '../hooks/useMusicData'
import ListView from '../components/ListView'
import './ArtistsView.css'

function ArtistsView() {
  // Fetch artists from configured services
  const { data: artists = [], isLoading, error } = useArtists()
  
  console.log('ArtistsView: artists data:', artists)
  console.log('ArtistsView: isLoading:', isLoading)
  console.log('ArtistsView: error:', error)
  
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
          <h2>Popular Artists</h2>
        </div>
      )}
      <ListView items={formattedArtists} onItemClick={handleArtistClick} />
    </div>
  )
}

export default ArtistsView
