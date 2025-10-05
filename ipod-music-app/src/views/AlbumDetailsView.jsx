import { useState, useEffect, useMemo } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import { usePlayerStore } from '../store/playerStore'
import { backendAPI } from '../services/backendClient'
import ListView from '../components/ListView'
import './AlbumDetailsView.css'

function AlbumDetailsView() {
  const [album, setAlbum] = useState(null)
  const [tracks, setTracks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const { currentView } = useNavigationStore()
  const { playTrack, currentTrack } = usePlayerStore()

  // Format tracks for ListView - MUST be before any conditional returns
  const formattedTracks = useMemo(() => {
    return tracks.map(track => ({
      ...track,
      title: track.title || 'Unknown Title',
      subtitle: track.artist || album?.artist || 'Unknown Artist',
      isPlaying: currentTrack?.videoId === track.videoId,
    }))
  }, [tracks, currentTrack, album])

  // Load album data from localStorage
  useEffect(() => {
    const albumData = JSON.parse(localStorage.getItem('selectedAlbum') || 'null')

    if (albumData) {
      setAlbum(albumData)
      fetchAlbumTracks(albumData)
    } else {
      setError('No album selected')
      setIsLoading(false)
    }
  }, [])

  const fetchAlbumTracks = async (albumData) => {
    try {
      setIsLoading(true)
      setError(null)

      // Extract the actual album ID from the service-prefixed ID
      const albumId = albumData.id.startsWith('ytm:') 
        ? albumData.id.substring(4) 
        : albumData.id

      // Fetch tracks for this album
      const tracksData = await backendAPI.getAlbumTracks(albumId)
      setTracks(tracksData || [])
    } catch (err) {
      console.error('Error fetching album tracks:', err)
      setError('Failed to load album tracks')
      setTracks([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleTrackClick = (track) => {
    console.log('Track clicked:', track.title)

    // Add all tracks to queue and start playing this track
    if (tracks.length > 0) {
      const queueTracks = tracks.map(t => ({
        ...t,
        streamUrl: t.streamUrl || `/api/stream/youtube/${t.videoId}`
      }))

      const trackIndex = queueTracks.findIndex(t => t.videoId === track.videoId)

      if (trackIndex !== -1) {
        playTrack(queueTracks[trackIndex], queueTracks)
      }
    }
  }

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      const queueTracks = tracks.map(t => ({
        ...t,
        streamUrl: t.streamUrl || `/api/stream/youtube/${t.videoId}`
      }))
      playTrack(queueTracks[0], queueTracks)
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="album-details-view view-wrapper">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div>Loading album...</div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="album-details-view view-wrapper">
        <div className="error-container">
          <div className="error-icon">!</div>
          <div className="error-message">{error}</div>
        </div>
      </div>
    )
  }

  // Show empty state if no album
  if (!album) {
    return (
      <div className="album-details-view view-wrapper">
        <div className="empty-container">
          <div className="empty-text">No album selected</div>
        </div>
      </div>
    )
  }

  return (
    <div className="album-details-view view-wrapper">
      <div className="view-header">
        <h2>{album.title || album.name}</h2>
        <div className="album-info">
          <span>{album.artist || 'Unknown Artist'}</span>
          {album.year && <span>{album.year}</span>}
          {tracks.length > 0 && <span>{tracks.length} songs</span>}
        </div>
      </div>

      {tracks.length > 0 && (
        <div className="album-actions">
          <button className="play-all-btn" onClick={handlePlayAll}>
            Play All
          </button>
        </div>
      )}

      {formattedTracks.length > 0 ? (
        <ListView items={formattedTracks} onItemClick={handleTrackClick} />
      ) : (
        <div className="empty-container">
          <div className="empty-text">No tracks in this album</div>
        </div>
      )}
    </div>
  )
}

export default AlbumDetailsView
