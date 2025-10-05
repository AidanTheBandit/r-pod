/**
 * iPod-Inspired Interface for R1 Device
 * ======================================
 * 
 * This plugin recreates the classic iPod navigation experience optimized for the R1 device.
 * 
 * NAVIGATION PATTERN:
 * - Scroll Wheel (R1 scroll wheel): Navigate up/down through menu items
 * - PTT Button (R1 side button): Confirm selection / Play-Pause
 * - Back Navigation: Automatic when entering sub-menus
 * 
 * VIEW HIERARCHY:
 * - Main Menu (root): Playlists, Artists, Albums, Songs, Genres, Now Playing
 * - Sub-menus: List views for each category
 * - Now Playing: Album art, song info, playback controls
 * 
 * STATE MANAGEMENT:
 * - currentView: Tracks which view is active
 * - selectedIndex: Tracks currently highlighted menu item
 * - viewHistory: Stack for back navigation
 * 
 * REACT MIGRATION GUIDE:
 * 1. Convert views to React components (MainMenu, SongsList, AlbumsView, NowPlaying)
 * 2. Use useState for selectedIndex, currentView, viewHistory
 * 3. Convert event listeners to useEffect hooks
 * 4. Use Context API or Redux for global state (now playing info, music library)
 * 5. Replace DOM manipulation with state updates and conditional rendering
 * 6. Convert CSS classes to CSS modules or styled-components
 * 7. Add React Router for deep linking (optional)
 * 
 * FUTURE ENHANCEMENTS:
 * - Connect to Spotify/Apple Music/YouTube Music APIs
 * - Real album artwork from music services
 * - Actual playback controls
 * - Search functionality
 * - Playlist creation and management
 * - Settings menu (repeat, shuffle, equalizer)
 */

// ============================================
// GLOBAL STATE
// ============================================

/**
 * Application state object
 * In React: Convert to useState or useReducer
 */
const state = {
  currentView: 'mainMenu',           // Active view identifier
  selectedIndex: 0,                   // Currently highlighted item in active list
  viewHistory: [],                    // Navigation stack for back button
  isPlaying: false,                   // Playback state
  currentSong: {
    title: 'Across the River, Into the Trees',
    artist: 'Artist Name',
    album: 'Album Name',
    duration: 225,                    // seconds
    currentTime: 0
  }
};

/**
 * View configuration mapping
 * Defines all available views and their list containers
 * React: Convert to component registry or routing config
 */
const views = {
  mainMenu: {
    id: 'mainMenu',
    listId: 'mainMenuList',
    title: 'Music',
    hasBack: false
  },
  songsView: {
    id: 'songsView',
    listId: 'songsList',
    title: 'Songs',
    hasBack: true
  },
  albumsView: {
    id: 'albumsView',
    listId: 'albumsList',
    title: 'Albums',
    hasBack: true
  },
  nowPlayingView: {
    id: 'nowPlayingView',
    listId: null,                     // No list in now playing view
    title: 'Now Playing',
    hasBack: true
  }
};

// ============================================
// DOM ELEMENT REFERENCES
// ============================================

let headerTitle;
let backIndicator;
let currentListElement = null;

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the iPod interface
 * Sets up event listeners and initial UI state
 */
function initializeApp() {
  console.log('iPod Interface initializing...');
  
  // Cache DOM references
  headerTitle = document.getElementById('headerTitle');
  backIndicator = document.getElementById('backIndicator');
  
  // Set up hardware event listeners
  setupHardwareEvents();
  
  // Set up keyboard fallback for development
  setupKeyboardFallback();
  
  // Initialize the main menu view
  switchToView('mainMenu');
  
  console.log('iPod Interface ready!');
  console.log('Controls: Scroll wheel to navigate, PTT button to select');
}

// ============================================
// VIEW MANAGEMENT
// ============================================

/**
 * Switch to a different view
 * Handles view transitions, history management, and UI updates
 * 
 * @param {string} viewName - The view identifier to switch to
 * @param {boolean} addToHistory - Whether to add current view to history stack
 * 
 * React Migration: Replace with state updates and conditional rendering
 */
