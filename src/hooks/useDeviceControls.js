import { useEffect } from 'react'
import { deviceControls } from 'r1-create'
import { useNavigationStore } from '../store/navigationStore'
import { usePlayerStore } from '../store/playerStore'

/**
 * Custom hook to handle R1 device controls
 * Manages scroll wheel and side button (PTT) interactions
 * 
 * Now Playing Mode:
 * - Scroll Wheel: Skip tracks forward/backward & Seek within track (hold for 1s)
 * - PTT Button: Play/Pause
 * 
 * List View Mode:
 * - Scroll Wheel: Navigate up/down
 * - PTT Button: Select item
 */
export function useDeviceControls(sdk) {
  const { navigateBack, moveSelectionUp, moveSelectionDown, currentView } = useNavigationStore()
  const { 
    togglePlayPause, 
    playNext, 
    playPrevious, 
    seekTo, 
    currentTime, 
    duration 
  } = usePlayerStore()
  
  useEffect(() => {
    // Initialize device controls
    deviceControls.init({
      sideButtonEnabled: true,
      scrollWheelEnabled: true,
      keyboardFallback: true, // Space bar for PTT, arrow keys for scroll
    })
    
    console.log('Device controls initialized for R1')
    
    // Track scroll timing for seek mode
    let scrollHoldTimer = null
    let isSeekMode = false
    
    // Debounce for PTT button
    let pttDebounceTimer = null
    const PTT_DEBOUNCE_MS = 300 // Prevent double clicks
    
    // Handle scroll wheel events
    const handleScrollWheel = (data) => {
      // Special handling for Now Playing view
      if (currentView === 'nowPlaying') {
        // Clear any existing timer
        if (scrollHoldTimer) {
          clearTimeout(scrollHoldTimer)
        }
        
        if (!isSeekMode) {
          // Quick scroll = track skip
          if (data.direction === 'up') {
            playNext()
            console.log('Scroll: Next track')
          } else {
            playPrevious()
            console.log('Scroll: Previous track')
          }
          
          // Start timer to enable seek mode if user keeps scrolling
          scrollHoldTimer = setTimeout(() => {
            isSeekMode = true
            console.log('Seek mode enabled')
          }, 1000)
        } else {
          // Seek mode = scrub through current track
          const seekAmount = duration * 0.03 // 3% of track length per scroll
          const newTime = data.direction === 'up' 
            ? Math.min(currentTime + seekAmount, duration)
            : Math.max(currentTime - seekAmount, 0)
          
          seekTo(newTime)
          console.log(`Seek: ${data.direction} to ${newTime.toFixed(1)}s`)
        }
        
        // Reset seek mode after inactivity
        setTimeout(() => {
          if (scrollHoldTimer) {
            clearTimeout(scrollHoldTimer)
            scrollHoldTimer = null
          }
          isSeekMode = false
        }, 2000)
        
        return
      }
      
      // For list views, move selection with throttling and debouncing
      const now = Date.now()
      if (now - lastScrollTime < SCROLL_THROTTLE_MS) {
        return // Throttle: ignore if too soon
      }
      lastScrollTime = now
      
      if (scrollDebounceTimer) {
        clearTimeout(scrollDebounceTimer)
      }
      
      scrollDebounceTimer = setTimeout(() => {
        const viewContainer = document.querySelector('.view-container')
        if (!viewContainer) return
        
        const listItems = viewContainer.querySelectorAll('.list-item')
        
        if (listItems.length > 0) {
          if (data.direction === 'up') {
            moveSelectionUp(listItems.length)
          } else {
            moveSelectionDown(listItems.length)
          }
        }
      }, SCROLL_DEBOUNCE_MS)
    }
    
    // Handle PTT (side button) press
    const handleSideButton = () => {
      if (pttDebounceTimer) return // Debounce
      
      pttDebounceTimer = setTimeout(() => {
        pttDebounceTimer = null
      }, PTT_DEBOUNCE_MS)
      
      console.log('PTT pressed')
      
      // In Now Playing view, PTT = play/pause
      if (currentView === 'nowPlaying') {
        togglePlayPause()
        console.log('PTT: Toggle play/pause')
        return
      }
      
      // In other views, PTT = select current item
      const selectedItem = document.querySelector('.list-item.selected')
      
      if (selectedItem) {
        selectedItem.click()
      }
    }
    
    // Register event handlers
    deviceControls.on('scrollWheel', handleScrollWheel)
    deviceControls.on('sideButton', handleSideButton)
    
    // Cleanup
    return () => {
      deviceControls.off('scrollWheel', handleScrollWheel)
      deviceControls.off('sideButton', handleSideButton)
      
      if (scrollHoldTimer) {
        clearTimeout(scrollHoldTimer)
      }
      
      if (scrollDebounceTimer) {
        clearTimeout(scrollDebounceTimer)
      }
      
      if (pttDebounceTimer) {
        clearTimeout(pttDebounceTimer)
      }
    }
  }, [
    moveSelectionUp, 
    moveSelectionDown, 
    togglePlayPause, 
    currentView, 
    playNext, 
    playPrevious, 
    seekTo, 
    currentTime, 
    duration
  ])
  
  // Handle keyboard fallback for development
  useEffect(() => {
    const handleKeyboard = (e) => {
      // Don't intercept space bar if user is typing in an input field
      if (e.key === ' ' && document.activeElement?.tagName === 'INPUT') {
        return // Allow normal space bar behavior in input fields
      }
      
      if (e.key === 'Escape') {
        navigateBack()
      }
    }
    
    window.addEventListener('keydown', handleKeyboard)
    
    return () => {
      window.removeEventListener('keydown', handleKeyboard)
    }
  }, [navigateBack])
}
