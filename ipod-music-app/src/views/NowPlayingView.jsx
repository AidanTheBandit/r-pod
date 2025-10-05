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
          <div className="empty-icon">♪</div>
          <div className="empty-text">No Track Playing</div>
          <div className="empty-hint">Select a song to start</div>
        </div>
      </div>
    )
  }
  
  // Calculate progress percentage
  const progressPercentage = duration ? (currentTime / duration) * 100 : 0
  
  // Get error state
  const error = usePlayerStore((state) => state.error)

  return (
    <div className="now-playing-view view-wrapper">
      <div className="now-playing-container">
        
        {/* Album Artwork - Large, centered, square */}
        <div className="album-artwork-wrapper">
          <div className="album-artwork">
            {currentTrack.albumArt ? (
              <img 
                src={currentTrack.albumArt} 
                alt={currentTrack.album || 'Album artwork'}
                className="album-image"
              />
            ) : (
              <div className="album-placeholder">
                <div className="placeholder-icon">♪</div>
              </div>
            )}
            
            {/* Play/Pause indicator overlay */}
            <div className="playback-indicator">
              <div className={`indicator-icon ${isPlaying ? 'playing' : 'paused'}`}>
                {isPlaying ? '▶' : '❚❚'}
              </div>
            </div>
          </div>
          
          {/* Thin progress bar under album art */}
          <div className="progress-bar-thin">
            <div 
              className="progress-fill-thin"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        {/* Track Information - Clean typography */}
        <div className="track-info">
          <h1 className="track-title">{currentTrack.title}</h1>
          <h2 className="track-artist">{currentTrack.artist || 'Unknown Artist'}</h2>
          <div className="track-album">{currentTrack.album || 'Unknown Album'}</div>
        </div>
        
        {/* Time Display - Elapsed / Remaining */}
        <div className="time-display">
          <span className="time-elapsed">{formatTime(currentTime)}</span>
          <span className="time-separator">•</span>
          <span className="time-remaining">-{formatTime(remainingTime)}</span>
        </div>
        
        {/* Status Indicators - Shuffle & Repeat */}
        <div className="status-indicators">
          <div className={`status-badge ${shuffle ? 'active' : 'inactive'}`}>
            {shuffle ? '🔀 Shuffle' : '➡️ Linear'}
          </div>
          <div className={`status-badge ${repeat !== 'none' ? 'active' : 'inactive'}`}>
            {repeat === 'one' ? '🔂 One' : repeat === 'all' ? '🔁 All' : '➡️ None'}
          </div>
        </div>
        
        {/* Control Instructions */}
        <div className="control-instructions">
          <div className="instruction-item">
            <span className="instruction-icon">🎛️</span>
            <span className="instruction-text">Scroll: Skip/Seek</span>
          </div>
          <div className="instruction-item">
            <span className="instruction-icon">⏯️</span>
            <span className="instruction-text">PTT: Play/Pause</span>
          </div>
        </div>
        
        {/* Error Message (if any) */}
        {error && (
          <div className="playback-error-banner">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default NowPlayingView
