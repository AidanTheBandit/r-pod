import { useState, useEffect } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import { usePlayerStore } from '../store/playerStore'
import { backendAPI } from '../services/backendClient'
import ListView from '../components/ListView'
import './PlaylistDetailsView.css'

function PlaylistDetailsView() {
  const [playlist, setPlaylist] = useState(null)
  const [tracks, setTracks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const { currentView } = useNavigationStore()
  const { playTrack, addToQueue, currentTrack } = usePlayerStore()

  // Extract playlist data from navigation state (we'll pass it via state)
  useEffect(() => {
    // For now, we'll get the playlist data from a global state or localStorage
    // In a more robust implementation, we'd pass this via navigation state
    const playlistData = JSON.parse(localStorage.getItem('selectedPlaylist') || 'null')

    if (playlistData) {
      setPlaylist(playlistData)
      fetchPlaylistTracks(playlistData)
    } else {
      setError('No playlist selected')
      setIsLoading(false)
    }
  }, [])

  const fetchPlaylistTracks = async (playlistData) => {
    try {
      setIsLoading(true)
      setError(null)

      // Extract the actual playlist ID from the service-prefixed ID
      // Format: "ytm:PLAYLIST_ID" -> "PLAYLIST_ID"
      const playlistId = playlistData.id.startsWith('ytm:') 
        ? playlistData.id.substring(4) 
        : playlistData.id

      // Use the backendAPI client to fetch playlist tracks
      const tracks = await backendAPI.getPlaylistTracks(playlistId)
      setTracks(tracks || [])
    } catch (err) {
      console.error('Error fetching playlist tracks:', err)
      setError('Failed to load playlist tracks')
      setTracks([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleTrackClick = (track) => {
    console.log('Track clicked:', track.title)

    // Add all tracks to queue and start playing this track
    if (tracks.length > 0) {
      // Create queue from all tracks in playlist
      const queueTracks = tracks.map(t => ({
        ...t,
        // Ensure we have stream URLs for YouTube tracks
        streamUrl: t.streamUrl || `/api/stream/youtube/${t.videoId}`
      }))

      // Find the clicked track's position in the queue
      const trackIndex = queueTracks.findIndex(t => t.videoId === track.videoId)

      if (trackIndex !== -1) {
        // Play the clicked track and set the queue
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
      <div className="playlist-details-view view-wrapper">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div>Loading playlist...</div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="playlist-details-view view-wrapper">
        <div className="error-container">
          <div className="error-icon">!</div>
          <div className="error-message">{error}</div>
        </div>
      </div>
    )
  }

  // Show empty state if no playlist
  if (!playlist) {
    return (
      <div className="playlist-details-view view-wrapper">
        <div className="empty-container">
          <div className="empty-text">No playlist selected</div>
        </div>
      </div>
    )
  }

  // Format tracks for ListView
  const formattedTracks = tracks.map(track => ({
    ...track,
    title: track.title || 'Unknown Title',
    subtitle: track.artist || 'Unknown Artist',
    isPlaying: currentTrack?.videoId === track.videoId,
  }))

  return (
    <div className="playlist-details-view view-wrapper">
      <div className="view-header">
        <h2>{playlist.title}</h2>
        <div className="playlist-info">
          {playlist.trackCount && <span>{playlist.trackCount} songs</span>}
          {playlist.description && <p>{playlist.description}</p>}
        </div>
      </div>

      {tracks.length > 0 && (
        <div className="playlist-actions">
          <button className="play-all-btn" onClick={handlePlayAll}>
            Play All
          </button>
        </div>
      )}

      {formattedTracks.length > 0 ? (
        <ListView items={formattedTracks} onItemClick={handleTrackClick} />
      ) : (
        <div className="empty-container">
          <div className="empty-text">No tracks in this playlist</div>
        </div>
      )}
    </div>
  )
}

export default PlaylistDetailsView