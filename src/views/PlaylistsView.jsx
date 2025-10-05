import { useServiceStore } from '../store/serviceStore'
import { usePlaylists } from '../hooks/useMusicData'
import { useNavigationStore } from '../store/navigationStore'
import ListView from '../components/ListView'
import './PlaylistsView.css'

function PlaylistsView() {
  // Fetch playlists from configured services with infinite scroll
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = usePlaylists()
  
  const { navigateTo } = useNavigationStore()
  
  // Flatten the paginated data
  const playlists = data?.pages?.flatMap(page => page.data) || []
  
  // Format playlists for ListView
  const formattedPlaylists = playlists.map(playlist => ({
    ...playlist,
    subtitle: playlist.trackCount > 0 
      ? `${playlist.trackCount} song${playlist.trackCount !== 1 ? 's' : ''}` 
      : playlist.trackCount === 0 
        ? 'Empty playlist' 
        : 'Loading...',
  }))
  
  const handlePlaylistClick = (playlist) => {
    console.log('Playlist clicked:', playlist.title)
    
    // Store the selected playlist data for the details view
    localStorage.setItem('selectedPlaylist', JSON.stringify(playlist))
    
    // Navigate to playlist details view
    navigateTo('playlistDetails')
  }
  
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      return fetchNextPage()
    }
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="playlists-view view-wrapper">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div>Loading playlists...</div>
        </div>
      </div>
    )
  }
  
  // Show error state
  if (error) {
    return (
      <div className="playlists-view view-wrapper">
        <div className="error-container">
          <div className="error-icon">!</div>
          <div className="error-message">Failed to load playlists</div>
        </div>
      </div>
    )
  }
  
  // Show empty state if no playlists
  if (formattedPlaylists.length === 0) {
    return (
      <div className="playlists-view view-wrapper">
        <div className="empty-container">
          <div className="empty-text">No playlists available</div>
          <div className="empty-subtext">Try searching for playlists in the Search tab</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="playlists-view view-wrapper">
      {formattedPlaylists.length > 0 && (
        <div className="view-header">
          <h2>Your Playlists</h2>
        </div>
      )}
      <ListView 
        items={formattedPlaylists} 
        onItemClick={handlePlaylistClick}
        onLoadMore={handleLoadMore}
        hasMore={hasNextPage}
        loading={isFetchingNextPage}
      />
    </div>
  )
}

export default PlaylistsView
