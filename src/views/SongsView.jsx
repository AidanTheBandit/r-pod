import { useNavigationStore } from '../store/navigationStore'
import { usePlayerStore } from '../store/playerStore'
import { useServiceStore } from '../store/serviceStore'
import { useTracks } from '../hooks/useMusicData'
import { backendAPI } from '../services/backendClient'
import ListView from '../components/ListView'
import './SongsView.css'

function SongsView() {
  const { navigateTo } = useNavigationStore()
  const { playTrack } = usePlayerStore()
  
  // Fetch songs from configured services
  const { data: songs = [], isLoading, error } = useTracks()
  
  // Format songs for ListView
  const formattedSongs = songs.map(song => ({
    ...song,
    subtitle: `${song.artist} • ${song.album}`,
  }))
  
  const handleSongClick = async (song, index) => {
    console.log('Song clicked:', song.title, '- Starting radio...')
    
    try {
      // Fetch radio tracks for this song
      const radioTracks = await backendAPI.getRadio(song.videoId)
      
      if (radioTracks && radioTracks.length > 0) {
        console.log(`Got ${radioTracks.length} radio tracks`)
        
        // Play the radio starting with the clicked song
        playTrack(song, radioTracks, 0)
      } else {
        console.warn('No radio tracks available, playing single song')
        // Fallback to playing just this song
        playTrack(song, [song], 0)
      }
    } catch (error) {
      console.error('Failed to get radio tracks:', error)
      // Fallback to playing just this song
      playTrack(song, [song], 0)
    }
    
    // Navigate to now playing
    navigateTo('nowPlaying', true)
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="songs-view view-wrapper">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div>Loading songs...</div>
        </div>
      </div>
    )
  }
  
  // Show error state
  if (error) {
    return (
      <div className="songs-view view-wrapper">
        <div className="error-container">
          <div className="error-icon">!</div>
          <div className="error-message">Failed to load songs</div>
          <div className="error-details">{error.message}</div>
        </div>
      </div>
    )
  }
  
  // Show empty state if no songs
  if (formattedSongs.length === 0) {
    return (
      <div className="songs-view view-wrapper">
        <div className="empty-container">
          <div className="empty-text">No songs available</div>
          <div className="empty-subtext">Try searching for songs in the Search tab</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="songs-view view-wrapper">
      {formattedSongs.length > 0 && (
        <div className="view-header">
          <h2>Recommended Songs</h2>
        </div>
      )}
      <ListView items={formattedSongs} onItemClick={handleSongClick} />
    </div>
  )
}

export default SongsView
