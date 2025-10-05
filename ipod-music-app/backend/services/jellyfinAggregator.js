import axios from 'axios'

export class JellyfinAggregator {
  constructor(credentials) {
    this.baseUrl = credentials.serverUrl
    this.apiKey = credentials.apiKey
    this.userId = credentials.userId
  }
  
  async request(endpoint, params = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const response = await axios.get(url, {
      params,
      headers: {
        'X-Emby-Token': this.apiKey
      }
    })
    return response.data
  }
  
  async getTracks() {
    const data = await this.request(`/Users/${this.userId}/Items`, {
      IncludeItemTypes: 'Audio',
      Recursive: true,
      SortBy: 'SortName',
      Limit: 500
    })
    
    if (!data.Items) return []
    
    return data.Items.map(item => ({
      id: `jellyfin:${item.Id}`,
      title: item.Name,
      artist: item.AlbumArtist || item.Artists?.[0],
      album: item.Album,
      duration: Math.floor(item.RunTimeTicks / 10000000),
      albumArt: item.ImageTags?.Primary 
        ? `${this.baseUrl}/Items/${item.Id}/Images/Primary?api_key=${this.apiKey}`
        : null,
      streamUrl: `${this.baseUrl}/Audio/${item.Id}/universal?api_key=${this.apiKey}&userId=${this.userId}`,
      service: 'jellyfin'
    }))
  }
  
  async getAlbums() {
    const data = await this.request(`/Users/${this.userId}/Items`, {
      IncludeItemTypes: 'MusicAlbum',
      Recursive: true,
      SortBy: 'SortName',
      Limit: 500
    })
    
    if (!data.Items) return []
    
    return data.Items.map(item => ({
      id: `jellyfin:${item.Id}`,
      title: item.Name,
      artist: item.AlbumArtist,
      year: item.ProductionYear,
      coverArt: item.ImageTags?.Primary 
        ? `${this.baseUrl}/Items/${item.Id}/Images/Primary?api_key=${this.apiKey}`
        : null,
      trackCount: item.ChildCount,
      service: 'jellyfin'
    }))
  }
  
  async getPlaylists() {
    const data = await this.request(`/Users/${this.userId}/Items`, {
      IncludeItemTypes: 'Playlist',
      Recursive: true
    })
    
    if (!data.Items) return []
    
    return data.Items.map(item => ({
      id: `jellyfin:${item.Id}`,
      title: item.Name,
      description: item.Overview,
      trackCount: item.ChildCount,
      coverArt: item.ImageTags?.Primary 
        ? `${this.baseUrl}/Items/${item.Id}/Images/Primary?api_key=${this.apiKey}`
        : null,
      service: 'jellyfin'
    }))
  }
  
  async getArtists() {
    const data = await this.request(`/Artists`, {
      UserId: this.userId,
      Recursive: true,
      Limit: 500
    })
    
    if (!data.Items) return []
    
    return data.Items.map(item => ({
      id: `jellyfin:${item.Id}`,
      name: item.Name,
      image: item.ImageTags?.Primary 
        ? `${this.baseUrl}/Items/${item.Id}/Images/Primary?api_key=${this.apiKey}`
        : null,
      albumCount: item.AlbumCount,
      service: 'jellyfin'
    }))
  }
  
  async search(query) {
    const data = await this.request(`/Users/${this.userId}/Items`, {
      searchTerm: query,
      IncludeItemTypes: 'Audio',
      Recursive: true,
      Limit: 50
    })
    
    if (!data.Items) return []
    
    return data.Items.map(item => ({
      id: `jellyfin:${item.Id}`,
      title: item.Name,
      artist: item.AlbumArtist || item.Artists?.[0],
      album: item.Album,
      duration: Math.floor(item.RunTimeTicks / 10000000),
      albumArt: item.ImageTags?.Primary 
        ? `${this.baseUrl}/Items/${item.Id}/Images/Primary?api_key=${this.apiKey}`
        : null,
      streamUrl: `${this.baseUrl}/Audio/${item.Id}/universal?api_key=${this.apiKey}&userId=${this.userId}`,
      service: 'jellyfin'
    }))
  }
}
