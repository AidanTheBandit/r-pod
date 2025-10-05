import { useEffect } from 'react'
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
    shuffle,
    repeat,
  } = usePlayerStore()
  
  // Format time helper (mm:ss)
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Calculate remaining time
  const remainingTime = duration - currentTime
  
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
  
  // Calculate progress percentage
  const progressPercentage = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="now-playing-view view-wrapper">
      <div className="now-playing-container">
        
        {/* Album Artwork with Square Border Progress Bar */}
        <div className="album-artwork-wrapper">
          <div className="album-artwork-frame">
            {/* Progress border - single line moving around square */}
            <svg className="progress-border-svg" viewBox="0 0 100 100">
              {/* Background border */}
              <rect
                x="2"
                y="2"
                width="96"
                height="96"
                fill="none"
                stroke="#e0e0e0"
                strokeWidth="2"
                rx="3"
              />
              {/* Progress border - starts from bottom center */}
              <rect
                x="2"
                y="2"
                width="96"
                height="96"
                fill="none"
                stroke="#2196F3"
                strokeWidth="2"
                strokeDasharray="380"
                strokeDashoffset={380 - (380 * progressPercentage / 100)}
                rx="3"
                className="progress-border-path"
                transform="rotate(90 50 50)"
              />
            </svg>
            
            {/* Album Art */}
            <div className="album-artwork">
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
          <div className="track-album">{currentTrack.album || 'Unknown Album'}</div>
        </div>
        
        {/* Time Display */}
        <div className="time-display">
          <span className="time-elapsed">{formatTime(currentTime)}</span>
          <span className="time-separator">•</span>
          <span className="time-remaining">-{formatTime(remainingTime)}</span>
        </div>
        
        {/* Status Indicators */}
        <div className="status-indicators">
          <div className={`status-badge ${shuffle ? 'active' : 'inactive'}`}>
            {shuffle ? 'Shuffle' : 'Linear'}
          </div>
          <div className={`status-badge ${repeat !== 'none' ? 'active' : 'inactive'}`}>
            {repeat === 'one' ? 'Repeat One' : repeat === 'all' ? 'Repeat All' : 'No Repeat'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NowPlayingView
