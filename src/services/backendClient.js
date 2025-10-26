import axios from 'axios'
import Cookies from 'js-cookie'
import { getBackendUrl, getServerPassword, getDeviceId } from '../config'

// Load saved backend configuration from localStorage, fallback to env vars or auto-detect
const loadBackendConfig = () => {
  try {
    const savedConfig = localStorage.getItem('backend-config')
    if (savedConfig) {
      const config = JSON.parse(savedConfig)
      if (config.url && config.password) {
        console.log('[BackendClient] Using saved backend config:', config.url)
        return config
      }
    }
  } catch (e) {
    console.warn('[BackendClient] Failed to load saved backend config:', e)
  }
  
  // Auto-detect backend URL and password
  return {
    url: getBackendUrl(),
    password: getServerPassword()
  }
}

// Initialize configuration
let config = loadBackendConfig()
let BACKEND_URL = config.url
let BACKEND_PASSWORD = config.password

// Allow dynamic configuration
export const updateBackendConfig = (url, password) => {
  BACKEND_URL = url
  BACKEND_PASSWORD = password
  
  // Save to localStorage
  try {
    localStorage.setItem('backend-config', JSON.stringify({ url, password }))
    console.log('[BackendClient] Saved backend config to localStorage')
  } catch (e) {
    console.warn('[BackendClient] Failed to save backend config:', e)
  }
  
  // Reinitialize the client with new config
  initializeClient()
}

// Generate session ID once per session
const getSessionId = () => {
  let sessionId = Cookies.get('music-session-id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    Cookies.set('music-session-id', sessionId, { expires: 7 }) // 7 days
  }
  return sessionId
}

// Create axios instance
let client = null

const initializeClient = () => {
  client = axios.create({
    baseURL: BACKEND_URL,
    headers: {
      'x-server-password': BACKEND_PASSWORD,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest' // Helps with some WebView CORS issues
    },
    timeout: 30000, // 30 second timeout
    withCredentials: false // Explicitly disable credentials for CORS
  })

  // Add request interceptor for session ID and device ID
  client.interceptors.request.use((config) => {
    const sessionId = getSessionId();
    const deviceId = getDeviceId();
    
    if (config.params) {
      config.params.sessionId = sessionId;
      config.params.device_id = deviceId;
    } else {
      config.params = { 
        sessionId: sessionId,
        device_id: deviceId
      };
    }
    return config
  })

  // Add response interceptor for error handling and URL conversion
  client.interceptors.response.use(
    (response) => {
      // Convert relative streaming URLs to full URLs
      if (response.data && Array.isArray(response.data.tracks)) {
        response.data.tracks = response.data.tracks.map(track => {
          let fullStreamUrl = track.streamUrl
          
          // Convert to full URL if relative
          if (fullStreamUrl?.startsWith('/api/')) {
            fullStreamUrl = `${BACKEND_URL}${fullStreamUrl}`
          }
          
          // Add password as query param for audio element authentication
          if (fullStreamUrl) {
            try {
              const url = new URL(fullStreamUrl)
              url.searchParams.set('password', BACKEND_PASSWORD)
              fullStreamUrl = url.toString()
            } catch (e) {
              console.error('[BackendClient] Failed to parse URL:', fullStreamUrl, e)
            }
          }
          
          console.log('[BackendClient] Track:', track.title, 'Stream URL:', fullStreamUrl)
          return {
            ...track,
            streamUrl: fullStreamUrl
          }
        })
      }
      if (response.data && Array.isArray(response.data.albums)) {
        response.data.albums = response.data.albums.map(album => ({
          ...album,
          // Albums don't have stream URLs, but just in case
        }))
      }
      if (response.data && Array.isArray(response.data.playlists)) {
        response.data.playlists = response.data.playlists.map(playlist => ({
          ...playlist,
          // Playlists don't have stream URLs, but just in case
        }))
      }
      if (response.data && Array.isArray(response.data.artists)) {
        response.data.artists = response.data.artists.map(artist => ({
          ...artist,
          // Artists don't have stream URLs, but just in case
        }))
      }
      if (response.data && Array.isArray(response.data.results)) {
        response.data.results = response.data.results
          .filter(result => {
            // Filter out results without essential data
            // For songs: must have title and videoId
            // For albums/artists/playlists: must have title/name
            if (result.type === 'song') {
              return result.title && (result.videoId || result.streamUrl)
            }
            // For non-song types, just check if they have a title or name
            return result.title || result.name
          })
          .map(result => {
            let fullStreamUrl = result.streamUrl
            
            // Convert to full URL if relative
            if (fullStreamUrl?.startsWith('/api/')) {
              fullStreamUrl = `${BACKEND_URL}${fullStreamUrl}`
            }
            
            // Add password as query param for audio element authentication
            if (fullStreamUrl) {
              try {
                const url = new URL(fullStreamUrl)
                url.searchParams.set('password', BACKEND_PASSWORD)
                fullStreamUrl = url.toString()
              } catch (e) {
                console.error('[BackendClient] Failed to parse search result URL:', fullStreamUrl, e)
              }
            }
            
            console.log('[BackendClient] Search Result:', result.title || result.name, 'Type:', result.type, 'Stream URL:', fullStreamUrl)
            return {
              ...result,
              streamUrl: fullStreamUrl
            }
          })
      }
      if (response.data && Array.isArray(response.data.recommendations)) {
        response.data.recommendations = response.data.recommendations.map(rec => {
          let fullStreamUrl = rec.streamUrl
          
          // Convert to full URL if relative
          if (fullStreamUrl?.startsWith('/api/')) {
            fullStreamUrl = `${BACKEND_URL}${fullStreamUrl}`
          }
          
          // Add password as query param for audio element authentication
          if (fullStreamUrl) {
            try {
              const url = new URL(fullStreamUrl)
              url.searchParams.set('password', BACKEND_PASSWORD)
              fullStreamUrl = url.toString()
            } catch (e) {
              console.error('[BackendClient] Failed to parse recommendation URL:', fullStreamUrl, e)
            }
          }
          
          return {
            ...rec,
            streamUrl: fullStreamUrl
          }
        })
      }
      return response
    },
    (error) => {
      if (error.response?.status === 401) {
        console.error('Authentication failed - check backend password')
      } else if (error.response?.status === 451) {
        console.warn('YouTube protection error:', error.response.data?.detail || 'Content temporarily unavailable due to YouTube protections')
        // Re-throw with additional context for UI handling
        const protectionError = new Error(error.response.data?.detail || 'Content temporarily unavailable due to YouTube protections')
        protectionError.code = 'YOUTUBE_PROTECTION'
        protectionError.status = 451
        return Promise.reject(protectionError)
      } else if (error.response?.status === 500) {
        console.error('Backend server error:', error.response.data)
      } else if (error.code === 'ECONNREFUSED') {
        console.error('Cannot connect to backend server - check if it\'s running')
      }
      return Promise.reject(error)
    }
  )
}