function switchToView(viewName, addToHistory = false) {
  const newView = views[viewName];
  if (!newView) {
    console.error('View not found:', viewName);
    return;
  }
  
  // Add current view to history if navigating forward
  if (addToHistory && state.currentView) {
    state.viewHistory.push({
      view: state.currentView,
      selectedIndex: state.selectedIndex
    });
  }
  
  // Hide all view containers
  document.querySelectorAll('.view-container').forEach(container => {
    container.classList.add('hidden');
  });
  
  // Show the new view
  const viewContainer = document.getElementById(newView.id);
  if (viewContainer) {
    viewContainer.classList.remove('hidden');
    viewContainer.classList.add('fade-in');
  }
  
  // Update header
  headerTitle.textContent = newView.title;
  
  // Show/hide back indicator
  if (newView.hasBack && state.viewHistory.length > 0) {
    backIndicator.classList.add('visible');
  } else {
    backIndicator.classList.remove('visible');
  }
  
  // Update state
  state.currentView = viewName;
  state.selectedIndex = 0;
  
  // Set up the list for this view (if it has one)
  if (newView.listId) {
    currentListElement = document.getElementById(newView.listId);
    updateListSelection();
  } else {
    currentListElement = null;
  }
  
  console.log('Switched to view:', viewName);
}

/**
 * Navigate back to previous view
 * Pops from history stack and restores previous state
 * 
 * React Migration: Use navigation state or React Router
 */
function navigateBack() {
  if (state.viewHistory.length === 0) {
    console.log('No history to go back to');
    return;
  }
  
  const previousState = state.viewHistory.pop();
  state.selectedIndex = previousState.selectedIndex;
  
  switchToView(previousState.view, false);
  
  // Restore scroll position
  if (currentListElement) {
    scrollToSelected();
  }
}

// ============================================
// LIST NAVIGATION
// ============================================

/**
 * Update visual selection in the current list
 * Highlights the item at state.selectedIndex
 * 
 * React Migration: Use CSS classes based on state comparison
 */
function updateListSelection() {
  if (!currentListElement) return;
  
  const items = currentListElement.querySelectorAll('.list-item');
  
  // Remove selection from all items
  items.forEach(item => item.classList.remove('selected'));
  
  // Add selection to current item
  if (items[state.selectedIndex]) {
    items[state.selectedIndex].classList.add('selected');
    scrollToSelected();
  }
}

/**
 * Scroll the list to keep selected item visible
 * Ensures the highlighted item is always in viewport
 * 
 * React Migration: Use refs and scrollIntoView
 */
function scrollToSelected() {
  if (!currentListElement) return;
  
  const items = currentListElement.querySelectorAll('.list-item');
  const selectedItem = items[state.selectedIndex];
  
  if (selectedItem) {
    selectedItem.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }
}

/**
 * Move selection up in the list
 * Wraps to bottom if at top
 * 
 * React Migration: Update state with setState
 */
function moveSelectionUp() {
  if (!currentListElement) return;
  
  const items = currentListElement.querySelectorAll('.list-item');
  const itemCount = items.length;
  
  if (itemCount === 0) return;
  
  // Wrap to bottom if at top
  state.selectedIndex = (state.selectedIndex - 1 + itemCount) % itemCount;
  updateListSelection();
  
  console.log('Selected index:', state.selectedIndex);
}

/**
 * Move selection down in the list
 * Wraps to top if at bottom
 * 
 * React Migration: Update state with setState
 */
function moveSelectionDown() {
  if (!currentListElement) return;
  
  const items = currentListElement.querySelectorAll('.list-item');
  const itemCount = items.length;
  
  if (itemCount === 0) return;
  
  // Wrap to top if at bottom
  state.selectedIndex = (state.selectedIndex + 1) % itemCount;
  updateListSelection();
  
  console.log('Selected index:', state.selectedIndex);
}

/**
 * Handle selection confirmation (PTT button press)
 * Routes to appropriate action based on current view and selected item
 * 
 * React Migration: Use onClick handlers and routing
 */
