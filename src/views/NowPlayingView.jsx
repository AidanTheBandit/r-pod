import { useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../store/playerStore'
import { Heart, ThumbsDown } from 'phosphor-react'
import backendAPI from '../services/backendClient'
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
  
  const [likeStatus, setLikeStatus] = useState('INDIFFERENT')
  const [ratingLoading, setRatingLoading] = useState(false)
  
  const frameRef = useRef(null)
  const artworkRef = useRef(null)
  const containerRef = useRef(null)
  
  // Update like status when track changes
  useEffect(() => {
    if (currentTrack?.likeStatus) {
      setLikeStatus(currentTrack.likeStatus)
    } else {
      setLikeStatus('INDIFFERENT')
    }
  }, [currentTrack])
  
  // Handle rating a song
  const handleRating = async (rating) => {
    if (!currentTrack?.videoId || ratingLoading) return
    
    try {
      setRatingLoading(true)
      const newRating = likeStatus === rating ? 'INDIFFERENT' : rating
      
      await backendAPI.rateSong(currentTrack.videoId, newRating)
      setLikeStatus(newRating)
    } catch (error) {
      console.error('Failed to rate song:', error)
    } finally {
      setRatingLoading(false)
    }
  }
  
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
  
  // Calculate progress for SVG progress bar
  // Perimeter of rounded rectangle: ~362 units
  // Progress fills clockwise from bottom center
  const totalLength = 362
  const progressLength = totalLength * (progressPercentage / 100)

  return (
    <div className="now-playing-view view-wrapper">
      <div className="now-playing-container" ref={containerRef}>
        
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
                stroke="var(--progress-bg-color, #e0e0e0)"
                strokeWidth="3"
                rx="8"
                ry="8"
              />
              {/* Progress border - starts from bottom center, moves clockwise */}
              <path
                d="M 50 97 L 89 97 A 8 8 0 0 0 97 89 L 97 11 A 8 8 0 0 0 89 3 L 11 3 A 8 8 0 0 0 3 11 L 3 89 A 8 8 0 0 0 11 97 L 50 97 Z"
                fill="none"
                stroke="var(--progress-color, #2196F3)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${progressLength} ${totalLength - progressLength}`}
                strokeDashoffset="0"
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
          
          {/* Rating Controls */}
          <div className="rating-controls">
            <button
              className={`rating-btn dislike-btn ${likeStatus === 'DISLIKE' ? 'active' : ''} ${ratingLoading ? 'loading' : ''}`}
              onClick={() => handleRating('DISLIKE')}
              disabled={ratingLoading}
              title={likeStatus === 'DISLIKE' ? 'Remove dislike' : 'Dislike this song'}
            >
              <ThumbsDown 
                size={24} 
                weight={likeStatus === 'DISLIKE' ? 'fill' : 'regular'} 
              />
            </button>
            
            <button
              className={`rating-btn like-btn ${likeStatus === 'LIKE' ? 'active' : ''} ${ratingLoading ? 'loading' : ''}`}
              onClick={() => handleRating('LIKE')}
              disabled={ratingLoading}
              title={likeStatus === 'LIKE' ? 'Remove like' : 'Like this song'}
            >
              <Heart 
                size={24} 
                weight={likeStatus === 'LIKE' ? 'fill' : 'regular'} 
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NowPlayingView
