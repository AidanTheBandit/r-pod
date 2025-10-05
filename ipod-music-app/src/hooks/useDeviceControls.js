import { useEffect } from 'react'
import { deviceControls } from 'r1-create'
import { useNavigationStore } from '../store/navigationStore'
import { usePlayerStore } from '../store/playerStore'

/**
 * Custom hook to handle R1 device controls
 * Manages scroll wheel and side button interactions
 */
export function useDeviceControls(sdk) {
  const { navigateBack, moveSelectionUp, moveSelectionDown } = useNavigationStore()
  const { togglePlayPause, currentView } = usePlayerStore()
  
  useEffect(() => {
    // Initialize device controls
    deviceControls.init({
      sideButtonEnabled: true,
      scrollWheelEnabled: true,
      keyboardFallback: true, // Space bar for side button, arrow keys for scroll
    })
    
    console.log('Device controls initialized')
    
    // Handle scroll wheel events
    const handleScrollWheel = (data) => {
      const viewContainer = document.querySelector('.view-container')
      
      if (!viewContainer) return
      
      // For list views, move selection
      const listItems = viewContainer.querySelectorAll('.list-item')
      
      if (listItems.length > 0) {
        if (data.direction === 'up') {
          moveSelectionUp(listItems.length)
        } else {
          moveSelectionDown(listItems.length)
        }
      }
    }
    
    // Handle side button press
    const handleSideButton = () => {
      console.log('Side button pressed')
      
      // Find selected item and trigger click
      const selectedItem = document.querySelector('.list-item.selected')
      
      if (selectedItem) {
        selectedItem.click()
      } else if (currentView === 'nowPlaying') {
        // In now playing view, toggle play/pause
        togglePlayPause()
      }
    }
    
    // Register event handlers
    deviceControls.on('scrollWheel', handleScrollWheel)
    deviceControls.on('sideButton', handleSideButton)
    
    // Cleanup
    return () => {
      deviceControls.off('scrollWheel', handleScrollWheel)
      deviceControls.off('sideButton', handleSideButton)
    }
  }, [moveSelectionUp, moveSelectionDown, togglePlayPause, currentView])
  
  // Handle keyboard fallback for development
  useEffect(() => {
    const handleKeyboard = (e) => {
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
