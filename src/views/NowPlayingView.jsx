import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../store/playerStore'
import './NowPlayingView.css'

/**
 * Now Playing View - Redesigned for R1
 * Inspired by classic album artwork display (Beatles Help! style)
 * Optimized for 240x282px display with scroll wheel & PTT controls
 * 
 * Controls:
 * - Scroll Wheel: Skip tracks (quick) or seek (hold)
 * - PTT Button: Play/Pause
 */
function NowPlayingView() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
  } = usePlayerStore()
  
  const frameRef = useRef(null)
  const artworkRef = useRef(null)
  
  // Fit album art to progress border
  useEffect(() => {
    if (frameRef.current && artworkRef.current) {
      const frame = frameRef.current
      const artwork = artworkRef.current
      
      // SVG border dimensions: x=3, y=3, width=94, height=94, strokeWidth=3
      // Inner area accounts for stroke: starts at 4.5%, size is 91%
      const borderStart = 0.045 // 4.5%
      const borderSize = 0.91 // 91%
      
      const frameWidth = frame.offsetWidth
      const frameHeight = frame.offsetHeight
      
      const artworkWidth = frameWidth * borderSize
      const artworkHeight = frameHeight * borderSize
      const artworkLeft = frameWidth * borderStart
      const artworkTop = frameHeight * borderStart
      
      artwork.style.width = `${artworkWidth}px`
      artwork.style.height = `${artworkHeight}px`
      artwork.style.left = `${artworkLeft}px`
      artwork.style.top = `${artworkTop}px`
    }
  }, [currentTrack])
  
  // Empty state when no track is loaded
  if (!currentTrack) {
    return (
      <div className="now-playing-view view-wrapper">
        <div className="now-playing-empty">
          <div className="empty-text">No Track Playing</div>
          <div className="empty-hint">Select a song to start</div>
        </div>
      </div>
    )
  }
  
  // Calculate progress percentage (clamp between 0-100 to avoid negative values)
  const progressPercentage = duration ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0
  
  // Calculate strokeDashoffset for progress bar
  // Approximate perimeter of rounded rectangle: 2*(width + height - 2*radius) - 8*radius (for corners)
  // For our 94x94 rect with 8px radius: approximately 372 units
  // Start from bottom center (offset by ~93 to position at bottom center)
  // As progress increases, dashoffset decreases (revealing more of the stroke)
  const totalLength = 372
  const startOffset = 93 // Offset to start from bottom center
  const progressOffset = totalLength * (1 - progressPercentage / 100)

  return (
    <div className="now-playing-view view-wrapper">
      <div className="now-playing-container">
        
        {/* Album Artwork with Square Border Progress Bar */}
        <div className="album-artwork-wrapper">
          <div className="album-artwork-frame" ref={frameRef}>
            {/* Progress border - single line moving around square */}
            <svg className="progress-border-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Background border */}
              <rect
                x="3"
                y="3"
                width="94"
                height="94"
                fill="none"
                stroke="#e0e0e0"
                strokeWidth="3"
                rx="8"
                ry="8"
              />
              {/* Progress border - starts from bottom center, moves clockwise */}
              <rect
                x="3"
                y="3"
                width="94"
                height="94"
                fill="none"
                stroke="#2196F3"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={totalLength}
                strokeDashoffset={progressOffset + startOffset}
                rx="8"
                ry="8"
                className="progress-border-path"
              />
            </svg>
            
            {/* Album Art */}
            <div className="album-artwork" ref={artworkRef}>
              {currentTrack.albumArt ? (
                <img 
                  src={currentTrack.albumArt} 
                  alt={currentTrack.album || 'Album artwork'}
                  className="album-image"
                />
              ) : (
                <div className="album-placeholder" />
              )}
            </div>
          </div>
        </div>
        
        {/* Track Information */}
        <div className="track-info">
          <h1 className="track-title">{currentTrack.title}</h1>
          <h2 className="track-artist">{currentTrack.artist || 'Unknown Artist'}</h2>
        </div>
      </div>
    </div>
  )
}

export default NowPlayingView
