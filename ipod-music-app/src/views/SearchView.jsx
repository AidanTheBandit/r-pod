import { useState } from 'react'
import { useNavigationStore } from '../store/navigationStore'
import { usePlayerStore } from '../store/playerStore'
import { useSearch } from '../hooks/useMusicData'
import ListView from '../components/ListView'
import './SearchView.css'

function SearchView() {
  const [searchQuery, setSearchQuery] = useState('')
  const { navigateTo } = useNavigationStore()
  const { playTrack } = usePlayerStore()
  
  // Fetch search results
  const { data: results = [], isLoading } = useSearch(searchQuery, 'track')
  
  // Format results for ListView
  const formattedResults = results.map(result => ({
    ...result,
    subtitle: `${result.artist} • ${result.album}`,
  }))
  
  const handleSearch = (e) => {
    const query = e.target.value
    setSearchQuery(query)
  }
  
  const handleResultClick = (result, index) => {
    console.log('Search result clicked:', result.title)
    
    // Play the track
    playTrack(result, formattedResults, index)
    
    // Navigate to now playing
    navigateTo('nowPlaying', true)
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
