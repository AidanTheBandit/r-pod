import axios from 'axios'
import { BaseMusicService, Track, Album, Artist, Playlist } from './baseMusicService'

/**
 * Spotify Music Service
 * Implements Spotify Web API
 */
export class SpotifyService extends BaseMusicService {
  constructor(config) {
    super(config)
    this.apiBase = 'https://api.spotify.com/v1'
    this.authBase = 'https://accounts.spotify.com'
  }
  
  async authenticate() {
    const { clientId, clientSecret } = this.config
    
    if (!clientId || !clientSecret) {
      throw new Error('Spotify client ID and secret required')
    }
    
    // OAuth flow - redirect to Spotify authorization
    const redirectUri = window.location.origin + '/callback/spotify'
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-library-read',
      'user-top-read',
      'playlist-read-private',
      'playlist-read-collaborative',
      'streaming',
    ].join(' ')
    
    const authUrl = `${this.authBase}/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}`
    
    window.location.href = authUrl
  }
  
  async exchangeCodeForToken(code) {
    const { clientId, clientSecret } = this.config
    const redirectUri = window.location.origin + '/callback/spotify'
    
    const response = await axios.post(
      `${this.authBase}/api/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        },
      }
    )
    
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    }
  }
  
  async refreshAuth() {
    const { clientId, clientSecret, refreshToken } = this.config
    
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }
    
    const response = await axios.post(
      `${this.authBase}/api/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        },
      }
    )
    
    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in,
    }
  }
  
  async request(endpoint, method = 'GET', data = null) {
    const { accessToken } = this.config
    
    if (!accessToken) {
      throw new Error('Not authenticated with Spotify')
    }
    
    const response = await axios({
      method,
      url: `${this.apiBase}${endpoint}`,
      data,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    
    return response.data
  }
  
  async getPlaylists() {
    const data = await this.request('/me/playlists')
    return data.items.map(item => new Playlist({
      id: item.id,
      title: item.name,
      description: item.description,
      trackCount: item.tracks.total,
      coverArt: item.images[0]?.url,
      serviceId: 'spotify',
    }))
  }
  
  async getAlbums() {
    const data = await this.request('/me/albums')
    return data.items.map(item => new Album({
      id: item.album.id,
      title: item.album.name,
      artist: item.album.artists[0]?.name,
      year: item.album.release_date?.substring(0, 4),
      coverArt: item.album.images[0]?.url,
      trackCount: item.album.total_tracks,
      serviceId: 'spotify',
    }))
  }
  
  async getArtists() {
    const data = await this.request('/me/following?type=artist')
    return data.artists.items.map(item => new Artist({
      id: item.id,
      name: item.name,
      image: item.images[0]?.url,
      serviceId: 'spotify',
    }))
  }
  
  async getTracks() {
    const data = await this.request('/me/tracks')
    return data.items.map(item => new Track({
      id: item.track.id,
      title: item.track.name,
      artist: item.track.artists[0]?.name,
      album: item.track.album.name,
      duration: Math.floor(item.track.duration_ms / 1000),
      albumArt: item.track.album.images[0]?.url,
      streamUrl: item.track.preview_url, // Note: Spotify requires SDK for full playback
      serviceId: 'spotify',
    }))
  }
  
  async search(query, type = 'track') {
    const data = await this.request(`/search?q=${encodeURIComponent(query)}&type=${type}`)
    
    const results = []
    
    if (data.tracks) {
      results.push(...data.tracks.items.map(item => new Track({
        id: item.id,
        title: item.name,
        artist: item.artists[0]?.name,
        album: item.album.name,
        duration: Math.floor(item.duration_ms / 1000),
        albumArt: item.album.images[0]?.url,
        streamUrl: item.preview_url,
        serviceId: 'spotify',
      })))
    }
    
    return results
  }
  
  async getStreamUrl(trackId) {
    const track = await this.request(`/tracks/${trackId}`)
    return track.preview_url // Note: Full playback requires Spotify Web Playback SDK
  }
  
  async logout() {
    this.isAuthenticated = false
    // Clear tokens from config
  }
}
