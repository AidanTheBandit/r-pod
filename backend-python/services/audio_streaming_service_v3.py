"""
Audio Streaming Service v3.0
Handles YouTube audio streaming using InnerTube API (like real YouTube Music clients)

CURRENT STATUS (October 2025):
- Uses YouTube's InnerTube API directly (same as official YTM
- Multiple client types (WEB_REMIX, ANDROID_MUSIC, IOS_MUSIC) as fallbacks
- No authentication or PO tokens needed for basic playback
- Fast and reliable - same method used by InnerTune, SimpMusic, etc.

FEATURES:
- Layer 1: InnerTube API with WEB_REMIX client (fastest, ~100-200ms)
- Layer 2: InnerTube API with ANDROID_MUSIC client (fallback)
- Layer 3: InnerTube API with IOS_MUSIC client (fallback)
- Layer 4: Cobalt API (external service fallback)
- Layer 5: Piped instances (last resort)
- Direct HTTP requests - no complex dependencies
- Pure async implementation

BASED ON:
- InnerTune: https://github.com/z-huang/InnerTune
- SimpMusic: https://github.com/maxrave-dev/SimpMusic
- YouTube.js: https://github.com/LuanRT/YouTube.js
- ytmusicapi: https://github.com/sigma67/ytmusicapi
"""
import logging
from typing import Dict, Any, Optional, List
import httpx
import asyncio
import json
import os
import random
import yt_dlp
import tempfile
import concurrent.futures

logger = logging.getLogger(__name__)