function confirmSelection() {
  console.log('Confirm selection:', state.currentView, state.selectedIndex);
  
  // Handle based on current view
  switch (state.currentView) {
    case 'mainMenu':
      handleMainMenuSelection();
      break;
      
    case 'songsView':
      handleSongSelection();
      break;
      
    case 'albumsView':
      handleAlbumSelection();
      break;
      
    case 'nowPlayingView':
      handleNowPlayingAction();
      break;
      
    default:
      console.log('No action defined for this view');
  }
}

/**
 * Handle main menu item selection
 * Routes to appropriate sub-menu
 */
function handleMainMenuSelection() {
  const menuItems = ['playlists', 'artists', 'albums', 'songs', 'genres', 'nowPlaying'];
  const selected = menuItems[state.selectedIndex];
  
  console.log('Main menu selection:', selected);
  
  switch (selected) {
    case 'songs':
      switchToView('songsView', true);
      break;
      
    case 'albums':
      switchToView('albumsView', true);
      break;
      
    case 'nowPlaying':
      switchToView('nowPlayingView', true);
      break;
      
    default:
      console.log('View not yet implemented:', selected);
      // In a real app, these would navigate to their respective views
  }
}

/**
 * Handle song selection from songs list
 * Starts playback and navigates to Now Playing view
 */
function handleSongSelection() {
  const songsList = document.getElementById('songsList');
  const items = songsList.querySelectorAll('.list-item');
  const selectedSong = items[state.selectedIndex];
  
  if (selectedSong) {
    const songTitle = selectedSong.querySelector('.item-text').textContent;
    console.log('Selected song:', songTitle);
    
    // Update now playing info
    state.currentSong.title = songTitle;
    state.currentSong.artist = 'Artist Name';
    state.currentSong.album = 'Album Name';
    state.isPlaying = true;
    
    // Update Now Playing view
    updateNowPlayingView();
    
    // Navigate to Now Playing
    switchToView('nowPlayingView', true);
  }
}

/**
 * Handle album selection from albums list
 * In a real app, this would show songs in the album
 */
function handleAlbumSelection() {
  const albumsList = document.getElementById('albumsList');
  const items = albumsList.querySelectorAll('.list-item');
  const selectedAlbum = items[state.selectedIndex];
  
  if (selectedAlbum) {
    const albumTitle = selectedAlbum.querySelector('.item-text').textContent;
    console.log('Selected album:', albumTitle);
    
    // In a real app: Navigate to album details/songs view
    // For now, just log
  }
}

/**
 * Handle actions in Now Playing view
 * PTT button toggles play/pause
 */
function handleNowPlayingAction() {
  togglePlayPause();
}

// ============================================
// NOW PLAYING CONTROLS
// ============================================

/**
 * Update the Now Playing view with current song info
 * 
 * React Migration: Use props or context to pass song data
 */
function updateNowPlayingView() {
  document.getElementById('songTitle').textContent = state.currentSong.title;
  document.getElementById('songArtist').textContent = state.currentSong.artist;
  document.getElementById('songAlbum').textContent = state.currentSong.album;
  
  // Update play/pause button
  const playPauseBtn = document.getElementById('playPauseBtn');
  playPauseBtn.textContent = state.isPlaying ? '⏸' : '▶';
}

/**
 * Toggle play/pause state
 * In a real app, this would control actual audio playback
 */
function togglePlayPause() {
  state.isPlaying = !state.isPlaying;
  
  const playPauseBtn = document.getElementById('playPauseBtn');
  playPauseBtn.textContent = state.isPlaying ? '⏸' : '▶';
  
  console.log('Playback state:', state.isPlaying ? 'Playing' : 'Paused');
  
  // In a real app: Control audio playback here
  // if (state.isPlaying) {
  //   audioElement.play();
  // } else {
  //   audioElement.pause();
  // }
}

// ============================================
// HARDWARE EVENT HANDLERS
// ============================================

/**
 * Set up R1 hardware event listeners
 * Scroll wheel and PTT button
 */
