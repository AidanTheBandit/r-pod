"""
YouTube Music Service Aggregator
Uses ytmusicapi for superior YouTube Music support with proper authentication
FIXED: Resolves 403 Forbidden errors with fresh SAPISID hashes and yt-dlp integration
"""
from typing import List, Dict, Any, Optional
import logging
from ytmusicapi import YTMusic
import os
import tempfile
import hashlib
import time
import asyncio
import random
import json
import re

try:
    import yt_dlp
    YT_DLP_AVAILABLE = True
except ImportError:
    YT_DLP_AVAILABLE = False
    logging.warning("[YTM] yt-dlp not available - falling back to ytmusicapi only")

from .base_music_service import BaseMusicService

logger = logging.getLogger(__name__)

class YouTubeMusicAggregator(BaseMusicService):
    """YouTube Music service using ytmusicapi with proper cookie authentication"""
    
    def __init__(self, credentials: Dict[str, Any]):
        """
        Initialize YouTube Music service
        
        Args:
            credentials: Dictionary with 'cookie' and optional 'profile', 'brand_account_id'
        """
        super().__init__(credentials)
        self.ytm: Optional[YTMusic] = None
        self.cookie = credentials.get("cookie")
        self.profile = credentials.get("profile", "1")
        self.brand_account_id = credentials.get("brand_account_id")
        self.cookie_file = None
        self.speed_dial_pins: set = set()
        self._stream_url_cache = {}  # Cache stream URLs temporarily
        self._cache_ttl = 300  # Cache URLs for 5 minutes
        
    def _generate_fresh_sapisid_hash(self) -> dict:
        """Generate fresh SAPISID hash with current timestamp - CRITICAL FIX for 403 errors"""
        cookies = {}
        for cookie_pair in self.cookie.split('; '):
            if '=' in cookie_pair:
                name, value = cookie_pair.split('=', 1)
                cookies[name] = value
        
        sapisid = cookies.get('__Secure-3PAPISID') or cookies.get('SAPISID')
        if not sapisid:
            return {}
        
        timestamp = str(int(time.time()))  # FRESH timestamp - regenerated each call
        origin = 'https://music.youtube.com'
        hash_input = f"{timestamp} {sapisid} {origin}"
        sapisid_hash = hashlib.sha1(hash_input.encode()).hexdigest()
        
        return {
            'Authorization': f'SAPISIDHASH {timestamp}_{sapisid_hash}',
            'X-Goog-AuthUser': self.profile
        }
    
    def _create_cookie_file(self):
        """Create a temporary cookie file for ytmusicapi"""
        try:
            self.cookie_file = tempfile.NamedTemporaryFile(
                mode='w', 
                suffix='.txt',
                delete=False
            )
            
            self.cookie_file.write(self.cookie)
            self.cookie_file.close()
            
            logger.info(f"[YTM] Created cookie file: {self.cookie_file.name}")
            return self.cookie_file.name
            
        except Exception as e:
            logger.error(f"[YTM] Failed to create cookie file: {e}")
            return None
        
    def _create_proper_cookie_file(self):
        """Create a proper JSON headers file with FRESH SAPISID - CRITICAL FIX"""
        try:
            self.cookie_file = tempfile.NamedTemporaryFile(
                mode='w', 
                suffix='.json',
                delete=False
            )
            
            cookies = {}
            for cookie_pair in self.cookie.split('; '):
                if '=' in cookie_pair:
                    name, value = cookie_pair.split('=', 1)
                    cookies[name] = value
            
            # Updated headers with web client (not IOS) - CRITICAL FIX
            headers = {
                "Cookie": self.cookie,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Origin": "https://music.youtube.com",
                "Referer": "https://music.youtube.com/",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "same-origin",
                "Sec-Fetch-Site": "same-origin",
                "sec-ch-ua": '"Chromium";v="131", "Not=A?Brand";v="24", "Google Chrome";v="131"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "X-Goog-AuthUser": self.profile,
                "X-Goog-Visitor-Id": "CgtQU3JVTUNmejVKYyjOsIvHBjIKCgJVUxIEGgAgJA%3D%3D",
                "X-Origin": "https://music.youtube.com",
                "X-YouTube-Bootstrap-Logged-In": "true",
                "X-YouTube-Client-Name": "67",
                "X-YouTube-Client-Version": "1.20250929.03.00",
            }
            
            # FRESH SAPISID hash with current timestamp - CRITICAL FIX
            if 'SAPISID' in cookies or '__Secure-3PAPISID' in cookies:
                sapisid = cookies.get('__Secure-3PAPISID') or cookies.get('SAPISID')
                if sapisid:
                    timestamp = str(int(time.time()))
                    origin = 'https://music.youtube.com'
                    
                    hash_input = f"{timestamp} {sapisid} {origin}"
                    sapisid_hash = hashlib.sha1(hash_input.encode()).hexdigest()
                    
                    headers['Authorization'] = f'SAPISIDHASH {timestamp}_{sapisid_hash}'
            
            json.dump(headers, self.cookie_file, indent=2)
            self.cookie_file.close()
            
            logger.info(f"[YTM] Created proper JSON headers file with fresh SAPISID")
            return self.cookie_file.name
            
        except Exception as e:
            logger.error(f"[YTM] Failed to create proper JSON headers file: {e}")
            return None
    
    async def _retry_with_backoff(self, func, max_retries=3):
        """Retry with exponential backoff - CRITICAL FIX for rate limiting"""
        for attempt in range(max_retries):
            try:
                return await func()
            except Exception as e:
                if '403' in str(e) and attempt < max_retries - 1:
                    # Exponential backoff: 2^attempt + random jitter
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"[Stream] 403 Forbidden - retrying in {wait_time:.1f}s ({attempt + 1}/{max_retries})")
                    await asyncio.sleep(wait_time)
                else:
                    raise
    
    async def get_stream_url_ytdlp(self, video_id: str) -> Optional[str]:
        """Get fresh authenticated stream URL using yt-dlp - CRITICAL FIX"""
        if not YT_DLP_AVAILABLE:
            logger.warning("[YTM] yt-dlp not available - install with: pip install yt-dlp")
            return None
            
        try:
            # Check cache first (1-minute granularity)
            cache_key = f"{video_id}_{int(time.time() // 60)}"
            if cache_key in self._stream_url_cache:
                cached_url, cached_time = self._stream_url_cache[cache_key]
                if time.time() - cached_time < self._cache_ttl:
                    logger.info(f"[YTM] Using cached stream URL for {video_id}")
                    return cached_url
            
            ydl_opts = {
                'format': 'bestaudio/best',
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
                'cookiefile': self.cookie_file.name if self.cookie_file else None,
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                }
            }
            
            loop = asyncio.get_event_loop()
            
            def extract_url():
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(
                        f'https://www.youtube.com/watch?v={video_id}',
                        download=False
                    )
                    return info.get('url')
            
            url = await loop.run_in_executor(None, extract_url)
            
            # Cache the URL
            if url:
                self._stream_url_cache[cache_key] = (url, time.time())
                # Clean old cache entries
                current_time = time.time()
                self._stream_url_cache = {
                    k: v for k, v in self._stream_url_cache.items()
                    if current_time - v[1] < self._cache_ttl
                }
                logger.info(f"[YTM] ✓ Got fresh stream URL for {video_id} via yt-dlp")
            
            return url
            
        except Exception as e:
            logger.error(f"[YTM] Error getting stream URL with yt-dlp: {e}")
            return None
    
    async def _prepare_stream_request(self, video_id: str) -> Optional[str]:
        """Prepare fresh authentication for streaming - CRITICAL FIX"""
        try:
            # Regenerate SAPISID hash with current timestamp
            auth_headers = self._generate_fresh_sapisid_hash()
            
            # Update session headers if available
            if hasattr(self.ytm, '_session') and self.ytm._session:
                self.ytm._session.headers.update(auth_headers)
            
            # Try yt-dlp first for most reliable stream URLs
            if YT_DLP_AVAILABLE:
                async def get_url():
                    return await self.get_stream_url_ytdlp(video_id)
                
                url = await self._retry_with_backoff(get_url)
                if url:
                    return url
            
            # Fallback to ytmusicapi
            logger.info(f"[YTM] Falling back to ytmusicapi for {video_id}")
            return f"/api/stream/youtube/{video_id}"
            
        except Exception as e:
            logger.error(f"[YTM] Error preparing stream request: {e}")
            return None
