import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../store/playerStore'
import './NowPlayingView.css'

function NowPlayingView() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    shuffle,
    repeat,
    toggleShuffle,
    cycleRepeat,
  } = usePlayerStore()
  
  const progressRef = useRef(null)
  
  // Format time helper
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Handle progress bar click
  const handleProgressClick = (e) => {
    if (!progressRef.current || !duration) return
    
    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration
    
    seekTo(newTime)
  }
  
  if (!currentTrack) {
    return (
      <div className="now-playing-view view-wrapper">
        <div className="now-playing-empty">
          <div className="empty-icon">NO TRACK</div>
          <div className="empty-text">No track playing</div>
        </div>
      </div>
    )
  }
  
  const progressPercentage = duration ? (currentTime / duration) * 100 : 0
  
  // Calculate circle progress
  const radius = 130
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference

  // Get error state
  const error = usePlayerStore((state) => state.error)

  return (
    <div className="now-playing-view view-wrapper">
      <div className="now-playing-container">
        {/* Error Message */}
        {error && (
          <div className="playback-error">
            <div className="error-icon">⚠️</div>
            <div className="error-message">{error}</div>
          </div>
        )}
        {/* Album Art with Circular Progress */}
        <div className="album-art-container">
          {/* Circular Progress Ring */}
          <svg className="progress-ring" width="260" height="260">
            {/* Background circle */}
            <circle
              cx="130"
              cy="130"
              r={radius}
              stroke="#e0e0e0"
              strokeWidth="4"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              className="progress-ring-circle"
              cx="130"
              cy="130"
              r={radius}
              stroke="#007bff"
              strokeWidth="4"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          
          {/* Album Art */}
          <div className="album-art">
            {currentTrack.albumArt ? (
              <img src={currentTrack.albumArt} alt={currentTrack.album} />
            ) : (
              <div className="album-art-placeholder">♪</div>
            )}
          </div>
        </div>
        
        {/* Song Info */}
        <div className="song-info">
          <div className="song-title" title={currentTrack.title}>
            {currentTrack.title}
          </div>
          <div className="song-artist">{currentTrack.artist}</div>
          <div className="song-album">{currentTrack.album}</div>
        </div>
        
        {/* Progress Time Display */}
        <div className="progress-container">
          <div className="progress-time">{formatTime(currentTime)}</div>
          <div className="progress-time">{formatTime(duration)}</div>
        </div>
        
        {/* Playback Controls */}
        <div className="playback-controls">
          <div
            className="control-btn"
            onClick={playPrevious}
            role="button"
            tabIndex={0}
            aria-label="Previous track"
          >
            |◄
          </div>
          <div
            className="control-btn control-play"
            onClick={togglePlayPause}
            role="button"
            tabIndex={0}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '||' : '▶'}
          </div>
          <div
            className="control-btn"
            onClick={playNext}
            role="button"
            tabIndex={0}
            aria-label="Next track"
          >
            ►|
          </div>
        </div>
        
        {/* Additional Controls */}
        <div className="additional-controls">
          <div
            className={`control-btn-small ${shuffle ? 'active' : ''}`}
            onClick={toggleShuffle}
            role="button"
            tabIndex={0}
            aria-label="Shuffle"
          >
            SHUF
          </div>
          <div
            className={`control-btn-small ${repeat !== 'none' ? 'active' : ''}`}
            onClick={cycleRepeat}
            role="button"
            tabIndex={0}
            aria-label="Repeat"
          >
            {repeat === 'one' ? 'REP1' : repeat === 'all' ? 'REPA' : 'REP'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NowPlayingView
