import { useState, useEffect, useMemo } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import { usePlayerStore } from '../store/playerStore'
import { backendAPI } from '../services/backendClient'
import ListView from '../components/ListView'
import './ArtistDetailsView.css'

function ArtistDetailsView() {
  const [artist, setArtist] = useState(null)
  const [albums, setAlbums] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const { navigateTo } = useNavigationStore()
  const { playTrack, currentTrack } = usePlayerStore()

  // Load artist data from localStorage
  useEffect(() => {
    const artistData = JSON.parse(localStorage.getItem('selectedArtist') || 'null')

    if (artistData) {
      setArtist(artistData)
      fetchArtistAlbums(artistData)
    } else {
      setError('No artist selected')
      setIsLoading(false)
    }
  }, [])

  const fetchArtistAlbums = async (artistData) => {
    try {
      setIsLoading(true)
      setError(null)

      // Extract the actual artist ID from the service-prefixed ID
      const artistId = artistData.id.startsWith('ytm:') 
        ? artistData.id.substring(4) 
        : artistData.id

      // Fetch albums for this artist
      const albumsData = await backendAPI.getArtistAlbums(artistId)
      setAlbums(albumsData || [])
    } catch (err) {
      console.error('Error fetching artist albums:', err)
      setError('Failed to load artist albums')
      setAlbums([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAlbumClick = (album) => {
    console.log('Album clicked:', album.title)
    
    // Store the selected album for the details view
    localStorage.setItem('selectedAlbum', JSON.stringify(album))
    
    // Navigate to album details view
    navigateTo('albumDetails')
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="artist-details-view view-wrapper">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div>Loading artist...</div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="artist-details-view view-wrapper">
        <div className="error-container">
          <div className="error-icon">!</div>
          <div className="error-message">{error}</div>
        </div>
      </div>
    )
  }

  // Show empty state if no artist
  if (!artist) {
    return (
      <div className="artist-details-view view-wrapper">
        <div className="empty-container">
          <div className="empty-text">No artist selected</div>
        </div>
      </div>
    )
  }

  // Format albums for ListView
  const formattedAlbums = albums.map(album => ({
    ...album,
    title: album.title || album.name || 'Unknown Album',
    subtitle: album.year ? `${album.year}` : 'Album',
  }))

  return (
    <div className="artist-details-view view-wrapper">
      <div className="view-header">
        <h2>{artist.name}</h2>
        <div className="artist-info">
          {albums.length > 0 && <span>{albums.length} albums</span>}
        </div>
      </div>

      {formattedAlbums.length > 0 ? (
        <ListView items={formattedAlbums} onItemClick={handleAlbumClick} />
      ) : (
        <div className="empty-container">
          <div className="empty-text">No albums found for this artist</div>
        </div>
      )}
    </div>
  )
}

export default ArtistDetailsView
