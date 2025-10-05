"""
Subsonic/Navidrome Service Aggregator
"""
from typing import List, Dict, Any
import logging
import httpx
from urllib.parse import urlencode

from .base_music_service import BaseMusicService

logger = logging.getLogger(__name__)


class SubsonicAggregator(BaseMusicService):
    """Subsonic/Navidrome service aggregator"""
    
    def __init__(self, credentials: Dict[str, Any]):
        super().__init__(credentials)
        self.base_url = credentials.get("serverUrl", "").rstrip("/")
        self.username = credentials.get("username")
        self.password = credentials.get("password")
        self.client = httpx.AsyncClient(timeout=30.0)
    
    def _build_url(self, endpoint: str, params: Dict[str, Any] = None) -> str:
        """Build Subsonic API URL with authentication"""
        all_params = {
            "u": self.username,
            "p": self.password,
            "v": "1.16.1",
            "c": "iPodMusicApp",
            "f": "json",
            **(params or {})
        }
        return f"{self.base_url}/rest/{endpoint}?{urlencode(all_params)}"
    
    async def authenticate(self) -> bool:
        """Authenticate with Subsonic"""
        try:
            logger.info("[Subsonic] Testing authentication...")
            url = self._build_url("ping")
            response = await self.client.get(url)
            data = response.json()
            
            if data.get("subsonic-response", {}).get("status") == "ok":
                self.is_authenticated = True
                logger.info("[Subsonic] ✓ Authentication successful")
                return True
            else:
                logger.error("[Subsonic] Authentication failed")
                return False
                
        except Exception as e:
            logger.error(f"[Subsonic] Authentication error: {e}")
            return False
    
    async def _request(self, endpoint: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Make Subsonic API request"""
        url = self._build_url(endpoint, params)
        response = await self.client.get(url)
        data = response.json()
        
        if data.get("subsonic-response", {}).get("status") != "ok":
            error = data.get("subsonic-response", {}).get("error", {})
            raise Exception(error.get("message", "Subsonic API error"))
        
        return data["subsonic-response"]
    
    async def get_tracks(self) -> List[Dict[str, Any]]:
        """Get starred songs"""
        if not self.is_authenticated:
            await self.authenticate()
        
        tracks = []
        
        try:
            logger.info("[Subsonic] Fetching starred songs")
            data = await self._request("getStarred2")
            songs = data.get("starred2", {}).get("song", [])
            
            for song in songs:
                tracks.append({
                    "id": f"subsonic:{song['id']}",
                    "title": song.get("title", "Unknown"),
                    "artist": song.get("artist", "Unknown"),
                    "album": song.get("album", "Unknown"),
                    "duration": song.get("duration"),
                    "albumArt": self._build_url("getCoverArt", {"id": song["coverArt"]}) if song.get("coverArt") else None,
                    "streamUrl": self._build_url("stream", {"id": song["id"]}),
                    "service": "subsonic"
                })
            
            logger.info(f"[Subsonic] ✓ Returning {len(tracks)} tracks")
            
        except Exception as e:
            logger.error(f"[Subsonic] Error getting tracks: {e}")
        
        return tracks
    
    async def get_albums(self, album_type: str = "user") -> List[Dict[str, Any]]:
        """Get albums"""
        if not self.is_authenticated:
            await self.authenticate()
        
        albums = []
        
        try:
            logger.info("[Subsonic] Fetching albums")
            data = await self._request("getAlbumList2", {
                "type": "alphabeticalByName",
                "size": 500
            })
            
            album_list = data.get("albumList2", {}).get("album", [])
            
            for album in album_list:
                albums.append({
                    "id": f"subsonic:{album['id']}",
                    "title": album.get("name", "Unknown"),
                    "artist": album.get("artist", "Unknown"),
                    "year": album.get("year"),
                    "coverArt": self._build_url("getCoverArt", {"id": album["coverArt"]}) if album.get("coverArt") else None,
                    "trackCount": album.get("songCount", 0),
                    "service": "subsonic"
                })
            
            logger.info(f"[Subsonic] ✓ Returning {len(albums)} albums")
            
        except Exception as e:
            logger.error(f"[Subsonic] Error getting albums: {e}")
        
        return albums
    
    async def get_playlists(self) -> List[Dict[str, Any]]:
        """Get playlists"""
        if not self.is_authenticated:
            await self.authenticate()
        
        playlists = []
        
        try:
            logger.info("[Subsonic] Fetching playlists")
            data = await self._request("getPlaylists")
            playlist_list = data.get("playlists", {}).get("playlist", [])
            
            for playlist in playlist_list:
                playlists.append({
                    "id": f"subsonic:{playlist['id']}",
                    "name": playlist.get("name", "Unknown"),
                    "title": playlist.get("name", "Unknown"),
                    "description": playlist.get("comment", ""),
                    "trackCount": playlist.get("songCount", 0),
                    "coverArt": self._build_url("getCoverArt", {"id": playlist["coverArt"]}) if playlist.get("coverArt") else None,
                    "service": "subsonic"
                })
            
            logger.info(f"[Subsonic] ✓ Returning {len(playlists)} playlists")
            
        except Exception as e:
            logger.error(f"[Subsonic] Error getting playlists: {e}")
        
        return playlists
    
    async def get_artists(self, artist_type: str = "user") -> List[Dict[str, Any]]:
        """Get artists"""
        if not self.is_authenticated:
            await self.authenticate()
        
        artists = []
        
        try:
            logger.info("[Subsonic] Fetching artists")
            data = await self._request("getArtists")
            
            for index in data.get("artists", {}).get("index", []):
                for artist in index.get("artist", []):
                    artists.append({
                        "id": f"subsonic:{artist['id']}",
                        "name": artist.get("name", "Unknown"),
                        "albumCount": artist.get("albumCount", 0),
                        "service": "subsonic"
                    })
            
            logger.info(f"[Subsonic] ✓ Returning {len(artists)} artists")
            
        except Exception as e:
            logger.error(f"[Subsonic] Error getting artists: {e}")
        
        return artists
    
    async def search(self, query: str) -> List[Dict[str, Any]]:
        """Search Subsonic"""
        if not self.is_authenticated:
            await self.authenticate()
        
        results = []
        
        try:
            logger.info(f"[Subsonic] Searching: {query}")
            data = await self._request("search3", {"query": query})
            
            for song in data.get("searchResult3", {}).get("song", []):
                results.append({
                    "id": f"subsonic:{song['id']}",
                    "title": song.get("title", "Unknown"),
                    "artist": song.get("artist", "Unknown"),
                    "album": song.get("album", "Unknown"),
                    "duration": song.get("duration"),
                    "albumArt": self._build_url("getCoverArt", {"id": song["coverArt"]}) if song.get("coverArt") else None,
                    "streamUrl": self._build_url("stream", {"id": song["id"]}),
                    "service": "subsonic",
                    "type": "song"
                })
            
            logger.info(f"[Subsonic] ✓ Found {len(results)} results")
            
        except Exception as e:
            logger.error(f"[Subsonic] Search error: {e}")
        
        return results
    
    async def close(self):
        """Cleanup"""
        await self.client.aclose()
