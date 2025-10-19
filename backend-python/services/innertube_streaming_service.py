"""
InnerTube Streaming Service
Uses YouTube's internal InnerTube API for streaming (like real YouTube Music clients)

Features:
- Multiple client types (WEB_REMIX, ANDROID_MUSIC, IOS_MUSIC)
- Environment variable configuration (no hardcoded keys)
- Cookie authentication support
- Proxy rotation support
"""
import aiohttp
import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import os

logger = logging.getLogger(__name__)


class InnerTubeStreamingService:
    """
    YouTube streaming using InnerTube API (like real YouTube Music clients)
    
    All sensitive data comes from environment variables:
    - API keys: Can be overridden via YOUTUBE_INNERTUBE_API_KEY_* env vars
    - Cookie: From YOUTUBE_MUSIC_COOKIE env var
    - Proxies: From PROXY_LIST env var or proxies.txt file
    """
    
    # Default API keys (public keys from YouTube clients)
    # Can be overridden via environment variables
    DEFAULT_API_KEYS = {
        "WEB_REMIX": "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30",
        "ANDROID_MUSIC": "AIzaSyAOghZGza2MQSZkY_zfZ370N-PUdXEo8AI",
        "IOS_MUSIC": "AIzaSyBAETezhkwP0ZWA02RsqT1zu78Fpt0bC_s",
        "TVHTML5": "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
    }
    
    def __init__(self, cookie: Optional[str] = None):
        """
        Initialize InnerTube streaming service
        
        Args:
            cookie: Optional YouTube authentication cookie (or uses env var)
        """
        # Get cookie from parameter or environment
        self.cookie = cookie or os.getenv("YOUTUBE_MUSIC_COOKIE")
        
        # Load proxies if available
        self.proxies = []
        self.current_proxy_index = 0
        self.last_proxy_rotation = datetime.now()
        self._load_proxies()
        
        # Client configurations with environment variable overrides
        self.clients = {
            "WEB_REMIX": {
                "clientName": "WEB_REMIX",
                "clientVersion": "1.20241015.01.00",
                "api_key": os.getenv("YOUTUBE_INNERTUBE_API_KEY_WEB") or self.DEFAULT_API_KEYS["WEB_REMIX"],
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            "ANDROID_MUSIC": {
                "clientName": "ANDROID_MUSIC",
                "clientVersion": "6.42.52",
                "androidSdkVersion": 30,
                "api_key": os.getenv("YOUTUBE_INNERTUBE_API_KEY_ANDROID") or self.DEFAULT_API_KEYS["ANDROID_MUSIC"],
                "user_agent": "com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 11) gzip"
            },
            "IOS_MUSIC": {
                "clientName": "IOS_MUSIC",
                "clientVersion": "6.42",
                "deviceModel": "iPhone14,5",
                "api_key": os.getenv("YOUTUBE_INNERTUBE_API_KEY_IOS") or self.DEFAULT_API_KEYS["IOS_MUSIC"],
                "user_agent": "com.google.ios.youtubemusic/6.42 (iPhone; U; CPU iOS 17_0 like Mac OS X)"
            }
        }
    
    def _load_proxies(self):
        """Load proxies from environment variable or proxies.txt file"""
        proxy_env = os.getenv("PROXY_LIST")
        proxy_file = "proxies.txt"
        
        proxies_text = None
        
        # Try environment variable first
        if proxy_env:
            proxies_text = proxy_env
            logger.info("[InnerTube] Loading proxies from PROXY_LIST env var")
        # Try file second
        elif os.path.isfile(proxy_file):
            try:
                with open(proxy_file, 'r') as f:
                    proxies_text = f.read()
                logger.info(f"[InnerTube] Loading proxies from {proxy_file}")
            except Exception as e:
                logger.error(f"[InnerTube] Failed to read proxy file: {e}")
        
        if proxies_text:
            # Parse comma-separated or newline-separated proxies
            self.proxies = [
                p.strip() 
                for p in proxies_text.replace(',', '\n').split('\n')
                if p.strip() and not p.strip().startswith('#')
            ]
            logger.info(f"[InnerTube] Loaded {len(self.proxies)} proxies")
        else:
            logger.info("[InnerTube] No proxies configured")
    
    def _get_next_proxy(self) -> Optional[str]:
        """Get next proxy with time-based rotation"""
        if not self.proxies:
            return None
        
        # Rotate every 5 minutes
        now = datetime.now()
        rotation_interval = int(os.getenv("PROXY_ROTATION_INTERVAL", "300"))
        
        if (now - self.last_proxy_rotation).total_seconds() > rotation_interval:
            self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxies)
            self.last_proxy_rotation = now
            logger.debug(f"[InnerTube] Rotated to proxy {self.current_proxy_index + 1}/{len(self.proxies)}")
        
        return self.proxies[self.current_proxy_index]
    
    async def get_stream_url(self, video_id: str) -> Optional[str]:
        """
        Get stream URL using InnerTube API with multiple client fallbacks
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Direct stream URL or None if all clients fail
        """
        # Try each client type
        for client_name, client_config in self.clients.items():
            try:
                logger.info(f"[InnerTube] Trying {client_name} client for {video_id}")
                
                url = await self._get_stream_with_client(
                    video_id, 
                    client_name, 
                    client_config
                )
                
                if url:
                    logger.info(f"[InnerTube] ✓ Success with {client_name}")
                    return url
                    
            except Exception as e:
                logger.warning(f"[InnerTube] {client_name} failed: {e}")
                continue
        
        logger.error(f"[InnerTube] All clients failed for {video_id}")
        return None
    
    async def _get_stream_with_client(
        self, 
        video_id: str, 
        client_name: str, 
        client_config: Dict[str, Any]
    ) -> Optional[str]:
        """
        Get stream URL using specific client configuration
        
        Args:
            video_id: YouTube video ID
            client_name: Client type name
            client_config: Client configuration dict
            
        Returns:
            Stream URL or None
        """
        # Build InnerTube player request
        api_url = f"https://www.youtube.com/youtubei/v1/player?key={client_config['api_key']}"
        
        payload = {
            "videoId": video_id,
            "context": {
                "client": {
                    "clientName": client_config["clientName"],
                    "clientVersion": client_config["clientVersion"],
                    "hl": "en",
                    "gl": "US"
                }
            },
            "playbackContext": {
                "contentPlaybackContext": {
                    "html5Preference": "HTML5_PREF_WANTS"
                }
            }
        }
        
        # Add client-specific fields
        if "androidSdkVersion" in client_config:
            payload["context"]["client"]["androidSdkVersion"] = client_config["androidSdkVersion"]
        if "deviceModel" in client_config:
            payload["context"]["client"]["deviceModel"] = client_config["deviceModel"]
        
        headers = {
            "Content-Type": "application/json",
            "User-Agent": client_config["user_agent"],
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Origin": "https://music.youtube.com",
            "Referer": "https://music.youtube.com/"
        }
        
        # Add authentication cookie if available
        if self.cookie:
            headers["Cookie"] = self.cookie
        
        # Get proxy if available
        proxy = self._get_next_proxy()
        
        try:
            timeout = aiohttp.ClientTimeout(total=15)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                request_kwargs = {
                    "json": payload,
                    "headers": headers
                }
                
                if proxy:
                    request_kwargs["proxy"] = proxy
                    logger.debug(f"[InnerTube] Using proxy: {proxy[:50]}...")
                
                async with session.post(api_url, **request_kwargs) as resp:
                    if resp.status != 200:
                        logger.warning(f"[InnerTube] HTTP {resp.status}")
                        return None
                    
                    data = await resp.json()
                    
                    # Check playability status
                    if "playabilityStatus" in data:
                        status = data["playabilityStatus"].get("status")
                        if status != "OK":
                            reason = data["playabilityStatus"].get("reason", "Unknown")
                            logger.warning(f"[InnerTube] Playability: {status} - {reason}")
                            return None
                    
                    # Extract stream URL
                    return self._extract_stream_url(data)
                    
        except asyncio.TimeoutError:
            logger.warning(f"[InnerTube] Request timeout")
            return None
        except Exception as e:
            logger.error(f"[InnerTube] Request error: {e}")
            return None
    
    def _extract_stream_url(self, player_response: Dict[str, Any]) -> Optional[str]:
        """
        Extract best audio stream URL from InnerTube player response
        
        Args:
            player_response: JSON response from InnerTube API
            
        Returns:
            Stream URL or None
        """
        try:
            streaming_data = player_response.get("streamingData", {})
            
            if not streaming_data:
                return None
            
            # Try adaptive formats first (separate audio/video)
            formats = streaming_data.get("adaptiveFormats", [])
            
            if not formats:
                # Fallback to regular formats (combined audio/video)
                formats = streaming_data.get("formats", [])
            
            if not formats:
                return None
            
            # Filter for audio-only formats
            audio_formats = [
                f for f in formats 
                if f.get("mimeType", "").startswith("audio/")
            ]
            
            if not audio_formats:
                # If no audio-only, get formats with audio
                audio_formats = [
                    f for f in formats 
                    if "audio" in f.get("mimeType", "").lower()
                ]
            
            if not audio_formats:
                logger.warning("[InnerTube] No audio formats found")
                return None
            
            # Get highest bitrate audio format
            best_format = max(audio_formats, key=lambda x: x.get("bitrate", 0))
            
            url = best_format.get("url")
            
            if url:
                logger.info(
                    f"[InnerTube] Selected format: "
                    f"{best_format.get('mimeType')} "
                    f"@ {best_format.get('bitrate', 0)} bps"
                )
            
            return url
            
        except Exception as e:
            logger.error(f"[InnerTube] Error extracting stream URL: {e}")
            return None