function setupHardwareEvents() {
  // R1 Scroll Wheel - Navigate Up
  window.addEventListener('scrollUp', () => {
    console.log('Scroll wheel: Up');
    
    // Only handle list navigation in views with lists
    if (currentListElement) {
      moveSelectionUp();
    }
  });
  
  // R1 Scroll Wheel - Navigate Down
  window.addEventListener('scrollDown', () => {
    console.log('Scroll wheel: Down');
    
    // Only handle list navigation in views with lists
    if (currentListElement) {
      moveSelectionDown();
    }
  });
  
  // R1 PTT Button - Confirm Selection
  window.addEventListener('sideClick', () => {
    console.log('PTT button pressed');
    confirmSelection();
  });
  
  // Long press events (optional future use)
  window.addEventListener('longPressStart', () => {
    console.log('Long press started');
    // Could be used for additional features (e.g., quick menu)
  });
  
  window.addEventListener('longPressEnd', () => {
    console.log('Long press ended');
  });
  
  // Back button click handler
  if (backIndicator) {
    backIndicator.addEventListener('click', () => {
      navigateBack();
    });
  }
}

/**
 * Set up keyboard fallback for browser testing
 * Arrow keys for navigation, Enter for confirm, Escape for back
 */
function setupKeyboardFallback() {
  // Only in browser mode (not on R1 device)
  if (typeof PluginMessageHandler === 'undefined') {
    console.log('Setting up keyboard fallback for development');
    
    window.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('scrollUp'));
          break;
          
        case 'ArrowDown':
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('scrollDown'));
          break;
          
        case 'Enter':
        case ' ':
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('sideClick'));
          break;
          
        case 'Escape':
          event.preventDefault();
          navigateBack();
          break;
      }
    });
  }
}

// ============================================
// R1 PLUGIN MESSAGE HANDLING (Optional)
// ============================================

/**
 * Handle incoming messages from Flutter
 * Could be used for music service integration
 */
window.onPluginMessage = function(data) {
  console.log('Received plugin message:', data);
  
  // Example: Handle music data from external service
  if (data.data) {
    try {
      const parsed = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      
      // Handle different message types
      if (parsed.type === 'songData') {
        state.currentSong = parsed.song;
        updateNowPlayingView();
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  }
};

/**
 * Send message to Flutter (for future music service integration)
 * 
 * @param {string} action - Action type (e.g., 'play', 'pause', 'next')
 * @param {object} data - Additional data
 */
function sendPluginMessage(action, data = {}) {
  if (typeof PluginMessageHandler !== 'undefined') {
    const payload = {
      message: JSON.stringify({
        action: action,
        ...data
      }),
      timestamp: Date.now()
    };
    PluginMessageHandler.postMessage(JSON.stringify(payload));
  }
}

// ============================================
// PERSISTENT STORAGE (Optional)
// ============================================

/**
 * Save state to persistent storage
 * Could be used to remember last playing song, playlists, etc.
 */
async function saveState() {
  if (window.creationStorage) {
    try {
      const encoded = btoa(JSON.stringify({
        currentSong: state.currentSong,
        isPlaying: state.isPlaying
      }));
      await window.creationStorage.plain.setItem('ipod_state', encoded);
      console.log('State saved');
    } catch (e) {
      console.error('Error saving state:', e);
    }
  }
}

/**
 * Load state from persistent storage
 */
async function loadState() {
  if (window.creationStorage) {
    try {
      const stored = await window.creationStorage.plain.getItem('ipod_state');
      if (stored) {
        const decoded = JSON.parse(atob(stored));
        state.currentSong = decoded.currentSong || state.currentSong;
        state.isPlaying = decoded.isPlaying || false;
        updateNowPlayingView();
        console.log('State loaded');
      }
    } catch (e) {
      console.error('Error loading state:', e);
    }
  }
}

// ============================================
// APPLICATION ENTRY POINT
// ============================================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  
  // Optionally load saved state
  // loadState();
});

// Check if running as R1 plugin
if (typeof PluginMessageHandler !== 'undefined') {
  console.log('Running as R1 Creation');
} else {
  console.log('Running in browser mode - Use arrow keys and Enter for navigation');
}

console.log('iPod Interface loaded!');
console.log('======================');
console.log('Controls:');
console.log('- Scroll Wheel: Navigate up/down');
console.log('- PTT Button: Select/Confirm');
console.log('- Back: Return to previous menu');
console.log('');
console.log('Browser Testing:');
console.log('- Arrow Up/Down: Navigate');
console.log('- Enter/Space: Select');
console.log('- Escape: Back');
