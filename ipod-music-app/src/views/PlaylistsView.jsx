import { useState } from 'react'
import ListView from '../components/ListView'
import './PlaylistsView.css'

function PlaylistsView() {
  // Demo playlists - will be replaced with real data
  const [playlists] = useState([
    { id: '1', title: 'My Favorites', subtitle: '42 songs' },
    { id: '2', title: 'Chill Vibes', subtitle: '28 songs' },
    { id: '3', title: 'Rock Classics', subtitle: '67 songs' },
    { id: '4', title: 'Study Music', subtitle: '51 songs' },
    { id: '5', title: 'Workout Mix', subtitle: '39 songs' },
  ])
  
  const handlePlaylistClick = (playlist) => {
    console.log('Playlist clicked:', playlist.title)
    // TODO: Navigate to playlist details view
  }
  
  return (
    <div className="playlists-view view-wrapper">
      <ListView items={playlists} onItemClick={handlePlaylistClick} />
    </div>
  )
}

export default PlaylistsView
