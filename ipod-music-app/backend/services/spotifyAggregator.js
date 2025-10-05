import SpotifyWebApi from 'spotify-web-api-node'

export class SpotifyAggregator {
  constructor(credentials) {
    this.api = new SpotifyWebApi({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      redirectUri: credentials.redirectUri
    })
    
    if (credentials.accessToken) {
      this.api.setAccessToken(credentials.accessToken)
    }
    if (credentials.refreshToken) {
      this.api.setRefreshToken(credentials.refreshToken)
    }
  }
  
  async refreshAccessToken() {
    const data = await this.api.refreshAccessToken()
    this.api.setAccessToken(data.body.access_token)
    return data.body.access_token
  }
  
  async getTracks() {
    const data = await this.api.getMySavedTracks({ limit: 50 })
    return data.body.items.map(item => ({
      id: `spotify:${item.track.id}`,
      title: item.track.name,
      artist: item.track.artists[0]?.name,
      album: item.track.album.name,
      duration: Math.floor(item.track.duration_ms / 1000),
      albumArt: item.track.album.images[0]?.url,
      streamUrl: item.track.preview_url,
      service: 'spotify'
    }))
  }
  
  async getAlbums() {
    const data = await this.api.getMySavedAlbums({ limit: 50 })
    return data.body.items.map(item => ({
      id: `spotify:${item.album.id}`,
      title: item.album.name,
      artist: item.album.artists[0]?.name,
      year: item.album.release_date?.substring(0, 4),
      coverArt: item.album.images[0]?.url,
      trackCount: item.album.total_tracks,
      service: 'spotify'
    }))
  }
  
  async getPlaylists() {
    const data = await this.api.getUserPlaylists({ limit: 50 })
    return data.body.items.map(item => ({
      id: `spotify:${item.id}`,
      title: item.name,
      description: item.description,
      trackCount: item.tracks.total,
      coverArt: item.images[0]?.url,
      service: 'spotify'
    }))
  }
  
  async getArtists() {
    const data = await this.api.getFollowedArtists({ limit: 50 })
    return data.body.artists.items.map(item => ({
      id: `spotify:${item.id}`,
      name: item.name,
      image: item.images[0]?.url,
      service: 'spotify'
    }))
  }
  
  async search(query, type = 'track') {
    const data = await this.api.search(query, [type], { limit: 20 })
    
    if (type === 'track' && data.body.tracks) {
      return data.body.tracks.items.map(item => ({
        id: `spotify:${item.id}`,
        title: item.name,
        artist: item.artists[0]?.name,
        album: item.album.name,
        duration: Math.floor(item.duration_ms / 1000),
        albumArt: item.album.images[0]?.url,
        streamUrl: item.preview_url,
        service: 'spotify'
      }))
    }
    
    return []
  }
}