class AudioStreamingService:
    """Service for streaming YouTube audio using InnerTube API"""
    
    # InnerTube client configurations (based on successful open-source clients)
    INNERTUBE_CLIENTS = {
        "WEB_REMIX": {
            "clientName": "WEB_REMIX",
            "clientVersion": "1.20250922.03.00",
            "clientNameNumber": 67,
            "api_key": os.getenv("YOUTUBE_INNERTUBE_API_KEY_WEB", "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30"),
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        "ANDROID": {
            "clientName": "ANDROID",
            "clientVersion": "20.10.38",
            "clientNameNumber": 3,
            "androidSdkVersion": 30,
            "api_key": os.getenv("YOUTUBE_INNERTUBE_API_KEY_ANDROID", "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"),
            "user_agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip"
        },
        "IOS": {
            "clientName": "IOS",
            "clientVersion": "20.10.4",
            "clientNameNumber": 5,
            "deviceModel": "iPhone16,2",
            "api_key": os.getenv("YOUTUBE_INNERTUBE_API_KEY_IOS", "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc"),
            "user_agent": "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)"
        }
    }
    
    def __init__(self, cookie: Optional[str] = None, youtube_music_aggregator: Optional[Any] = None):
        """
        Initialize the audio streaming service
        
        Args:
            cookie: YouTube Music cookie string (optional, for authenticated requests)
            youtube_music_aggregator: YouTube Music aggregator instance (legacy support)
        """
        self.cache = {}
        self.cookie = cookie
        self.youtube_music_aggregator = youtube_music_aggregator
        
        # Load proxy configuration from environment
        self.proxies = self._load_proxy_config()
        logger.info(f"[AudioStream] Loaded {len(self.proxies)} proxies for rotation")
        
        # Create cookie file for yt-dlp if cookie provided
        self.cookie_file = None
        if self.cookie:
            self._create_cookie_file()
    
    def _load_proxy_config(self) -> List[Dict[str, str]]:
        """
        Load proxy configuration from environment variables
        
        Supports multiple proxy formats:
        - HTTP_PROXY=http://proxy1:port,http://proxy2:port
        - HTTPS_PROXY=https://proxy1:port,https://proxy2:port
        - SOCKS5_PROXY=socks5://proxy1:port,socks5://proxy2:port
        """
        proxies = []
        
        # Load HTTP proxies
        http_proxies = os.getenv('HTTP_PROXY', '').split(',') if os.getenv('HTTP_PROXY') else []
        for proxy in http_proxies:
            if proxy.strip():
                proxies.append({'http': proxy.strip(), 'https': proxy.strip()})
        
        # Load HTTPS proxies
        https_proxies = os.getenv('HTTPS_PROXY', '').split(',') if os.getenv('HTTPS_PROXY') else []
        for proxy in https_proxies:
            if proxy.strip():
                proxies.append({'https': proxy.strip()})
        
        # Load SOCKS5 proxies
        socks5_proxies = os.getenv('SOCKS5_PROXY', '').split(',') if os.getenv('SOCKS5_PROXY') else []
        for proxy in socks5_proxies:
            if proxy.strip():
                proxies.append({'http': proxy.strip(), 'https': proxy.strip()})
        
        # If no proxies configured, return empty list (no proxy rotation)
        return proxies
    
    def _get_random_proxy(self) -> Optional[Dict[str, str]]:
        """Get a random proxy from the configured pool"""
        if not self.proxies:
            return None
        return random.choice(self.proxies)
    
    def _create_cookie_file(self):
        """Create a temp cookie file in Netscape format for yt-dlp"""
        try:
            self.cookie_file = tempfile.NamedTemporaryFile(
                mode='w', suffix='.txt', delete=False
            )
            self.cookie_file.write("# Netscape HTTP Cookie File\n")
            self.cookie_file.write("# This file is generated by yt-dlp.  Do not edit.\n\n")
            cookie_pairs = self.cookie.split('; ')
            for pair in cookie_pairs:
                if '=' in pair:
                    name, value = pair.split('=', 1)
                    is_secure = name.startswith('__Secure-') or name.startswith('__Host-')
                    secure_flag = 'TRUE' if is_secure else 'FALSE'
                    expiration = '2000000000'
                    self.cookie_file.write(
                        f".youtube.com\tTRUE\t/\t{secure_flag}\t{expiration}\t{name}\t{value}\n"
                    )
                    self.cookie_file.write(
                        f".music.youtube.com\tTRUE\t/\t{secure_flag}\t{expiration}\t{name}\t{value}\n"
                    )
            self.cookie_file.close()
            logger.info(f"[AudioStream] Created cookie file with {len(cookie_pairs)} cookies")
        except Exception as e:
            logger.error(f"[AudioStream] Failed to create cookie file: {e}")
            self.cookie_file = None
    
    async def get_stream_url(self, video_id: str) -> Optional[Dict[str, Any]]:
        """
        Get direct stream URL using multi-layer strategy
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Dict with stream info or None if all strategies fail
        """
        strategies = [
            self._try_yt_dlp_authenticated,  # Primary: yt-dlp with cookies
            self._try_innertube_web_remix,
            self._try_innertube_android,
            self._try_innertube_ios,
            self._try_cobalt_api,
            self._try_piped_fallback
        ]
        
        for i, strategy in enumerate(strategies, 1):
            try:
                logger.info(f"[AudioStream] Strategy {i}: Trying {strategy.__name__} for {video_id}")
                result = await strategy(video_id)
                if result and result.get("url"):
                    logger.info(f"[AudioStream] ✓ Success with {strategy.__name__}")
                    return result
            except Exception as e:
                logger.warning(f"[AudioStream] Strategy {i} ({strategy.__name__}) failed: {e}")
                continue
        
        logger.error(f"[AudioStream] All strategies failed for {video_id}")
        return None
    
    async def _try_yt_dlp_authenticated(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Try yt-dlp with authentication (cookies)"""
        if not self.cookie_file:
            logger.debug("[AudioStream] No cookie file available for yt-dlp")
            return None

        try:
            ydl_opts = {
                'format': 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio',
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
                'ignoreerrors': False,
                'cookiefile': self.cookie_file.name,
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Origin': 'https://www.youtube.com',
                    'Referer': 'https://www.youtube.com/',
                },
                'extractor_args': {'youtube': {
                    'player_client': ['web', 'android', 'ios'],
                    'player_skip': ['js', 'webpage'],
                }}
            }

            def extract_url():
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=False)
                    if info and info.get('url'):
                        return {
                            'url': info['url'],
                            'format_id': info.get('format_id'),
                            'ext': info.get('ext'),
                            'bitrate': info.get('abr') or info.get('tbr'),
                            'duration': info.get('duration'),
                            'title': info.get('title')
                        }
                return None

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(extract_url)
                result = future.result(timeout=30)

            if result:
                logger.info(f"[AudioStream] ✓ yt-dlp authenticated extraction successful")
                return {
                    **result,
                    'strategy': 'yt_dlp_authenticated'
                }

        except Exception as e:
            logger.warning(f"[AudioStream] yt-dlp authenticated extraction failed: {e}")
            return None
    
    async def _try_innertube_web_remix(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Try InnerTube API with WEB_REMIX client (YouTube Music web player)"""
        return await self._try_innertube_client(video_id, "WEB_REMIX")
    
    async def _try_innertube_android(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Try InnerTube API with ANDROID client"""
        return await self._try_innertube_client(video_id, "ANDROID")
    
    async def _try_innertube_ios(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Try InnerTube API with IOS client"""
        return await self._try_innertube_client(video_id, "IOS")
    
    async def _try_innertube_client(self, video_id: str, client_name: str) -> Optional[Dict[str, Any]]:
        """
        Try getting stream URL with specific InnerTube client
        
        This mimics how real YouTube Music clients (InnerTune, SimpMusic) work:
        - Use InnerTube player API
        - Impersonate official client
        - Extract streaming URLs from response
        """
        try:
            client_config = self.INNERTUBE_CLIENTS[client_name]
            
            # InnerTube player endpoint
            url = f"https://www.youtube.com/youtubei/v1/player?key={client_config['api_key']}"
            
            # Build request payload
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
            
            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "User-Agent": client_config["user_agent"],
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.9",
                "Origin": "https://music.youtube.com" if "MUSIC" in client_name else "https://www.youtube.com",
                "Referer": "https://music.youtube.com/" if "MUSIC" in client_name else "https://www.youtube.com/",
                "X-YouTube-Client-Name": str(client_config["clientNameNumber"]),
                "X-YouTube-Client-Version": client_config["clientVersion"],
                "X-Goog-Visitor-Id": "CgtQU3JVTUNmejVKYyjOsIvHBjIKCgJVUxIEGgAgJA%3D%3D"  # Default visitor ID
            }
            
            # Try with proxy rotation (up to 3 attempts)
            for attempt in range(3):
                proxy = self._get_random_proxy()
                if proxy:
                    logger.debug(f"[InnerTube] {client_name} attempt {attempt+1} using proxy")
                else:
                    logger.debug(f"[InnerTube] {client_name} attempt {attempt+1} without proxy")
                
                try:
                    async with httpx.AsyncClient(timeout=10.0, proxies=proxy) as client:
                        response = await client.post(url, json=payload, headers=headers)
                        
                        if response.status_code != 200:
                            logger.warning(f"[InnerTube] {client_name} returned status {response.status_code}")
                            continue
                        
                        data = response.json()
                        
                        # Extract streaming URL
                        return self._extract_stream_url_from_innertube(data, client_name)
                        
                except Exception as e:
                    logger.debug(f"[InnerTube] {client_name} attempt {attempt+1} failed: {e}")
                    continue
            
            logger.warning(f"[InnerTube] All proxy attempts failed for {client_name}")
            return None
        
        except Exception as e:
            logger.error(f"[InnerTube] Error with {client_name}: {e}")
            return None
    
    def _extract_stream_url_from_innertube(self, player_response: Dict, client_name: str) -> Optional[Dict[str, Any]]:
        """
        Extract best audio stream URL from InnerTube player response
        
        Based on how InnerTune and SimpMusic extract streams:
        1. Get streamingData from response
        2. Prefer adaptiveFormats (audio-only, better quality)
        3. Filter for audio MIME types
        4. Select highest bitrate
        """
        try:
            streaming_data = player_response.get("streamingData")
            if not streaming_data:
                logger.warning(f"[InnerTube] No streamingData in {client_name} response")
                return None
            
            # Try adaptive formats first (audio-only)
            formats = streaming_data.get("adaptiveFormats", [])
            if not formats:
                # Fallback to regular formats
                formats = streaming_data.get("formats", [])
            
            if not formats:
                logger.warning(f"[InnerTube] No formats found in {client_name} response")
                return None
            
            # Filter for audio-only formats
            audio_formats = [
                f for f in formats 
                if f.get("mimeType", "").startswith("audio/")
            ]
            
            if not audio_formats:
                # If no audio-only, try formats with audio track
                audio_formats = [
                    f for f in formats 
                    if "audio" in f.get("mimeType", "").lower()
                ]
            
            if not audio_formats:
                logger.warning(f"[InnerTube] No audio formats found in {client_name} response")
                return None
            
            # Get highest bitrate audio format
            best_format = max(audio_formats, key=lambda x: x.get("bitrate", 0))
            
            stream_url = best_format.get("url")
            if not stream_url:
                logger.warning(f"[InnerTube] No URL in best format from {client_name}")
                return None
            
            # Extract video details
            video_details = player_response.get("videoDetails", {})
            
            logger.info(
                f"[InnerTube] ✓ Extracted from {client_name}: "
                f"format={best_format.get('itag')}, "
                f"bitrate={best_format.get('bitrate')}, "
                f"codec={best_format.get('mimeType', '').split(';')[0]}"
            )
            
            return {
                'url': stream_url,
                'format_id': str(best_format.get('itag')),
                'ext': best_format.get('mimeType', 'audio/mp4').split('/')[-1].split(';')[0],
                'bitrate': best_format.get('bitrate'),
                'duration': video_details.get('lengthSeconds'),
                'title': video_details.get('title'),
                'strategy': f'innertube_{client_name.lower()}'
            }
            
        except Exception as e:
            logger.error(f"[InnerTube] Error extracting URL from {client_name}: {e}")
            return None
    
    async def _try_cobalt_api(self, video_id: str) -> Optional[Dict[str, Any]]:
        """
        Try Cobalt API as fallback
        
        Cobalt API handles YouTube's protections and provides direct stream URLs
        """
        cobalt_instances = [
            "https://api.cobalt.tools/api/json",
            "https://co.wuk.sh/api/json",
        ]
        
        payload = {
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "aFormat": "best",
            "isAudioOnly": True,
            "filenameStyle": "basic"
        }
        
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        for instance in cobalt_instances:
            # Try with proxy rotation for each instance
            for attempt in range(2):  # 2 attempts per instance
                proxy = self._get_random_proxy()
                try:
                    async with httpx.AsyncClient(timeout=10.0, proxies=proxy) as client:
                        response = await client.post(instance, json=payload, headers=headers)
                        
                        if response.status_code == 200:
                            data = response.json()
                            
                            # Handle different response types
                            if data.get("status") in ["stream", "redirect", "tunnel"]:
                                url = data.get("url")
                                if url:
                                    logger.info(f"[Cobalt] ✓ Success with {instance}")
                                    return {
                                        'url': url,
                                        'format_id': 'cobalt',
                                        'ext': 'm4a',
                                        'bitrate': None,
                                        'duration': None,
                                        'title': None,
                                        'strategy': 'cobalt_api'
                                    }
                
                except asyncio.TimeoutError:
                    logger.warning(f"[Cobalt] Timeout for instance {instance} (attempt {attempt+1})")
                    continue
                except Exception as e:
                    logger.warning(f"[Cobalt] Error with instance {instance} (attempt {attempt+1}): {e}")
                    continue
        
        return None
    
    async def _try_piped_fallback(self, video_id: str) -> Optional[Dict[str, Any]]:
        """
        Piped fallback: try known public instances if all else fails
        Note: As of October 2025, most public Piped instances are unreliable
        """
        piped_instances = [
            "https://pipedapi.kavin.rocks",
            "https://pipedapi.adminforge.de"
        ]
        
        logger.info(f"[AudioStream] Trying Piped fallback for {video_id}")
        
        for piped_url in piped_instances:
            try:
                api_url = f"{piped_url}/streams/{video_id}"
                
                async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                    response = await client.get(api_url)
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        if not data.get('title') or not data.get('duration'):
                            continue
                        
                        audio_streams = data.get('audioStreams', [])
                        if not audio_streams:
                            continue
                        
                        best_audio = max(audio_streams, key=lambda x: x.get('bitrate', 0) or 0)
                        
                        if best_audio and best_audio.get('url'):
                            logger.info(
                                f"[Piped] ✓ Success: {best_audio.get('bitrate')}bps from {piped_url}"
                            )
                            return {
                                'url': best_audio['url'],
                                'format_id': best_audio.get('format', 'piped'),
                                'ext': best_audio.get('codec', 'unknown'),
                                'bitrate': best_audio.get('bitrate'),
                                'duration': data.get('duration'),
                                'title': data.get('title'),
                                'strategy': f'piped_fallback ({piped_url})'
                            }
                
            except httpx.TimeoutException:
                logger.debug(f"[Piped] Timeout connecting to {piped_url}")
            except httpx.ConnectError:
                logger.debug(f"[Piped] Connection failed to {piped_url}")
            except Exception as e:
                logger.debug(f"[Piped] Instance {piped_url} error: {e}")
                continue
        
        logger.warning("[Piped] All Piped instances failed")
        return None


# Legacy support - keep the old class name for backward compatibility
class AudioStreamingServiceV2(AudioStreamingService):
    """Legacy class name for backward compatibility"""
    pass
