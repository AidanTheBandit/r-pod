import YouTubeMusic from 'youtube-music-ts-api'

export class YouTubeMusicAggregator {
  constructor(credentials) {
    this.ytm = new YouTubeMusic()
    this.ytma = null
    this.cookie = credentials.cookie
  }
  
  async authenticate() {
    if (!this.ytma && this.cookie) {
      this.ytma = await this.ytm.authenticate(this.cookie)
    }
    return this.ytma !== null
  }
  
  async getTracks() {
    await this.authenticate()
    if (!this.ytma) return []
    
    const playlists = await this.ytma.getLibraryPlaylists()
    const allTracks = []
    
    // Get tracks from liked songs
    if (playlists && playlists.length > 0) {
      const likedSongs = playlists.find(p => p.name === 'Liked songs' || p.name === 'Your Likes')
      if (likedSongs) {
        const playlist = await this.ytma.getPlaylist(likedSongs.id)
        if (playlist && playlist.tracks) {
          playlist.tracks.forEach(track => {
            allTracks.push({
              id: `ytm:${track.videoId}`,
              title: track.name,
              artist: track.artist?.name,
              album: track.album?.name,
              duration: track.duration,
              albumArt: track.thumbnails?.[0]?.url,
              streamUrl: `https://music.youtube.com/watch?v=${track.videoId}`,
              service: 'youtubeMusic'
            })
          })
        }
      }
    }
    
    return allTracks
  }
  
  async getAlbums() {
    await this.authenticate()
    if (!this.ytma) return []
    
    const albums = await this.ytma.getLibraryAlbums()
    if (!albums) return []
    
    return albums.map(album => ({
      id: `ytm:${album.browseId}`,
      title: album.name,
      artist: album.artist?.name,
      year: album.year,
      coverArt: album.thumbnails?.[0]?.url,
      trackCount: album.trackCount,
      service: 'youtubeMusic'
    }))
  }
  
  async getPlaylists() {
    await this.authenticate()
    if (!this.ytma) return []
    
    const playlists = await this.ytma.getLibraryPlaylists()
    if (!playlists) return []
    
    return playlists.map(playlist => ({
      id: `ytm:${playlist.id}`,
      title: playlist.name,
      description: playlist.description,
      trackCount: playlist.count,
      coverArt: playlist.thumbnails?.[0]?.url,
      service: 'youtubeMusic'
    }))
  }
  
  async getArtists() {
    await this.authenticate()
    if (!this.ytma) return []
    
    const artists = await this.ytma.getLibraryArtists()
    if (!artists) return []
    
    return artists.map(artist => ({
      id: `ytm:${artist.browseId}`,
      name: artist.name,
      image: artist.thumbnails?.[0]?.url,
      service: 'youtubeMusic'
    }))
  }
  
  async search(query) {
    await this.authenticate()
    if (!this.ytma) return []
    
    const results = await this.ytma.search(query)
    if (!results || !results.content) return []
    
    const tracks = []
    results.content.forEach(item => {
      if (item.type === 'SONG' || item.type === 'VIDEO') {
        tracks.push({
          id: `ytm:${item.videoId}`,
          title: item.name,
          artist: item.artist?.name,
          album: item.album?.name,
          duration: item.duration,
          albumArt: item.thumbnails?.[0]?.url,
          streamUrl: `https://music.youtube.com/watch?v=${item.videoId}`,
          service: 'youtubeMusic'
        })
      }
    })
    
    return tracks
  }
  
  async getRecommendations() {
    await this.authenticate()
    if (!this.ytma) return []
    
    const home = await this.ytma.getHome()
    const tracks = []
    
    if (home && home.results) {
      home.results.forEach(section => {
        if (section.contents) {
          section.contents.forEach(item => {
            if (item.type === 'SONG' || item.type === 'VIDEO') {
              tracks.push({
                id: `ytm:${item.videoId}`,
                title: item.name,
                artist: item.artist?.name,
                album: item.album?.name,
                duration: item.duration,
                albumArt: item.thumbnails?.[0]?.url,
                streamUrl: `https://music.youtube.com/watch?v=${item.videoId}`,
                service: 'youtubeMusic'
              })
            }
          })
        }
      })
    }
    
    return tracks
  }
}
