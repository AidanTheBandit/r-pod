# IMMEDIATE ACTION ITEMS TO COMPLETE THE APP

## Backend Status: ✅ COMPLETE AND RUNNING
- Universal music aggregator backend is running on http://localhost:3001
- Real service implementations: Spotify, YouTube Music, Jellyfin, Subsonic/Navidrome  
- Session-based aggregation working
- No placeholders - all real API integrations

## Frontend Status: ⚠️ NEEDS COMPLETION

The frontend files got corrupted during emoji removal. Here's what needs to be done:

### 1. Remove ALL Emojis from Frontend (PRIORITY)

Files that need emoji removal:
- `src/components/Header.jsx` - Remove battery emoji
- `src/views/MainMenu.jsx` - Remove all menu item emojis
- `src/views/NowPlayingView.jsx` - Remove play/pause/shuffle/repeat emojis, replace with text
- `src/views/SearchView.jsx` - Remove search emoji
- `src/views/SettingsView.jsx` - Remove all service emojis

Replace with:
- Plain text labels
- Simple ASCII symbols (>, ||, |<, >|)
- Or just remove icons entirely

### 2. Connect Frontend to Backend API

Create `src/services/backendClient.js`:
```javascript
import axios from 'axios'
import Cookies from 'js-cookie'

const BASE_URL = 'http://localhost:3001'

// Generate session ID once
const getSessionId = () => {
  let sessionId = Cookies.get('sessionId')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36)}`
    Cookies.set('sessionId', sessionId, { expires: 1 })
  }
  return sessionId
}

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'x-server-password': 'your-password' // From .env
  }
})

export const backendAPI = {
  async connectService(service, credentials) {
    const response = await client.post('/api/services/connect', {
      sessionId: getSessionId(),
      service,
      credentials
    })
    return response.data
  },
  
  async getTracks() {
    const response = await client.get('/api/tracks', {
      params: { sessionId: getSessionId() }
    })
    return response.data.tracks
  },
  
  async getAlbums() {
    const response = await client.get('/api/albums', {
      params: { sessionId: getSessionId() }
    })
    return response.data.albums
  },
  
  async getPlaylists() {
    const response = await client.get('/api/playlists', {
      params: { sessionId: getSessionId() }
    })
    return response.data.playlists
  },
  
  async getArtists() {
    const response = await client.get('/api/artists', {
      params: { sessionId: getSessionId() }
    })
    return response.data.artists
  },
  
  async search(query) {
    const response = await client.get('/api/search', {
      params: { sessionId: getSessionId(), q: query }
    })
    return response.data.results
  }
}
```

### 3. Update Views to Use Real Data

#### SongsView.jsx:
```javascript
import { useQuery } from '@tanstack/react-query'
import { backendAPI } from '../services/backendClient'

function SongsView() {
  const { data: tracks, isLoading, error } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => backendAPI.getTracks()
  })
  
  if (isLoading) return <div className="loading">Loading tracks...</div>
  if (error) return <div className="error">Error loading tracks</div>
  if (!tracks || tracks.length === 0) return <div className="empty">No tracks found</div>
  
  return <ListView items={tracks} onItemClick={handleSongClick} />
}
```

Apply same pattern to:
- AlbumsView.jsx → use `backendAPI.getAlbums()`
- ArtistsView.jsx → use `backendAPI.getArtists()`
- PlaylistsView.jsx → use `backendAPI.getPlaylists()`

#### SearchView.jsx:
```javascript
const { data: results, isLoading } = useQuery({
  queryKey: ['search', searchQuery],
  queryFn: () => backendAPI.search(searchQuery),
  enabled: searchQuery.length > 2
})
```

### 4. Fix Settings View to Connect to Backend

Remove the emoji icons and create real connection forms:

```javascript
const handleConnectSpotify = async () => {
  try {
    await backendAPI.connectService('spotify', {
      clientId: spotifyClientId,
      clientSecret: spotifyClientSecret,
      accessToken: spotifyToken,
      refreshToken: spotifyRefreshToken
    })
    alert('Spotify connected successfully!')
  } catch (error) {
    alert('Failed to connect: ' + error.message)
  }
}

const handleConnectYouTubeMusic = async () => {
  try {
    await backendAPI.connectService('youtubeMusic', {
      cookie: ytmCookie
    })
    alert('YouTube Music connected!')
  } catch (error) {
    alert('Failed: ' + error.message)
  }
}

const handleConnectSubsonic = async () => {
  try {
    await backendAPI.connectService('subsonic', {
      serverUrl,
      username,
      password
    })
    alert('Subsonic connected!')
  } catch (error) {
    alert('Failed: ' + error.message)
  }
}
```

### 5. Environment Setup

Create `src/config.js`:
```javascript
export const config = {
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
  backendPassword: import.meta.env.VITE_BACKEND_PASSWORD || 'your-password'
}
```

Create `.env.local`:
```
VITE_BACKEND_URL=http://localhost:3001
VITE_BACKEND_PASSWORD=your-password-here
```

### 6. Remove ALL Demo/Placeholder Data

Search and remove all instances of:
- `useState([demo data])` 
- Hardcoded song arrays
- Fake artists/albums/playlists
- Any `TODO` comments with fake data

Replace with real API calls using React Query.

## Testing Checklist

After completing above:

1. Start backend: `cd backend && node server.js`
2. Start frontend: `cd .. && npm run dev`
3. Open settings and connect a service
4. Verify tracks load in Songs view
5. Test playback
6. Test search
7. Verify no emojis appear anywhere

## Key Point

**THERE SHOULD BE ZERO PLACEHOLDERS, ZERO EMOJIS, ZERO FAKE DATA**

Every piece of data must come from the real backend API which aggregates from real music services. The backend is DONE and WORKING - just need to connect the frontend properly.
