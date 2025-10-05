import { useServiceStore } from '../store/serviceStore'
import { useArtists } from '../hooks/useMusicData'
import ListView from '../components/ListView'
import './ArtistsView.css'

function ArtistsView() {
  const { hasConfiguredServices } = useServiceStore()
  
  // Fetch artists from configured services
  const { data: artists = [], isLoading, error } = useArtists()
  
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
  
  // Show empty state if no services configured
  if (!hasConfiguredServices()) {
    return (
      <div className="artists-view view-wrapper">
        <div className="empty-container">
          <div className="empty-text">No services configured</div>
          <div className="empty-subtext">Go to Settings to connect a music service</div>
        </div>
      </div>
    )
  }
  
  // Show empty state if no artists
  if (formattedArtists.length === 0) {
    return (
      <div className="artists-view view-wrapper">
        <div className="empty-container">
          <div className="empty-text">No artists found</div>
          <div className="empty-subtext">Your library is empty</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="artists-view view-wrapper">
      <ListView items={formattedArtists} onItemClick={handleArtistClick} />
    </div>
  )
}

export default ArtistsView
