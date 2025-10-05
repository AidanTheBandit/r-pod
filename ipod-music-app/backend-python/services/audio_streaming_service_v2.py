"""
Audio Streaming Service v2.0
Handles YouTube audio streaming using yt-dlp with cookie authentication
"""
import logging
from typing import Dict, Any, Optional
import yt_dlp
import os
import tempfile

logger = logging.getLogger(__name__)


class AudioStreamingService:
    """Service for streaming YouTube audio with cookie authentication"""
    
    def __init__(self, cookie: Optional[str] = None):
        """
        Initialize the audio streaming service
        
        Args:
            cookie: YouTube Music cookie string for authentication
        """
        self.cache = {}
        self.cookie = cookie
        self.cookie_file = None
        
        if self.cookie:
            self._create_cookie_file()
    
    def _create_cookie_file(self):
        """Create a temporary cookie file for yt-dlp in Netscape format"""
        try:
            self.cookie_file = tempfile.NamedTemporaryFile(
                mode='w', 
                suffix='.txt',
                delete=False
            )
            
            self.cookie_file.write("# Netscape HTTP Cookie File\n")
            
            cookie_pairs = self.cookie.split('; ')
            for pair in cookie_pairs:
                if '=' in pair:
                    name, value = pair.split('=', 1)
                    self.cookie_file.write(
                        f".youtube.com\tTRUE\t/\tTRUE\t0\t{name}\t{value}\n"
                    )
            
            self.cookie_file.close()
            logger.info(f"[AudioStream] Created cookie file: {self.cookie_file.name}")
            
        except Exception as e:
            logger.error(f"[AudioStream] Failed to create cookie file: {e}")
            self.cookie_file = None
        
    async def get_stream_url(self, video_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the direct stream URL for a YouTube video
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Dictionary with stream info or None
        """
        try:
            logger.info(f"[AudioStream] Getting stream URL for: {video_id}")
            
            ydl_opts = {
                'format': 'bestaudio/best',
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
                'nocheckcertificate': True,
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-us,en;q=0.5',
                    'Sec-Fetch-Mode': 'navigate',
                },
            }
            
            if self.cookie_file and os.path.exists(self.cookie_file.name):
                ydl_opts['cookiefile'] = self.cookie_file.name
                logger.info(f"[AudioStream] Using cookie file for authentication")
            
            url = f"https://music.youtube.com/watch?v={video_id}" if self.cookie else f"https://www.youtube.com/watch?v={video_id}"
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if not info:
                    logger.error(f"[AudioStream] No info returned for {video_id}")
                    return None
                
                formats = info.get('formats', [])
                
                if not formats:
                    logger.error(f"[AudioStream] No formats available for {video_id}")
                    return None
                
                audio_formats = [
                    f for f in formats 
                    if f.get('acodec') != 'none' and f.get('vcodec') == 'none'
                ]
                
                if not audio_formats:
                    logger.warning(f"[AudioStream] No audio-only formats, using all formats")
                    audio_formats = formats
                
                audio_formats.sort(
                    key=lambda x: (x.get("abr") or x.get("tbr") or 0),
                    reverse=True
                )
                
                best_format = audio_formats[0]
                stream_url = best_format.get('url')
                
                if not stream_url:
                    logger.error(f"[AudioStream] No stream URL in format")
                    return None
                
                logger.info(f"[AudioStream] ✓ Got stream URL (format: {best_format.get('format_id')}, bitrate: {best_format.get('abr')})")
                
                return {
                    'url': stream_url,
                    'format_id': best_format.get('format_id'),
                    'ext': best_format.get('ext'),
                    'bitrate': best_format.get('abr') or best_format.get('tbr'),
                    'duration': info.get('duration'),
                    'title': info.get('title')
                }
                
        except Exception as e:
            logger.error(f"[AudioStream] Error: {e}")
            return None
    
    def __del__(self):
        """Cleanup cookie file on deletion"""
        if self.cookie_file and os.path.exists(self.cookie_file.name):
            try:
                os.unlink(self.cookie_file.name)
                logger.info(f"[AudioStream] Cleaned up cookie file")
            except Exception as e:
                logger.error(f"[AudioStream] Failed to cleanup cookie file: {e}")
