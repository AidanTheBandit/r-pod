import { create } from 'zustand'

/**
 * Player Store
 * Manages playback state, current track, queue, and playback controls
 */
export const usePlayerStore = create((set, get) => ({
  // Playback state
  isPlaying: false,
  currentTrack: null,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  
  // Queue management
  queue: [],
  queueIndex: 0,
  shuffle: false,
  repeat: 'none', // 'none', 'one', 'all'
  
  // Audio element ref (set by player component)
  audioElement: null,
  
  // Set audio element
  setAudioElement: (element) => {
    set({ audioElement: element })
  },
  
  // Play track
  playTrack: (track, queue = [], queueIndex = 0) => {
    set({
      currentTrack: track,
      queue: queue.length > 0 ? queue : [track],
      queueIndex,
      isPlaying: true,
      currentTime: 0,
    })
    
    console.log('Playing track:', track.title)
  },
  
  // Toggle play/pause
  togglePlayPause: () => {
    const { isPlaying, audioElement } = get()
    
    if (audioElement) {
      if (isPlaying) {
        audioElement.pause()
      } else {
        audioElement.play()
      }
    }
    
    set({ isPlaying: !isPlaying })
  },
  
  // Play next track
  playNext: () => {
    const { queue, queueIndex, repeat, shuffle } = get()
    
    if (queue.length === 0) return
    
    let nextIndex = queueIndex + 1
    
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length)
    } else if (nextIndex >= queue.length) {
      if (repeat === 'all') {
        nextIndex = 0
      } else {
        set({ isPlaying: false })
        return
      }
    }
    
    set({
      currentTrack: queue[nextIndex],
      queueIndex: nextIndex,
      currentTime: 0,
      isPlaying: true,
    })
    
    console.log('Playing next track:', queue[nextIndex].title)
  },
  
  // Play previous track
  playPrevious: () => {
    const { queue, queueIndex, currentTime } = get()
    
    if (queue.length === 0) return
    
    // If more than 3 seconds in, restart current track
    if (currentTime > 3) {
      set({ currentTime: 0 })
      return
    }
    
    let prevIndex = queueIndex - 1
    
    if (prevIndex < 0) {
      prevIndex = queue.length - 1
    }
    
    set({
      currentTrack: queue[prevIndex],
      queueIndex: prevIndex,
      currentTime: 0,
      isPlaying: true,
    })
    
    console.log('Playing previous track:', queue[prevIndex].title)
  },
  
  // Seek to position
  seekTo: (time) => {
    const { audioElement } = get()
    
    if (audioElement) {
      audioElement.currentTime = time
    }
    
    set({ currentTime: time })
  },
  
  // Update current time
  updateCurrentTime: (time) => {
    set({ currentTime: time })
  },
  
  // Set duration
  setDuration: (duration) => {
    set({ duration })
  },
  
  // Set volume
  setVolume: (volume) => {
    const { audioElement } = get()
    const clampedVolume = Math.max(0, Math.min(1, volume))
    
    if (audioElement) {
      audioElement.volume = clampedVolume
    }
    
    set({ volume: clampedVolume })
  },
  
  // Toggle shuffle
  toggleShuffle: () => {
    const { shuffle } = get()
    set({ shuffle: !shuffle })
  },
  
  // Cycle repeat mode
  cycleRepeat: () => {
    const { repeat } = get()
    const modes = ['none', 'one', 'all']
    const currentIndex = modes.indexOf(repeat)
    const nextIndex = (currentIndex + 1) % modes.length
    
    set({ repeat: modes[nextIndex] })
  },
  
  // Add to queue
  addToQueue: (track) => {
    const { queue } = get()
    set({ queue: [...queue, track] })
  },
  
  // Clear queue
  clearQueue: () => {
    set({
      queue: [],
      queueIndex: 0,
      currentTrack: null,
      isPlaying: false,
    })
  },
}))
