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
    updateCurrentTime,
    setDuration,
    setAudioElement,
    shuffle,
    repeat,
    toggleShuffle,
    cycleRepeat,
  } = usePlayerStore()
  
  const audioRef = useRef(null)
  const progressRef = useRef(null)
  
  // Set audio element in store
  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current)
    }
  }, [setAudioElement])
  
  // Update current time
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    
    const handleTimeUpdate = () => {
      updateCurrentTime(audio.currentTime)
    }
    
    const handleDurationChange = () => {
      setDuration(audio.duration)
    }
    
    const handleEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0
        audio.play()
      } else {
        playNext()
      }
    }
    
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [updateCurrentTime, setDuration, playNext, repeat])
  
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
  
  return (
    <div className="now-playing-view view-wrapper">
      <div className="now-playing-container">
        {/* Album Art */}
        <div className="album-art-container">
          <div className="album-art">
            {currentTrack.albumArt ? (
              <img src={currentTrack.albumArt} alt={currentTrack.album} />
            ) : (
              <div className="album-art-placeholder">ALBUM</div>
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
        
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-time">{formatTime(currentTime)}</div>
          <div
            className="progress-bar"
            ref={progressRef}
            onClick={handleProgressClick}
          >
            <div
              className="progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
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
      
      {/* Audio element */}
      <audio
        ref={audioRef}
        src={currentTrack.streamUrl}
        autoPlay={isPlaying}
      />
    </div>
  )
}

export default NowPlayingView
