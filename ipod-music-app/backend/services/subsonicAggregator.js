import axios from 'axios'

export class SubsonicAggregator {
  constructor(credentials) {
    this.baseUrl = credentials.serverUrl
    this.username = credentials.username
    this.password = credentials.password
  }
  
  buildUrl(endpoint, params = {}) {
    const allParams = {
      u: this.username,
      p: this.password,
      v: '1.16.1',
      c: 'iPodMusicApp',
      f: 'json',
      ...params
    }
    
    const queryString = Object.entries(allParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')
    
    return `${this.baseUrl}/rest/${endpoint}?${queryString}`
  }
  
  async request(endpoint, params = {}) {
    const url = this.buildUrl(endpoint, params)
    const response = await axios.get(url)
    
    if (response.data['subsonic-response'].status !== 'ok') {
      throw new Error(response.data['subsonic-response'].error?.message || 'Subsonic API error')
    }
    
    return response.data['subsonic-response']
  }
  
  async getTracks() {
    const data = await this.request('getStarred2')
    if (!data.starred2 || !data.starred2.song) return []
    
    return data.starred2.song.map(song => ({
      id: `subsonic:${song.id}`,
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      albumArt: song.coverArt ? this.buildUrl('getCoverArt', { id: song.coverArt }) : null,
      streamUrl: this.buildUrl('stream', { id: song.id }),
      service: 'subsonic'
    }))
  }
  
  async getAlbums() {
    const data = await this.request('getAlbumList2', { type: 'alphabeticalByName', size: 500 })
    if (!data.albumList2 || !data.albumList2.album) return []
    
    return data.albumList2.album.map(album => ({
      id: `subsonic:${album.id}`,
      title: album.name,
      artist: album.artist,
      year: album.year,
      coverArt: album.coverArt ? this.buildUrl('getCoverArt', { id: album.coverArt }) : null,
      trackCount: album.songCount,
      service: 'subsonic'
    }))
  }
  
  async getPlaylists() {
    const data = await this.request('getPlaylists')
    if (!data.playlists || !data.playlists.playlist) return []
    
    return data.playlists.playlist.map(playlist => ({
      id: `subsonic:${playlist.id}`,
      title: playlist.name,
      description: playlist.comment,
      trackCount: playlist.songCount,
      coverArt: playlist.coverArt ? this.buildUrl('getCoverArt', { id: playlist.coverArt }) : null,
      service: 'subsonic'
    }))
  }
  
  async getArtists() {
    const data = await this.request('getArtists')
    const artists = []
    
    if (data.artists && data.artists.index) {
      data.artists.index.forEach(index => {
        if (index.artist) {
          index.artist.forEach(artist => {
            artists.push({
              id: `subsonic:${artist.id}`,
              name: artist.name,
              albumCount: artist.albumCount,
              service: 'subsonic'
            })
          })
        }
      })
    }
    
    return artists
  }
  
  async search(query) {
    const data = await this.request('search3', { query })
    const tracks = []
    
    if (data.searchResult3 && data.searchResult3.song) {
      data.searchResult3.song.forEach(song => {
        tracks.push({
          id: `subsonic:${song.id}`,
          title: song.title,
          artist: song.artist,
          album: song.album,
          duration: song.duration,
          albumArt: song.coverArt ? this.buildUrl('getCoverArt', { id: song.coverArt }) : null,
          streamUrl: this.buildUrl('stream', { id: song.id }),
          service: 'subsonic'
        })
      })
    }
    
    return tracks
  }
}
