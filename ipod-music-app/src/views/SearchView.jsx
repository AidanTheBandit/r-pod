import { useState } from 'react'
import ListView from '../components/ListView'
import './SearchView.css'

function SearchView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  
  const handleSearch = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    
    // TODO: Implement real search across music services
    console.log('Searching for:', query)
  }
  
  const handleResultClick = (result) => {
    console.log('Search result clicked:', result)
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
      
      {results.length > 0 ? (
        <ListView items={results} onItemClick={handleResultClick} />
      ) : (
        <div className="search-empty">
          <div className="search-empty-icon">🔍</div>
          <div className="search-empty-text">
            {searchQuery ? 'No results found' : 'Enter a search query'}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchView
