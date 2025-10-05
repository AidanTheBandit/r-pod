import { create } from 'zustand'

/**
 * Navigation Store
 * Manages view navigation, history, and selected indices
 */
export const useNavigationStore = create((set, get) => ({
  // Current view state
  currentView: 'mainMenu',
  selectedIndex: 0,
  viewHistory: [],
  
  // Navigate to a new view
  navigateTo: (viewName, addToHistory = true) => {
    const { currentView, selectedIndex, viewHistory } = get()
    
    // Add current view to history
    const newHistory = addToHistory
      ? [...viewHistory, { view: currentView, selectedIndex }]
      : viewHistory
    
    set({
      currentView: viewName,
      selectedIndex: 0,
      viewHistory: newHistory,
    })
    
    console.log('Navigated to:', viewName)
  },
  
  // Navigate back to previous view
  navigateBack: () => {
    const { viewHistory } = get()
    
    if (viewHistory.length === 0) {
      console.log('No history to go back to')
      return false
    }
    
    const previousState = viewHistory[viewHistory.length - 1]
    const newHistory = viewHistory.slice(0, -1)
    
    set({
      currentView: previousState.view,
      selectedIndex: previousState.selectedIndex,
      viewHistory: newHistory,
    })
    
    console.log('Navigated back to:', previousState.view)
    return true
  },
  
  // Update selected index
  setSelectedIndex: (index) => {
    set({ selectedIndex: index })
  },
  
  // Move selection up
  moveSelectionUp: (itemCount) => {
    const { selectedIndex } = get()
    if (itemCount === 0) return
    
    const newIndex = (selectedIndex - 1 + itemCount) % itemCount
    set({ selectedIndex: newIndex })
  },
  
  // Move selection down
  moveSelectionDown: (itemCount) => {
    const { selectedIndex } = get()
    if (itemCount === 0) return
    
    const newIndex = (selectedIndex + 1) % itemCount
    set({ selectedIndex: newIndex })
  },
  
  // Clear history
  clearHistory: () => {
    set({ viewHistory: [] })
  },
  
  // Get if we can go back
  canGoBack: () => {
    return get().viewHistory.length > 0
  },
}))
