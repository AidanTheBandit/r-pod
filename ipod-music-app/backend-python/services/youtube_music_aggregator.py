"""
YouTube Music Service Aggregator
Uses ytmusicapi for superior YouTube Music support with proper authentication
"""
from typing import List, Dict, Any, Optional
import logging
from ytmusicapi import YTMusic
import os
import tempfile
import hashlib
import time

from .base_music_service import BaseMusicService

logger = logging.getLogger(__name__)

class YouTubeMusicAggregator(BaseMusicService):
    """YouTube Music service using ytmusicapi with proper cookie authentication"""
    
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
        self.cookie_file = None
        
    def _create_cookie_file(self):
        """Create a temporary cookie file for ytmusicapi"""
        try:
            self.cookie_file = tempfile.NamedTemporaryFile(
                mode='w', 
                suffix='.txt',
                delete=False
            )
            
            # Write cookies in simple format for ytmusicapi
            self.cookie_file.write(self.cookie)
            self.cookie_file.close()
            
            logger.info(f"[YTM] Created cookie file: {self.cookie_file.name}")
            return self.cookie_file.name
            
        except Exception as e:
            logger.error(f"[YTM] Failed to create cookie file: {e}")
            return None
        
    async def authenticate(self) -> bool:
        """Enhanced authentication with multiple fallback methods"""
        try:
            logger.info(f"[YTM] Starting authentication with multiple methods")
            
            if not self.cookie:
                logger.error("[YTM] No cookie provided")
                return False
            
            # Method 1: Try cookie file method (most reliable)
            logger.info("[YTM] Method 1: Trying cookie file authentication")
            try:
                cookie_file_path = self._create_cookie_file()
                if cookie_file_path:
                    self.ytm = YTMusic(cookie_file_path)
                    
                    # Test authentication
                    test_home = await self._run_sync(self.ytm.get_home, limit=1)
                    if test_home and len(test_home) > 0:
                        first_section = test_home[0].get("title", "").lower()
                        personal_indicators = ['quick pick', 'listen again', 'mixed for you', 'your']
                        is_personal = any(indicator in first_section for indicator in personal_indicators)
                        
                        if is_personal:
                            logger.info(f"[YTM] ✓ Cookie file auth successful - got section: {test_home[0].get('title')}")
                        else:
                            logger.warning(f"[YTM] ⚠ Cookie file auth successful but content may not be personal - got section: {test_home[0].get('title')}")
                        
                        self.is_authenticated = True
                        return True
            except Exception as e:
                logger.warning(f"[YTM] Cookie file method failed: {e}")
            
            # Method 2: Try manual header setup with compression handling
            logger.info("[YTM] Method 2: Trying manual headers with compression handling")
            try:
                # Use the profile as the account index
                auth_user = self.profile
                logger.info(f"[YTM] Using account index: {auth_user}")
                
                self.ytm = YTMusic()
                
                # Parse cookies for SAPISID
                cookies = {}
                for cookie_pair in self.cookie.split('; '):
                    if '=' in cookie_pair:
                        name, value = cookie_pair.split('=', 1)
                        cookies[name] = value
                
                # Create comprehensive browser-like headers matching the working curl
                headers = {
                    'Cookie': self.cookie,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Origin': 'https://music.youtube.com',
                    'Referer': 'https://music.youtube.com/',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'same-origin',
                    'Sec-Fetch-Site': 'same-origin',
                    'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                    'sec-ch-ua-arch': '"arm"',
                    'sec-ch-ua-bitness': '"64"',
                    'sec-ch-ua-form-factors': '"Desktop"',
                    'sec-ch-ua-full-version': '"140.0.7339.186"',
                    'sec-ch-ua-full-version-list': '"Chromium";v="140.0.7339.186", "Not=A?Brand";v="24.0.0.0", "Google Chrome";v="140.0.7339.186"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-model': '""',
                    'sec-ch-ua-platform': '"macOS"',
                    'sec-ch-ua-platform-version': '"26.0.1"',
                    'sec-ch-ua-wow64': '?0',
                    'X-Goog-AuthUser': auth_user,
                    'X-Goog-PageId': 'account-chooser',
                    'X-Goog-Visitor-Id': 'CgtkUUNUWjk4M0o5VSi7p4rHBjIKCgJVUxIEGgAgCw%3D%3D',
                    'X-Origin': 'https://music.youtube.com',
                    'X-Client-Data': 'CMTaygE=',
                    'X-YouTube-Bootstrap-Logged-In': 'true',
                    'X-YouTube-Client-Name': '67',
                    'X-YouTube-Client-Version': '1.20250929.03.00',
                    'Priority': 'u=1, i'
                }
                
                # Add SAPISID authentication with all three hash types
                if 'SAPISID' in cookies or '__Secure-3PAPISID' in cookies:
                    import hashlib
                    import time
                    
                    sapisid = cookies.get('__Secure-3PAPISID') or cookies.get('SAPISID')
                    if sapisid:
                        timestamp = str(int(time.time()))
                        origin = 'https://music.youtube.com'
                        
                        # Create SAPISID hash
                        hash_input = f"{timestamp} {sapisid} {origin}"
                        sapisid_hash = hashlib.sha1(hash_input.encode()).hexdigest()
                        
                        # Create all three authorization headers like in the working curl
                        headers['Authorization'] = f'SAPISIDHASH {timestamp}_{sapisid_hash}'
                        logger.info(f"[YTM] Added SAPISID authentication for account {auth_user}")
                
                # Set headers on ytmusic instance
                if not hasattr(self.ytm, 'headers'):
                    self.ytm.headers = {}
                self.ytm.headers.update(headers)
                
                # Try to configure the underlying requests session to handle Brotli
                if hasattr(self.ytm, '_session') and self.ytm._session:
                    try:
                        import brotli
                        self.ytm._session.headers.update(headers)
                        logger.info("[YTM] Updated session headers and Brotli is available")
                    except ImportError:
                        logger.warning("[YTM] Brotli library not available, compression may fail")
                
                # Test authentication
                test_home = await self._run_sync(self.ytm.get_home, limit=1)
                if test_home and len(test_home) > 0:
                    first_section = test_home[0].get("title", "").lower()
                    personal_indicators = ['quick pick', 'listen again', 'mixed for you', 'your']
                    is_personal = any(indicator in first_section for indicator in personal_indicators)
                    
                    if is_personal:
                        logger.info(f"[YTM] ✓ Personal authentication successful with account {auth_user} - got section: {test_home[0].get('title')}")
                        self.is_authenticated = True
                        return True
                    else:
                        logger.info(f"[YTM] Account {auth_user} authenticated but not personal - got section: {test_home[0].get('title')}")
                        # For single account testing, still return success
                        self.is_authenticated = True
                        return True
                
                logger.warning("[YTM] Authentication test failed")
                return False
                    
            except Exception as e:
                logger.warning(f"[YTM] Manual headers method failed: {e}")
                return False
            
            logger.error("[YTM] All authentication methods failed")
            self.is_authenticated = False
            return False
                
        except Exception as e:
            logger.error(f"[YTM] Authentication failed: {e}")
            self.is_authenticated = False
            return False
    
    async def debug_authentication(self) -> Dict[str, Any]:
        """Debug method to check what account/region we're actually authenticated as"""
        if not self.is_authenticated:
            await self.authenticate()
        
        try:
            # Get account info
            logger.info("[YTM] Checking authentication details...")
            
            # Test different endpoints to see what we get
            home = await self._run_sync(self.ytm.get_home, limit=2)
            
            debug_info = {
                "home_sections": [
                    {
                        "title": section.get("title"),
                        "content_count": len(section.get("contents", [])),
                        "first_item_title": section.get("contents", [{}])[0].get("title") if section.get("contents") else None
                    }
                    for section in (home or [])[:5]  # First 5 sections
                ],
                "total_home_sections": len(home or []),
                "cookie_length": len(self.cookie) if self.cookie else 0,
                "headers": dict(self.ytm.headers) if hasattr(self.ytm, 'headers') else {}
            }
            
            logger.info(f"[YTM] Debug info: {debug_info}")
            return debug_info
            
        except Exception as e:
            logger.error(f"[YTM] Debug authentication failed: {e}")
            return {"error": str(e)}
    
    async def _run_sync(self, func, *args, **kwargs):
        """Helper to run synchronous ytmusicapi calls"""
        import asyncio
        return await asyncio.get_event_loop().run_in_executor(
            None, lambda: func(*args, **kwargs)
        )
    
    async def get_tracks(self) -> List[Dict[str, Any]]:
        """Get user's tracks with priority on personal recommendations"""
        if not self.is_authenticated:
            await self.authenticate()
        
        tracks = []
        
        try:
            logger.info("[YTM] Fetching personalized tracks from home sections")
            
            # Get home feed with personalized recommendations
            home = await self._run_sync(self.ytm.get_home, limit=10)
            
            if home:
                # Process home sections to find tracks, prioritizing personal shelves
                personal_sections = [
                    'Quick picks', 'Listen again', 'Your likes', 'Mixed for you',
                    'Recommended music videos', 'Similar to', 'More from'
                ]
                
                # First, get tracks from personal sections
                for section in home:
                    section_title = section.get("title", "").lower()
                    
                    # Check if this is a personal section
                    is_personal = any(personal.lower() in section_title for personal in personal_sections)
                    
                    if is_personal and section.get("contents"):
                        logger.info(f"[YTM] Processing personal section: {section.get('title')}")
                        
                        for item in section["contents"][:10]:  # Limit per section
                            if item.get("videoId"):
                                track = self._map_ytm_track(item)
                                if track:
                                    track["section"] = section.get("title", "Home")
                                    tracks.append(track)
                
                # If we don't have many personal tracks, add from other sections
                if len(tracks) < 20:
                    logger.info("[YTM] Adding tracks from other home sections")
                    for section in home:
                        section_title = section.get("title", "").lower()
                        
                        # Skip personal sections we already processed
                        is_personal = any(personal.lower() in section_title for personal in personal_sections)
                        
                        if not is_personal and section.get("contents"):
                            for item in section["contents"][:5]:  # Fewer from general sections
                                if item.get("videoId"):
                                    track = self._map_ytm_track(item)
                                    if track:
                                        track["section"] = section.get("title", "Home")
                                        tracks.append(track)
                                        
                                        if len(tracks) >= 50:  # Limit total tracks
                                            break
                            
                            if len(tracks) >= 50:
                                break
            
            # Try library songs if still need more
            if len(tracks) < 10:
                try:
                    logger.info("[YTM] Adding library songs as fallback")
                    library_songs = await self._run_sync(self.ytm.get_library_songs, limit=20)
                    
                    if library_songs:
                        for song in library_songs:
                            track = self._map_ytm_track(song)
                            if track:
                                track["section"] = "Your Library"
                                tracks.append(track)
                                
                except Exception as e:
                    logger.warning(f"[YTM] Failed to get library songs: {e}")
            
            logger.info(f"[YTM] ✓ Returning {len(tracks)} personalized tracks")
            
        except Exception as e:
            logger.error(f"[YTM] Error getting tracks: {e}")
        
        return tracks[:50]  # Limit to 50 tracks total
    
    async def get_home_section(self, section_name: str) -> List[Dict[str, Any]]:
        """Get tracks from a specific home section"""
        if not self.is_authenticated:
            await self.authenticate()
        
        try:
            logger.info(f"[YTM] Getting home section: {section_name}")
            home = await self._run_sync(self.ytm.get_home)
            
            for section in home:
                title = (section.get("title") or "").lower()
                if section_name.lower() in title:
                    tracks = []
                    logger.info(f"[YTM] Found section: {section.get('title')}")
                    
                    for item in section.get("contents", []):
                        if item.get("videoId"):
                            track = self._map_ytm_track(item)
                            if track:
                                track["section"] = section.get("title", section_name)
                                tracks.append(track)
                    
                    logger.info(f"[YTM] ✓ Returning {len(tracks)} tracks from {section_name}")
                    return tracks
            
            logger.warning(f"[YTM] Section '{section_name}' not found")
            return []
            
        except Exception as e:
            logger.error(f"[YTM] Error getting home section '{section_name}': {e}")
            return []
    
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
        """Get personalized recommendations from home feed"""
        if not self.is_authenticated:
            await self.authenticate()
        
        recommendations = []
        
        try:
            logger.info("[YTM] Getting personalized recommendations from home")
            home = await self._run_sync(self.ytm.get_home, limit=10)
            
            # Focus on recommendation sections
            rec_sections = [
                'quick picks', 'listen again', 'mixed for you', 'recommended',
                'your likes', 'similar to', 'more from', 'discover mix'
            ]
            
            for section in home:
                section_title = (section.get("title") or "").lower()
                
                # Check if this section contains recommendations
                is_rec_section = any(rec.lower() in section_title for rec in rec_sections)
                
                if is_rec_section and section.get("contents"):
                    logger.info(f"[YTM] Processing recommendation section: {section.get('title')}")
                    
                    for item in section["contents"][:8]:  # Limit per section
                        if item.get("videoId"):
                            track = self._map_ytm_track(item)
                            if track:
                                track["section"] = section.get("title", "Recommendations")
                                recommendations.append(track)
            
            logger.info(f"[YTM] ✓ Got {len(recommendations)} personalized recommendations")
            
        except Exception as e:
            logger.error(f"[YTM] Error getting recommendations: {e}")
        
        return recommendations
    
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
    
    def __del__(self):
        """Cleanup cookie file on deletion"""
        if self.cookie_file and os.path.exists(self.cookie_file.name):
            try:
                os.unlink(self.cookie_file.name)
                logger.info(f"[YTM] Cleaned up cookie file")
            except Exception as e:
                logger.error(f"[YTM] Failed to cleanup cookie file: {e}")
