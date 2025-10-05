import { useState } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import ListView from '../components/ListView'
import './AlbumsView.css'

function AlbumsView() {
  const { navigateTo } = useNavigationStore()
  
  // Demo albums - will be replaced with real data from music services
  const [albums] = useState([
    {
      id: '1',
      title: 'Abbey Road',
      artist: 'The Beatles',
      year: '1969',
      subtitle: 'The Beatles • 1969',
    },
    {
      id: '2',
      title: 'Dark Side of the Moon',
      artist: 'Pink Floyd',
      year: '1973',
      subtitle: 'Pink Floyd • 1973',
    },
    {
      id: '3',
      title: 'Thriller',
      artist: 'Michael Jackson',
      year: '1982',
      subtitle: 'Michael Jackson • 1982',
    },
    {
      id: '4',
      title: 'Rumours',
      artist: 'Fleetwood Mac',
      year: '1977',
      subtitle: 'Fleetwood Mac • 1977',
    },
    {
      id: '5',
      title: 'Back in Black',
      artist: 'AC/DC',
      year: '1980',
      subtitle: 'AC/DC • 1980',
    },
  ])
  
  const handleAlbumClick = (album) => {
    console.log('Album clicked:', album.title)
    // TODO: Navigate to album details view
  }
  
  return (
    <div className="albums-view view-wrapper">
      <ListView items={albums} onItemClick={handleAlbumClick} />
    </div>
  )
}

export default AlbumsView
