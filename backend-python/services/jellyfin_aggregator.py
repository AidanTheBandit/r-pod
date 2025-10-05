"""
Jellyfin Service Aggregator
"""
from typing import List, Dict, Any
import logging
import httpx

from .base_music_service import BaseMusicService

logger = logging.getLogger(__name__)


class JellyfinAggregator(BaseMusicService):
    """Jellyfin service aggregator"""
    
    def __init__(self, credentials: Dict[str, Any]):
        super().__init__(credentials)
        self.base_url = credentials.get("serverUrl", "").rstrip("/")
        self.api_key = credentials.get("apiKey")
        self.user_id = credentials.get("userId")
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def authenticate(self) -> bool:
        """Authenticate with Jellyfin"""
        try:
            logger.info("[Jellyfin] Testing authentication...")
            url = f"{self.base_url}/System/Info"
            response = await self.client.get(
                url,
                headers={"X-Emby-Token": self.api_key}
            )
            
            if response.status_code == 200:
                self.is_authenticated = True
                logger.info("[Jellyfin] ✓ Authentication successful")
                return True
            else:
                logger.error(f"[Jellyfin] Authentication failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"[Jellyfin] Authentication error: {e}")
            return False
    
    async def _request(self, endpoint: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Make Jellyfin API request"""
        url = f"{self.base_url}{endpoint}"
        response = await self.client.get(
            url,
            params=params,
            headers={"X-Emby-Token": self.api_key}
        )
        response.raise_for_status()
        return response.json()
    
    async def get_tracks(self) -> List[Dict[str, Any]]:
        """Get audio items"""
        if not self.is_authenticated:
            await self.authenticate()
        
        tracks = []
        
        try:
            logger.info("[Jellyfin] Fetching tracks")
            data = await self._request(
                f"/Users/{self.user_id}/Items",
                {
                    "IncludeItemTypes": "Audio",
                    "Recursive": True,
                    "SortBy": "SortName",
                    "Limit": 500
                }
            )
            
            for item in data.get("Items", []):
                tracks.append({
                    "id": f"jellyfin:{item['Id']}",
                    "title": item.get("Name", "Unknown"),
                    "artist": item.get("AlbumArtist") or (item.get("Artists", ["Unknown"])[0]),
                    "album": item.get("Album", "Unknown"),
                    "duration": item.get("RunTimeTicks", 0) // 10000000,
                    "albumArt": f"{self.base_url}/Items/{item['Id']}/Images/Primary?api_key={self.api_key}" if item.get("ImageTags", {}).get("Primary") else None,
                    "streamUrl": f"{self.base_url}/Audio/{item['Id']}/universal?api_key={self.api_key}&userId={self.user_id}",
                    "service": "jellyfin"
                })
            
            logger.info(f"[Jellyfin] ✓ Returning {len(tracks)} tracks")
            
        except Exception as e:
            logger.error(f"[Jellyfin] Error getting tracks: {e}")
        
        return tracks
    
    async def get_albums(self, album_type: str = "user") -> List[Dict[str, Any]]:
        """Get albums"""
        if not self.is_authenticated:
            await self.authenticate()
        
        albums = []
        
        try:
            logger.info("[Jellyfin] Fetching albums")
            data = await self._request(
                f"/Users/{self.user_id}/Items",
                {
                    "IncludeItemTypes": "MusicAlbum",
                    "Recursive": True,
                    "SortBy": "SortName",
                    "Limit": 500
                }
            )
            
            for item in data.get("Items", []):
                albums.append({
                    "id": f"jellyfin:{item['Id']}",
                    "title": item.get("Name", "Unknown"),
                    "artist": item.get("AlbumArtist", "Unknown"),
                    "year": item.get("ProductionYear"),
                    "coverArt": f"{self.base_url}/Items/{item['Id']}/Images/Primary?api_key={self.api_key}" if item.get("ImageTags", {}).get("Primary") else None,
                    "trackCount": item.get("ChildCount", 0),
                    "service": "jellyfin"
                })
            
            logger.info(f"[Jellyfin] ✓ Returning {len(albums)} albums")
            
        except Exception as e:
            logger.error(f"[Jellyfin] Error getting albums: {e}")
        
        return albums
    
    async def get_playlists(self) -> List[Dict[str, Any]]:
        """Get playlists"""
        if not self.is_authenticated:
            await self.authenticate()
        
        playlists = []
        
        try:
            logger.info("[Jellyfin] Fetching playlists")
            data = await self._request(
                f"/Users/{self.user_id}/Items",
                {
                    "IncludeItemTypes": "Playlist",
                    "Recursive": True
                }
            )
            
            for item in data.get("Items", []):
                playlists.append({
                    "id": f"jellyfin:{item['Id']}",
                    "name": item.get("Name", "Unknown"),
                    "title": item.get("Name", "Unknown"),
                    "description": item.get("Overview", ""),
                    "trackCount": item.get("ChildCount", 0),
                    "coverArt": f"{self.base_url}/Items/{item['Id']}/Images/Primary?api_key={self.api_key}" if item.get("ImageTags", {}).get("Primary") else None,
                    "service": "jellyfin"
                })
            
            logger.info(f"[Jellyfin] ✓ Returning {len(playlists)} playlists")
            
        except Exception as e:
            logger.error(f"[Jellyfin] Error getting playlists: {e}")
        
        return playlists
    
    async def get_artists(self, artist_type: str = "user") -> List[Dict[str, Any]]:
        """Get artists"""
        if not self.is_authenticated:
            await self.authenticate()
        
        artists = []
        
        try:
            logger.info("[Jellyfin] Fetching artists")
            data = await self._request(
                "/Artists",
                {
                    "UserId": self.user_id,
                    "Recursive": True,
                    "Limit": 500
                }
            )
            
            for item in data.get("Items", []):
                artists.append({
                    "id": f"jellyfin:{item['Id']}",
                    "name": item.get("Name", "Unknown"),
                    "image": f"{self.base_url}/Items/{item['Id']}/Images/Primary?api_key={self.api_key}" if item.get("ImageTags", {}).get("Primary") else None,
                    "albumCount": item.get("AlbumCount", 0),
                    "service": "jellyfin"
                })
            
            logger.info(f"[Jellyfin] ✓ Returning {len(artists)} artists")
            
        except Exception as e:
            logger.error(f"[Jellyfin] Error getting artists: {e}")
        
        return artists
    
    async def search(self, query: str) -> List[Dict[str, Any]]:
        """Search Jellyfin"""
        if not self.is_authenticated:
            await self.authenticate()
        
        results = []
        
        try:
            logger.info(f"[Jellyfin] Searching: {query}")
            data = await self._request(
                f"/Users/{self.user_id}/Items",
                {
                    "searchTerm": query,
                    "IncludeItemTypes": "Audio",
                    "Recursive": True,
                    "Limit": 50
                }
            )
            
            for item in data.get("Items", []):
                results.append({
                    "id": f"jellyfin:{item['Id']}",
                    "title": item.get("Name", "Unknown"),
                    "artist": item.get("AlbumArtist") or (item.get("Artists", ["Unknown"])[0]),
                    "album": item.get("Album", "Unknown"),
                    "duration": item.get("RunTimeTicks", 0) // 10000000,
                    "albumArt": f"{self.base_url}/Items/{item['Id']}/Images/Primary?api_key={self.api_key}" if item.get("ImageTags", {}).get("Primary") else None,
                    "streamUrl": f"{self.base_url}/Audio/{item['Id']}/universal?api_key={self.api_key}&userId={self.user_id}",
                    "service": "jellyfin",
                    "type": "song"
                })
            
            logger.info(f"[Jellyfin] ✓ Found {len(results)} results")
            
        except Exception as e:
            logger.error(f"[Jellyfin] Search error: {e}")
        
        return results
    
    async def close(self):
        """Cleanup"""
        await self.client.aclose()
