"""
YouTube Music Streaming Service
Handles search, streaming, lyrics, and transcription
"""
import logging
import tempfile
import json
import hashlib
from pathlib import Path
from typing import Dict, Any, Optional, List
import asyncio
from concurrent.futures import ThreadPoolExecutor
import yt_dlp
import requests

logger = logging.getLogger(__name__)

# Global cache directories
LYRICS_CACHE_DIR = Path(tempfile.gettempdir()) / 'r_pod_lyrics_cache'
LYRICS_CACHE_DIR.mkdir(exist_ok=True)

# Thread pool for CPU-intensive tasks
executor = ThreadPoolExecutor(max_workers=2)


class YTMStreamingService:
    """YouTube Music streaming, search, and transcription service"""
    
    def __init__(self, ytmusic_api=None):
        """
        Initialize streaming service
        
        Args:
            ytmusic_api: YTMusic instance (optional, for authenticated features)
        """
        self.ytmusic = ytmusic_api
        self.whisper_model = None
    
    def get_whisper_model(self):
        """Lazy load Whisper model"""
        if self.whisper_model is None:
            try:
                from faster_whisper import WhisperModel
                logger.info("Loading Whisper model (base - better accuracy for multi-language)...")
                # Use 'base' model for better accuracy especially for non-English songs
                self.whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
                logger.info("✓ Whisper model loaded!")
            except Exception as e:
                logger.error(f"Error loading Whisper model: {e}")
        return self.whisper_model
    
    async def search(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Search for tracks on YouTube Music
        
        Args:
            query: Search query
            limit: Max results
            
        Returns:
            List of formatted tracks
        """
        if not self.ytmusic:
            raise ValueError("YTMusic API not initialized")
        
        try:
            # Run blocking search in thread pool
            results = await asyncio.get_event_loop().run_in_executor(
                executor,
                lambda: self.ytmusic.search(query, filter='songs', limit=limit)
            )
            
            formatted_results = []
            for track in results:
                video_id = track.get('videoId')
                thumbnail_url = ''
                
                if video_id:
                    thumbnail_urls_to_try = [
                        f'https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg',
                        f'https://i.ytimg.com/vi/{video_id}/sddefault.jpg',
                        f'https://i.ytimg.com/vi/{video_id}/hqdefault.jpg'
                    ]
                    thumbnail_url = thumbnail_urls_to_try[0]
                elif track.get('thumbnails'):
                    thumbnails = track['thumbnails']
                    if thumbnails:
                        thumbnail_url = thumbnails[-1]['url']
                        if '=w' in thumbnail_url or '=s' in thumbnail_url:
                            thumbnail_url = thumbnail_url.split('=w')[0].split('=s')[0]
                
                formatted_track = {
                    'id': track.get('videoId'),
                    'name': track.get('title'),
                    'artists': [{'name': artist['name']} for artist in track.get('artists', [])],
                    'album': {
                        'name': track.get('album', {}).get('name', 'Unknown Album') if track.get('album') else 'Unknown Album',
                        'images': [
                            {'url': thumbnail_url, 'height': 640, 'width': 640}
                        ]
                    },
                    'duration_ms': track.get('duration_seconds', 0) * 1000 if track.get('duration_seconds') else 0,
                    'uri': f"ytmusic:{track.get('videoId')}",
                    'preview_url': None,
                    'external_urls': {
                        'youtube': f"https://music.youtube.com/watch?v={track.get('videoId')}"
                    }
                }
                formatted_results.append(formatted_track)
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Search error: {e}")
            raise
    
    async def get_track_info(self, video_id: str) -> Dict[str, Any]:
        """
        Get track streaming URL using yt-dlp
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Track info with streaming URL
        """
        try:
            ydl_opts = {
                'format': 'bestaudio/best',
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
            }
            
            # Run in thread pool
            info = await asyncio.get_event_loop().run_in_executor(
                executor,
                lambda: self._extract_info(video_id, ydl_opts)
            )
            
            audio_url = info.get('url')
            
            return {
                'videoId': video_id,
                'audioUrl': audio_url,
                'title': info.get('title'),
                'duration': info.get('duration')
            }
            
        except Exception as e:
            logger.error(f"Error getting track: {e}")
            raise
    
    def _extract_info(self, video_id: str, ydl_opts: dict) -> dict:
        """Helper to extract info with yt-dlp (blocking)"""
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            return ydl.extract_info(f'https://music.youtube.com/watch?v={video_id}', download=False)
    
    async def get_stream_url(self, video_id: str) -> Dict[str, Any]:
        """
        Get fresh streaming URL for a video
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Dict with url and metadata
        """
        try:
            ydl_opts = {
                'format': 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best',
                'quiet': False,
                'no_warnings': False,
                'extract_flat': False,
                'nocheckcertificate': False,
                'prefer_insecure': False,
                'legacy_server_connect': True,
            }
            
            logger.info(f"Extracting info for video {video_id}...")
            
            # Run in thread pool
            info = await asyncio.get_event_loop().run_in_executor(
                executor,
                lambda: self._extract_info(video_id, ydl_opts)
            )
            
            audio_url = info.get('url')
            
            if not audio_url:
                if info.get('requested_formats'):
                    for fmt in info['requested_formats']:
                        if fmt.get('acodec') != 'none':
                            audio_url = fmt.get('url')
                            break
                elif info.get('formats'):
                    for fmt in info['formats']:
                        if fmt.get('acodec') != 'none' and fmt.get('url'):
                            audio_url = fmt.get('url')
                            break
            
            if not audio_url:
                return {'error': 'NO_AUDIO_URL', 'url': None}
            
            return {
                'url': audio_url,
                'title': info.get('title'),
                'duration': info.get('duration'),
                'format': info.get('ext', 'webm')
            }
            
        except Exception as e:
            logger.error(f"Error getting stream URL: {e}")
            return {'error': str(e), 'url': None}
    
    async def get_recommendations(self, video_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get song recommendations based on a video ID
        
        Args:
            video_id: Seed video ID
            limit: Max recommendations
            
        Returns:
            List of formatted tracks
        """
        if not self.ytmusic:
            raise ValueError("YTMusic API not initialized")
        
        try:
            # Get watch playlist (related songs) from YouTube Music
            watch_playlist = await asyncio.get_event_loop().run_in_executor(
                executor,
                lambda: self.ytmusic.get_watch_playlist(videoId=video_id, limit=limit)
            )
            
            if not watch_playlist or 'tracks' not in watch_playlist:
                return []
            
            tracks = watch_playlist['tracks']
            formatted_results = []
            
            for track in tracks:
                track_video_id = track.get('videoId')
                if not track_video_id or track_video_id == video_id:
                    continue  # Skip the current song
                    
                thumbnail_url = ''
                if track_video_id:
                    thumbnail_url = f'https://i.ytimg.com/vi/{track_video_id}/maxresdefault.jpg'
                elif track.get('thumbnail'):
                    thumbnails = track['thumbnail']
                    if thumbnails:
                        thumbnail_url = thumbnails[-1]['url']
                        if '=w' in thumbnail_url or '=s' in thumbnail_url:
                            thumbnail_url = thumbnail_url.split('=w')[0].split('=s')[0]
                
                formatted_track = {
                    'id': track_video_id,
                    'name': track.get('title'),
                    'artists': [{'name': artist['name']} for artist in track.get('artists', [])],
                    'album': {
                        'name': track.get('album', {}).get('name', 'Unknown Album') if track.get('album') else 'Unknown Album',
                        'images': [
                            {'url': thumbnail_url, 'height': 640, 'width': 640}
                        ]
                    },
                    'duration_ms': track.get('duration_seconds', 0) * 1000 if track.get('duration_seconds') else 0,
                    'uri': f"ytmusic:{track_video_id}",
                    'preview_url': None,
                    'external_urls': {
                        'youtube': f"https://music.youtube.com/watch?v={track_video_id}"
                    }
                }
                formatted_results.append(formatted_track)
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            return []
    
    async def get_lyrics(self, video_id: str) -> Dict[str, Any]:
        """
        Get lyrics for a video (cached or AI transcription)
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Lyrics data with source and synced status
        """
        try:
            # Check cache first
            cache_file = LYRICS_CACHE_DIR / f"{video_id}.json"
            if cache_file.exists():
                logger.info(f"✓ Found cached lyrics for {video_id}")
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                    return cached_data
            
            # Return transcribing status
            return {
                'lyrics': 'Transcribing lyrics with AI... This may take 15-30 seconds.',
                'source': 'transcribing',
                'synced': False,
                'segments': []
            }
                
        except Exception as e:
            logger.error(f"Error getting lyrics: {e}")
            return {'error': str(e), 'lyrics': 'Lyrics not available'}
    
    async def transcribe_lyrics(self, video_id: str) -> Dict[str, Any]:
        """
        Transcribe lyrics using Whisper AI
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Transcribed lyrics with timestamps
        """
        try:
            # Check cache first
            cache_file = LYRICS_CACHE_DIR / f"{video_id}.json"
            if cache_file.exists():
                logger.info(f"✓ Found cached transcription for {video_id}")
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                    if cached_data.get('source') == 'whisper_ai':
                        return cached_data
            
            logger.info(f"🎤 Starting Whisper transcription for {video_id}...")
            
            # Download audio file
            audio_file = LYRICS_CACHE_DIR / f"{video_id}.mp3"
            
            if not audio_file.exists():
                logger.info("📥 Downloading audio...")
                await self._download_audio(video_id, audio_file)
            
            # Transcribe with Whisper locally
            logger.info("🎵 Transcribing with Whisper AI...")
            
            # Run in thread pool (CPU intensive)
            result_data = await asyncio.get_event_loop().run_in_executor(
                executor,
                lambda: self._transcribe_with_whisper(audio_file, video_id)
            )
            
            # Clean up audio file
            audio_file.unlink(missing_ok=True)
            logger.info(f"✓ Audio file deleted, lyrics cached")
            
            return result_data
            
        except Exception as e:
            logger.error(f"Error transcribing: {e}")
            return {
                'error': str(e),
                'lyrics': 'Transcription failed'
            }
    
    async def _download_audio(self, video_id: str, output_path: Path):
        """Download audio for transcription"""
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': str(output_path.with_suffix('')),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
        }
        
        # Run in thread pool
        await asyncio.get_event_loop().run_in_executor(
            executor,
            lambda: self._download_with_ytdlp(video_id, ydl_opts)
        )
    
    def _download_with_ytdlp(self, video_id: str, ydl_opts: dict):
        """Helper to download with yt-dlp (blocking)"""
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([f'https://music.youtube.com/watch?v={video_id}'])
    
    def _transcribe_with_whisper(self, audio_file: Path, video_id: str) -> Dict[str, Any]:
        """Helper to transcribe with Whisper (blocking)"""
        model = self.get_whisper_model()
        
        if model is None:
            return {
                'error': 'Whisper model not available',
                'lyrics': 'AI transcription unavailable'
            }
        
        # Auto-detect language (supports 99 languages!)
        segments_list, info = model.transcribe(str(audio_file), word_timestamps=False)
        detected_language = info.language
        logger.info(f"🌍 Detected language: {detected_language}")
        
        lyrics_segments = []
        lyrics_lines = []
        
        for segment in segments_list:
            text = segment.text.strip()
            if text:
                lyrics_lines.append(text)
                lyrics_segments.append({
                    'start': segment.start,
                    'text': text
                })
        
        lyrics_text = '\n'.join(lyrics_lines)
        
        result_data = {
            'lyrics': lyrics_text,
            'source': 'whisper_ai',
            'synced': True,
            'segments': lyrics_segments,
            'language': detected_language
        }
        
        # Cache the result
        cache_file = LYRICS_CACHE_DIR / f"{video_id}.json"
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"✓ Transcription complete! {len(lyrics_segments)} segments")
        return result_data
    
    async def get_thumbnail(self, video_id: str) -> str:
        """
        Get valid thumbnail URL for a video
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Thumbnail URL
        """
        try:
            qualities = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default']
            for quality in qualities:
                thumbnail_url = f'https://i.ytimg.com/vi/{video_id}/{quality}.jpg'
                
                # Check if URL is valid (run in thread pool)
                is_valid = await asyncio.get_event_loop().run_in_executor(
                    executor,
                    lambda: self._check_thumbnail_url(thumbnail_url)
                )
                
                if is_valid:
                    return thumbnail_url
            
            # Fallback
            return f'https://i.ytimg.com/vi/{video_id}/hqdefault.jpg'
            
        except Exception as e:
            logger.error(f"Error getting thumbnail: {e}")
            return f'https://i.ytimg.com/vi/{video_id}/hqdefault.jpg'
    
    def _check_thumbnail_url(self, url: str) -> bool:
        """Check if thumbnail URL is valid (blocking)"""
        try:
            resp = requests.head(url, timeout=5)
            return resp.status_code == 200
        except:
            return False
