# Now Playing UI Update - Circular Progress Design

## Changes Made

### 1. **Circular Progress Bar Around Album Art** ✅
- Progress bar now wraps around the album art (iPod-style)
- Uses SVG circle with `stroke-dasharray` animation
- Smooth transition as song plays
- Background ring shows track duration
- Colored ring shows current progress

**Visual Design:**
- Album art: 240x240px centered
- Progress ring: 280x280px (20px padding around art)
- Ring thickness: 6px
- Ring color: #5a9fd4 (blue)

### 2. **Fixed Audio Streaming Authentication** ✅
The stream endpoint was failing because audio elements can't send custom headers.

**Solution:**
- Modified `/api/stream/youtube/:videoId` to accept password as query parameter
- Updated `backendClient.js` to append password to stream URL
- Stream endpoint now checks both query param AND header for auth
- Audio element can now authenticate properly

**Before:**
```
GET /api/stream/youtube/abc123
Header: x-server-password: xxx
```

**After:**
```
GET /api/stream/youtube/abc123?password=xxx
```

### 3. **Dark Theme UI** ✅
- Changed background from light to dark gradient
- White text on dark background
- Semi-transparent control buttons
- Better contrast and modern look

**Color Scheme:**
- Background: #1a1a1a → #2d2d2d gradient
- Text: #ffffff (title), #b0b0b0 (artist), #888 (album)
- Progress ring: #5a9fd4
- Buttons: rgba(255, 255, 255, 0.1) with hover states

### 4. **Improved Layout** ✅
- Centered vertical layout
- Album art with progress ring is focal point
- Time display below (current / total)
- Play/pause and skip buttons
- Shuffle/repeat controls at bottom

## Files Modified

1. **`/src/views/NowPlayingView.jsx`**
   - Added SVG circular progress bar
   - Calculated circle circumference and dash offset
   - Removed old linear progress bar click handler
   - Updated layout structure

2. **`/src/views/NowPlayingView.css`**
   - Added `.progress-ring` and `.progress-ring-circle` styles
   - Updated album art container to be relative positioned
   - Changed color scheme to dark theme
   - Hid linear progress bar elements
   - Updated all button styles for dark theme

3. **`/src/App.jsx`**
   - Added `crossOrigin="anonymous"` to audio element
   - Added useEffect to handle stream URL updates

4. **`/src/services/backendClient.js`**
   - Modified stream URL construction
   - Appends `password` query parameter to stream URLs
   - Uses `URL` API to properly add query params

5. **`/backend/server.js`**
   - Modified `/api/stream/youtube/:videoId` endpoint
   - Now accepts password from query param OR header
   - Custom authentication middleware for stream endpoint

## How It Works

### Circular Progress Animation
```javascript
const radius = 130
const circumference = 2 * Math.PI * radius
const strokeDashoffset = circumference - (progressPercentage / 100) * circumference

<circle
  strokeDasharray={circumference}
  strokeDashoffset={strokeDashoffset}
  // This creates the animated "fill" effect
/>
```

### Stream Authentication
```javascript
// Add password to URL
const url = new URL(fullStreamUrl)
url.searchParams.set('password', BACKEND_PASSWORD)

// Server checks both sources
const passwordFromQuery = req.query.password
const passwordFromHeader = req.headers['x-server-password']
```

## Testing

1. ✅ Stream URLs now include password parameter
2. ✅ Audio playback authenticates successfully
3. ✅ Circular progress updates smoothly
4. ✅ Dark theme looks professional
5. ✅ Layout is centered and balanced

## Before vs After

**Before:**
- Linear progress bar below album art
- Light theme with lots of wasted space
- Stream endpoint returning 401 unauthorized
- Audio wouldn't play

**After:**
- Circular progress wraps around album art (space efficient)
- Dark, modern theme
- Stream endpoint authenticates properly
- Audio plays successfully

## Next Steps

- [ ] Add click handler to progress ring for seeking
- [ ] Add animation for album art rotation
- [ ] Consider adding visualizer bars
- [ ] Add gesture support for swipe controls
- [ ] Test on actual R1 device
