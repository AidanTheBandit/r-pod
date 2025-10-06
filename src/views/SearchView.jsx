import { useState } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import { usePlayerStore } from '../store/playerStore'
import { useSearch } from '../hooks/useMusicData'
import { backendAPI } from '../services/backendClient'
import ListView from '../components/ListView'
import './SearchView.css'

function SearchView() {
  const [searchQuery, setSearchQuery] = useState('')
  const { navigateTo } = useNavigationStore()
  const { playTrack } = usePlayerStore()
  
  // Fetch search results
  const { data: results = [], isLoading } = useSearch(searchQuery, 'track')
  
  // Format results for ListView
  const formattedResults = results.map(result => {
    let subtitle = ''
    if (result.type === 'song') {
      subtitle = `${result.artist} • ${result.album}`
    } else if (result.type === 'album') {
      subtitle = result.artist
    } else if (result.type === 'artist') {
      subtitle = 'Artist'
    }
    return {
      ...result,
      subtitle,
    }
  })
  
  const handleSearch = (e) => {
    const query = e.target.value
    setSearchQuery(query)
  }
  
  const handleResultClick = async (result, index) => {
    console.log('Search result clicked:', result.title, result.type)
    
    if (result.type === 'song') {
      try {
        // Fetch radio tracks for this song
        const radioTracks = await backendAPI.getRadio(result.videoId)
        
        if (radioTracks && radioTracks.length > 0) {
          console.log(`Got ${radioTracks.length} radio tracks`)
          
          // Play the radio starting with the clicked song
          playTrack(result, radioTracks, 0)
        } else {
          console.warn('No radio tracks available, playing single song')
          // Fallback to playing just this song
          const songResults = formattedResults.filter(r => r.type === 'song')
          playTrack(result, songResults, index)
        }
      } catch (error) {
        console.error('Failed to get radio tracks:', error)
        // Fallback to playing just this song
        const songResults = formattedResults.filter(r => r.type === 'song')
        playTrack(result, songResults, index)
      }
      
      // Navigate to now playing
      navigateTo('nowPlaying', true)
    } else {
      // For albums/artists, maybe navigate to details (TODO)
      console.log('Non-song result clicked, not implemented yet')
    }
  }
  
  return (
    <div className="search-view view-wrapper">
      <div className="search-input-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search songs, artists, albums..."
          value={searchQuery}
          onChange={handleSearch}
          autoFocus
        />
      </div>
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <div>Searching...</div>
        </div>
      ) : formattedResults.length > 0 ? (
        <ListView items={formattedResults} onItemClick={handleResultClick} />
      ) : (
        <div className="search-empty">
          <div className="search-empty-icon">SEARCH</div>
          <div className="search-empty-text">
            {searchQuery ? 'No results found' : 'Enter a search query'}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchView
