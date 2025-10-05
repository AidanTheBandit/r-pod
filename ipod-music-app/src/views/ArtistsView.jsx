import { useState } from 'react'
import ListView from '../components/ListView'
import './ArtistsView.css'

function ArtistsView() {
  // Demo artists - will be replaced with real data
  const [artists] = useState([
    { id: '1', title: 'The Beatles', subtitle: '195 songs' },
    { id: '2', title: 'Pink Floyd', subtitle: '132 songs' },
    { id: '3', title: 'Led Zeppelin', subtitle: '108 songs' },
    { id: '4', title: 'Queen', subtitle: '164 songs' },
    { id: '5', title: 'The Rolling Stones', subtitle: '287 songs' },
  ])
  
  const handleArtistClick = (artist) => {
    console.log('Artist clicked:', artist.title)
    // TODO: Navigate to artist details view
  }
  
  return (
    <div className="artists-view view-wrapper">
      <ListView items={artists} onItemClick={handleArtistClick} />
    </div>
  )
}

export default ArtistsView
