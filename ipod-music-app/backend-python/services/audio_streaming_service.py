"""
Audio Streaming Service using yt-dlp
Extracts and serves audio URLs from YouTube Music and other sources
"""
import logging
from typing import Optional, Dict, Any
import asyncio
from functools import lru_cache
import yt_dlp

logger = logging.getLogger(__name__)


class AudioStreamingService:
    """Service for extracting audio stream URLs using yt-dlp"""
    
    def __init__(self):
        self.ydl_opts = {
            'format': 'bestaudio/best',
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'nocheckcertificate': True,
            'ignoreerrors': False,
            'logtostderr': False,
            'age_limit': None,
            'default_search': 'auto',
        }
    
    async def get_stream_url(
        self, 
        video_id: str,
        use_cache: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Get streamable audio URL for a video
        
        Args:
            video_id: YouTube video ID
            use_cache: Whether to use cached results
            
        Returns:
            Dictionary with stream info or None if failed
        """
        try:
            logger.info(f"[AudioStream] Getting stream URL for: {video_id}")
            
            # Try multiple URL patterns
            urls = [
                f"https://music.youtube.com/watch?v={video_id}",
                f"https://www.youtube.com/watch?v={video_id}",
            ]
            
            for url in urls:
                try:
                    info = await self._extract_info(url)
                    if info:
                        return self._format_stream_info(info)
                except Exception as e:
                    logger.warning(f"[AudioStream] Failed with URL {url}: {e}")
                    continue
            
            logger.error(f"[AudioStream] All URLs failed for: {video_id}")
            return None
            
        except Exception as e:
            logger.error(f"[AudioStream] Error getting stream: {e}")
            return None
    
    async def _extract_info(self, url: str) -> Optional[Dict[str, Any]]:
        """Extract video info using yt-dlp"""
        try:
            loop = asyncio.get_event_loop()
            
            def _extract():
                with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                    return ydl.extract_info(url, download=False)
            
            info = await loop.run_in_executor(None, _extract)
            return info
            
        except Exception as e:
            logger.error(f"[AudioStream] Extract info error: {e}")
            return None
    
    def _format_stream_info(self, info: Dict[str, Any]) -> Dict[str, Any]:
        """Format extracted info into standard response"""
        try:
            # Find best audio format
            formats = info.get("formats", [])
            audio_formats = [
                f for f in formats 
                if f.get("acodec") != "none" and f.get("vcodec") == "none"
            ]
            
            if not audio_formats:
                # Fallback to any format with audio
                audio_formats = [
                    f for f in formats 
                    if f.get("acodec") != "none"
                ]
            
            if not audio_formats:
                logger.error("[AudioStream] No audio formats found")
                return None
            
            # Sort by quality (prefer higher bitrate)
            # Handle None values in bitrate comparison
            audio_formats.sort(
                key=lambda x: (x.get("abr") or x.get("tbr") or 0),
                reverse=True
            )
            
            best_format = audio_formats[0]
            
            return {
                "url": best_format.get("url"),
                "title": info.get("title"),
                "duration": info.get("duration"),
                "artist": info.get("artist") or info.get("uploader"),
                "album": info.get("album"),
                "thumbnail": info.get("thumbnail"),
                "format": best_format.get("ext"),
                "bitrate": best_format.get("abr"),
                "codec": best_format.get("acodec"),
            }
            
        except Exception as e:
            logger.error(f"[AudioStream] Format error: {e}")
            return None
    
    async def get_stream_formats(self, video_id: str) -> list[Dict[str, Any]]:
        """Get all available audio formats for a video"""
        try:
            url = f"https://music.youtube.com/watch?v={video_id}"
            info = await self._extract_info(url)
            
            if not info:
                return []
            
            formats = info.get("formats", [])
            audio_formats = [
                {
                    "format_id": f.get("format_id"),
                    "ext": f.get("ext"),
                    "quality": f.get("quality"),
                    "bitrate": f.get("abr") or f.get("tbr"),
                    "codec": f.get("acodec"),
                    "filesize": f.get("filesize"),
                }
                for f in formats
                if f.get("acodec") != "none"
            ]
            
            return audio_formats
            
        except Exception as e:
            logger.error(f"[AudioStream] Error getting formats: {e}")
            return []
    
    async def validate_stream(self, video_id: str) -> bool:
        """Check if a video can be streamed"""
        try:
            stream_info = await self.get_stream_url(video_id, use_cache=False)
            return stream_info is not None and stream_info.get("url") is not None
        except Exception as e:
            logger.error(f"[AudioStream] Validation error: {e}")
            return False


# Global instance
audio_streaming_service = AudioStreamingService()
