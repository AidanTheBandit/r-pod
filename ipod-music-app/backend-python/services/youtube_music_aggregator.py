"""
YouTube Music Service Aggregator
Uses ytmusicapi for superior YouTube Music support
"""
from typing import List, Dict, Any, Optional
import logging
from ytmusicapi import YTMusic

from .base_music_service import BaseMusicService

logger = logging.getLogger(__name__)


class YouTubeMusicAggregator(BaseMusicService):
    """YouTube Music service using ytmusicapi"""
    
    def __init__(self, credentials: Dict[str, Any]):
        """
        Initialize YouTube Music service
        
        Args:
            credentials: Dictionary with 'cookie' and optional 'profile'
        """
        super().__init__(credentials)
        self.ytm: Optional[YTMusic] = None
        self.cookie = credentials.get("cookie")
        self.profile = credentials.get("profile", "0")
        
    async def authenticate(self) -> bool:
        """Authenticate with YouTube Music"""
        try:
            logger.info(f"[YTM] Authenticating with cookie")
            
            if not self.cookie:
                logger.error("[YTM] No cookie provided")
                return False
            
            # Initialize YTMusic with cookie string directly
            # ytmusicapi expects cookie string in requests format
            self.ytm = YTMusic()
            self.ytm.headers["Cookie"] = self.cookie
            
            # Test the authentication by getting home feed
            try:
                test_home = await self._run_sync(self.ytm.get_home, limit=1)
                if test_home:
                    self.is_authenticated = True
                    logger.info("[YTM] ✓ Authentication successful")
                    return True
                else:
                    logger.error("[YTM] Authentication test returned empty")
                    self.is_authenticated = False
                    return False
            except Exception as test_error:
                logger.error(f"[YTM] Authentication test failed: {test_error}")
                self.is_authenticated = False
                return False
                
        except Exception as e:
            logger.error(f"[YTM] Authentication failed: {e}")
            self.is_authenticated = False
            return False
    
    async def _run_sync(self, func, *args, **kwargs):
        """Helper to run synchronous ytmusicapi calls"""
        import asyncio
        return await asyncio.get_event_loop().run_in_executor(
            None, lambda: func(*args, **kwargs)
        )
    
    async def get_tracks(self) -> List[Dict[str, Any]]:
        """Get user's tracks - prioritizes Quick Picks and Listen Again from home"""
        if not self.is_authenticated:
            await self.authenticate()
        
        tracks = []
        
        try:
            logger.info("[YTM] Fetching recommended tracks from home")
            
            # Get home feed for Quick Picks, Listen Again, etc.
            try:
                home = await self._run_sync(self.ytm.get_home)
                
                if home:
                    # Priority sections to extract tracks from
                    priority_sections = [
                        "quick pick", "listen again", "mixed for you",
                        "recommended", "for you", "your mix"
                    ]
                    
                    # First, get tracks from priority sections
                    for section in home:
                        title = (section.get("title") or "").lower()
                        section_name = section.get("title", "Recommendations")
                        
                        # Check if this is a priority section
                        is_priority = any(p in title for p in priority_sections)
                        
                        if is_priority and section.get("contents"):
                            logger.info(f"[YTM] Extracting from section: {section_name}")
                            
                            for item in section["contents"]:
                                if item.get("videoId"):
                                    track = self._map_ytm_track(item)
                                    if track:
                                        track["section"] = section_name
                                        tracks.append(track)
                                        
                                        # Stop if we have enough tracks
                                        if len(tracks) >= 50:
                                            break
                            
                            if len(tracks) >= 50:
                                break
                    
                    logger.info(f"[YTM] Got {len(tracks)} tracks from home sections")
                    
            except Exception as e:
                logger.warning(f"[YTM] Failed to get home recommendations: {e}")
            
            # If still not enough tracks, try library songs
            if len(tracks) < 20:
                try:
                    logger.info("[YTM] Fetching library songs as fallback")
                    library_songs = await self._run_sync(
                        self.ytm.get_library_songs,
                        limit=50
                    )
                    
                    if library_songs:
                        for song in library_songs:
                            track = self._map_ytm_track(song)
                            if track:
                                track["section"] = "Library"
                                tracks.append(track)
                        logger.info(f"[YTM] Added {len(library_songs)} library songs")
                except Exception as e:
                    logger.warning(f"[YTM] Failed to get library songs: {e}")
            
        except Exception as e:
            logger.error(f"[YTM] Error getting tracks: {e}")
        
        return tracks[:100]  # Limit to 100 tracks
    
    async def get_albums(self, album_type: str = "user") -> List[Dict[str, Any]]:
        """Get albums - defaults to recommended from home page"""
        if not self.is_authenticated:
            await self.authenticate()
        
        albums = []
        
        try:
            # Always get recommendations from home page for better results
            logger.info("[YTM] Fetching recommended albums from home")
            home = await self._run_sync(self.ytm.get_home, limit=10)
            
            if home:
                for section in home:
                    if section.get("contents"):
                        for item in section["contents"]:
                            # Check if it's an album
                            if item.get("browseId") and (item.get("browseId", "").startswith("MPREb_") or "album" in str(item.get("resultType", "")).lower()):
                                mapped = self._map_ytm_album(item)
                                if mapped:
                                    albums.append(mapped)
                                    if len(albums) >= 20:
                                        break
                    if len(albums) >= 20:
                        break
            
            # If no albums from home, search for popular
            if len(albums) < 5:
                logger.info("[YTM] Searching for popular albums")
                results = await self._run_sync(
                    self.ytm.search,
                    "popular music",
                    filter="albums",
                    limit=20
                )
                
                for album in results:
                    mapped = self._map_ytm_album(album)
                    if mapped:
                        albums.append(mapped)
            
            logger.info(f"[YTM] ✓ Returning {len(albums)} albums")
            
        except Exception as e:
            logger.error(f"[YTM] Error getting albums: {e}")
        
        return albums
    
    async def get_playlists(self) -> List[Dict[str, Any]]:
        """Get user playlists"""
        if not self.is_authenticated:
            await self.authenticate()
        
        playlists = []
        
        try:
            logger.info("[YTM] Fetching user playlists")
            library_playlists = await self._run_sync(
                self.ytm.get_library_playlists,
                limit=50
            )
            
            if library_playlists:
                for playlist in library_playlists:
                    mapped = self._map_ytm_playlist(playlist)
                    if mapped:
                        playlists.append(mapped)
            else:
                logger.warning("[YTM] No library playlists returned")
            
            logger.info(f"[YTM] ✓ Returning {len(playlists)} playlists")
            
        except Exception as e:
            logger.error(f"[YTM] Error getting playlists: {e}")
        
        return playlists
    
    async def get_artists(self, artist_type: str = "user") -> List[Dict[str, Any]]:
        """Get artists - defaults to recommended"""
        if not self.is_authenticated:
            await self.authenticate()
        
        artists = []
        
        try:
            # Always get recommendations from home/search
            logger.info("[YTM] Searching for recommended artists")
            results = await self._run_sync(
                self.ytm.search,
                "popular artists music",
                filter="artists",
                limit=20
            )
            
            if results:
                for artist in results:
                    mapped = self._map_ytm_artist(artist)
                    if mapped:
                        artists.append(mapped)
            else:
                logger.warning("[YTM] No artists found in search")
            
            logger.info(f"[YTM] ✓ Returning {len(artists)} artists")
            
        except Exception as e:
            logger.error(f"[YTM] Error getting artists: {e}")
        
        return artists
    
    async def search(self, query: str) -> List[Dict[str, Any]]:
        """Search YouTube Music"""
        if not self.is_authenticated:
            await self.authenticate()
        
        results = []
        
        try:
            logger.info(f"[YTM] Searching: {query}")
            
            # Search songs
            songs = await self._run_sync(
                self.ytm.search,
                query,
                filter="songs",
                limit=10
            )
            
            for song in songs:
                track = self._map_ytm_track(song)
                if track:
                    track["type"] = "song"
                    results.append(track)
            
            # Search albums
            albums = await self._run_sync(
                self.ytm.search,
                query,
                filter="albums",
                limit=5
            )
            
            for album in albums:
                mapped = self._map_ytm_album(album)
                if mapped:
                    mapped["type"] = "album"
                    results.append(mapped)
            
            # Search artists
            artists = await self._run_sync(
                self.ytm.search,
                query,
                filter="artists",
                limit=5
            )
            
            for artist in artists:
                mapped = self._map_ytm_artist(artist)
                if mapped:
                    mapped["type"] = "artist"
                    results.append(mapped)
            
            logger.info(f"[YTM] ✓ Found {len(results)} results")
            
        except Exception as e:
            logger.error(f"[YTM] Search error: {e}")
        
        return results
    
    async def get_recommendations(self) -> List[Dict[str, Any]]:
        """Get personalized recommendations from all home sections"""
        if not self.is_authenticated:
            await self.authenticate()
        
        recommendations = []
        
        try:
            logger.info("[YTM] Getting recommendations from home")
            home = await self._run_sync(self.ytm.get_home)
            
            if home:
                for section in home:
                    section_title = section.get("title", "Recommendations")
                    if section.get("contents"):
                        logger.info(f"[YTM] Processing section: {section_title}")
                        for item in section["contents"][:5]:
                            if item.get("videoId"):
                                track = self._map_ytm_track(item)
                                if track:
                                    track["section"] = section_title
                                    recommendations.append(track)
            
            logger.info(f"[YTM] ✓ Got {len(recommendations)} recommendations")
            
        except Exception as e:
            logger.error(f"[YTM] Error getting recommendations: {e}")
        
        return recommendations
    
    async def get_home_section(self, section_name: str) -> List[Dict[str, Any]]:
        """
        Get a specific named recommendations section from YouTube Music home
        
        Args:
            section_name: Section to find (e.g., 'Quick Picks', 'Listen again', 'Mixed for you')
            
        Returns:
            List of tracks from that section
        """
        if not self.is_authenticated:
            await self.authenticate()
        
        tracks = []
        
        try:
            logger.info(f"[YTM] Getting home section: {section_name}")
            home = await self._run_sync(self.ytm.get_home)
            
            if not home:
                logger.warning("[YTM] Home feed returned empty")
                return []
            
            # Search for matching section (case-insensitive)
            section_name_lower = section_name.lower()
            
            for section in home:
                title = (section.get("title") or "").lower()
                
                # Match section name
                if section_name_lower in title:
                    logger.info(f"[YTM] Found section: {section.get('title')}")
                    
                    for item in section.get("contents", []):
                        if item.get("videoId"):
                            track = self._map_ytm_track(item)
                            if track:
                                track["section"] = section.get("title", section_name)
                                tracks.append(track)
                    
                    logger.info(f"[YTM] ✓ Got {len(tracks)} tracks from '{section.get('title')}'")
                    break
            
            if not tracks:
                logger.warning(f"[YTM] Section '{section_name}' not found in home feed")
                # List available sections for debugging
                available_sections = [s.get("title") for s in home if s.get("title")]
                logger.info(f"[YTM] Available sections: {', '.join(available_sections)}")
            
        except Exception as e:
            logger.error(f"[YTM] Error getting home section '{section_name}': {e}")
        
        return tracks
    
    async def get_radio(self, video_id: str) -> List[Dict[str, Any]]:
        """Get radio/autoplay tracks based on a seed song"""
        if not self.is_authenticated:
            await self.authenticate()
        
        radio_tracks = []
        
        try:
            logger.info(f"[YTM] Getting radio for video: {video_id}")
            watch_playlist = await self._run_sync(
                self.ytm.get_watch_playlist,
                videoId=video_id,
                limit=20
            )
            
            if watch_playlist and "tracks" in watch_playlist:
                for track in watch_playlist["tracks"]:
                    mapped = self._map_ytm_track(track)
                    if mapped:
                        mapped["section"] = "Radio"
                        radio_tracks.append(mapped)
            
            logger.info(f"[YTM] ✓ Got {len(radio_tracks)} radio tracks")
            
        except Exception as e:
            logger.error(f"[YTM] Error getting radio: {e}")
        
        return radio_tracks
    
    def _map_ytm_track(self, track: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Map YouTube Music track to standard format"""
        try:
            video_id = track.get("videoId")
            if not video_id:
                return None
            
            # Extract artist name
            artist = "Unknown Artist"
            if track.get("artists") and len(track["artists"]) > 0:
                artist = track["artists"][0].get("name", "Unknown Artist")
            elif track.get("artist"):
                if isinstance(track["artist"], dict):
                    artist = track["artist"].get("name", "Unknown Artist")
                else:
                    artist = str(track["artist"])
            
            # Extract album name
            album = "Unknown Album"
            if track.get("album"):
                if isinstance(track["album"], dict):
                    album = track["album"].get("name", "Unknown Album")
                else:
                    album = str(track["album"])
            
            # Get thumbnail
            thumbnail = None
            if track.get("thumbnails") and len(track["thumbnails"]) > 0:
                thumbnail = track["thumbnails"][0].get("url")
            elif track.get("thumbnail"):
                thumbnail = track["thumbnail"]
            
            return {
                "id": f"ytm:{video_id}",
                "title": track.get("title", "Unknown Title"),
                "artist": artist,
                "album": album,
                "duration": track.get("duration"),
                "albumArt": thumbnail,
                "streamUrl": f"/api/stream/youtube/{video_id}",
                "service": "youtubeMusic",
                "videoId": video_id
            }
        except Exception as e:
            logger.error(f"[YTM] Error mapping track: {e}")
            return None
    
    def _map_ytm_album(self, album: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Map YouTube Music album to standard format"""
        try:
            browse_id = album.get("browseId") or album.get("albumId")
            if not browse_id:
                return None
            
            # Extract artist
            artist = "Unknown Artist"
            if album.get("artists") and len(album["artists"]) > 0:
                artist = album["artists"][0].get("name", "Unknown Artist")
            elif album.get("artist"):
                if isinstance(album["artist"], dict):
                    artist = album["artist"].get("name", "Unknown Artist")
                else:
                    artist = str(album["artist"])
            
            # Get thumbnail
            thumbnail = None
            if album.get("thumbnails") and len(album["thumbnails"]) > 0:
                thumbnail = album["thumbnails"][0].get("url")
            
            return {
                "id": f"ytm:{browse_id}",
                "title": album.get("title") or album.get("name", "Unknown Album"),
                "artist": artist,
                "year": album.get("year"),
                "coverArt": thumbnail,
                "trackCount": album.get("trackCount", 0),
                "service": "youtubeMusic"
            }
        except Exception as e:
            logger.error(f"[YTM] Error mapping album: {e}")
            return None
    
    def _map_ytm_playlist(self, playlist: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Map YouTube Music playlist to standard format"""
        try:
            playlist_id = playlist.get("playlistId")
            if not playlist_id:
                return None
            
            # Get thumbnail
            thumbnail = None
            if playlist.get("thumbnails") and len(playlist["thumbnails"]) > 0:
                thumbnail = playlist["thumbnails"][0].get("url")
            
            return {
                "id": f"ytm:{playlist_id}",
                "name": playlist.get("title", "Unknown Playlist"),
                "title": playlist.get("title", "Unknown Playlist"),
                "description": playlist.get("description", ""),
                "trackCount": playlist.get("count", 0),
                "coverArt": thumbnail,
                "service": "youtubeMusic"
            }
        except Exception as e:
            logger.error(f"[YTM] Error mapping playlist: {e}")
            return None
    
    def _map_ytm_artist(self, artist: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Map YouTube Music artist to standard format"""
        try:
            browse_id = artist.get("browseId") or artist.get("artistId")
            if not browse_id:
                return None
            
            # Get thumbnail
            thumbnail = None
            if artist.get("thumbnails") and len(artist["thumbnails"]) > 0:
                thumbnail = artist["thumbnails"][0].get("url")
            
            return {
                "id": f"ytm:{browse_id}",
                "name": artist.get("artist") or artist.get("name", "Unknown Artist"),
                "image": thumbnail,
                "service": "youtubeMusic"
            }
        except Exception as e:
            logger.error(f"[YTM] Error mapping artist: {e}")
            return None
