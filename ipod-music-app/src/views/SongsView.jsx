import { useState } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import { usePlayerStore } from '../store/playerStore'
import ListView from '../components/ListView'
import './SongsView.css'

function SongsView() {
  const { navigateTo } = useNavigationStore()
  const { playTrack } = usePlayerStore()
  
  // Demo songs - will be replaced with real data from music services
  const [songs] = useState([
    {
      id: '1',
      title: 'Across the River, Into the Trees',
      artist: 'Artist Name',
      album: 'Album Name',
      duration: 225,
      subtitle: 'Artist Name • Album Name',
    },
    {
      id: '2',
      title: 'Above All',
      artist: 'Artist Name',
      album: 'Album Name',
      duration: 198,
      subtitle: 'Artist Name • Album Name',
    },
    {
      id: '3',
      title: 'Abysmal Thoughts',
      artist: 'Artist Name',
      album: 'Album Name',
      duration: 243,
      subtitle: 'Artist Name • Album Name',
    },
    {
      id: '4',
      title: 'Abyss of Light',
      artist: 'Artist Name',
      album: 'Album Name',
      duration: 212,
      subtitle: 'Artist Name • Album Name',
    },
    {
      id: '5',
      title: 'Accountable',
      artist: 'Artist Name',
      album: 'Album Name',
      duration: 189,
      subtitle: 'Artist Name • Album Name',
    },
  ])
  
  const handleSongClick = (song, index) => {
    console.log('Song clicked:', song.title)
    
    // Play the song
    playTrack(song, songs, index)
    
    // Navigate to now playing
    navigateTo('nowPlaying', true)
  }
  
  return (
    <div className="songs-view view-wrapper">
      <ListView items={songs} onItemClick={handleSongClick} />
    </div>
  )
}

export default SongsView