// Initialize with default config
initializeClient()

export const backendAPI = {
  // Service connection
  async connectService(service, credentials) {
    const response = await client.post('/api/services/connect', {
      sessionId: getSessionId(), // Include sessionId in request body
      service,
      credentials
    })
    return response.data
  },

  // Data fetching
  async getTracks() {
    const response = await client.get('/api/tracks')
    return response.data.tracks || []
  },

  async getAlbums(type = 'user', offset = 0, limit = 50) {
    const response = await client.get('/api/albums', {
      params: { type, offset, limit }
    })
    return response.data.albums || []
  },

  async getPlaylists(offset = 0, limit = 50) {
    const response = await client.get('/api/playlists', {
      params: { offset, limit }
    })
    return response.data.playlists || []
  },

  async getArtists(type = 'user', offset = 0, limit = 50) {
    const response = await client.get('/api/artists', {
      params: { type, offset, limit }
    })
    return response.data.artists || []
  },

  async getPlaylistTracks(playlistId) {
    const response = await client.get(`/api/playlists/${playlistId}/tracks`)
    return response.data.tracks || []
  },

  async getArtistAlbums(artistId) {
    const response = await client.get(`/api/artists/${artistId}/albums`)
    return response.data.albums || []
  },

  async getAlbumTracks(albumId) {
    const response = await client.get(`/api/albums/${albumId}/tracks`)
    return response.data.tracks || []
  },

  async search(query, type = 'track') {
    const response = await client.get('/api/search', {
      params: { q: query, type }
    })
    return response.data.results || []
  },

  // Get available profiles for a service
  async getProfiles(service) {
    const response = await client.get(`/api/profiles/${service}`)
    return response.data.profiles || []
  },

  // Health check
  async healthCheck() {
    const response = await client.get('/health')
    return response.data
  },

  // Get radio tracks for a video ID
  async getRadio(videoId) {
    const response = await client.get(`/api/radio/${videoId}`)
    return response.data.tracks || []
  },

  // Rate a song (like/dislike)
  async rateSong(videoId, rating) {
    const response = await client.post(`/api/songs/${videoId}/rate`, { rating })
    return response.data
  },

  // Get song info including like status
  async getSongInfo(videoId) {
    const response = await client.get(`/api/songs/${videoId}`)
    return response.data
  },
}

export default backendAPI