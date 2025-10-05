"""
Music Service Aggregators
"""
from .base_music_service import BaseMusicService
from .youtube_music_aggregator import YouTubeMusicAggregator
from .spotify_aggregator import SpotifyAggregator
from .subsonic_aggregator import SubsonicAggregator
from .jellyfin_aggregator import JellyfinAggregator
from .audio_streaming_service_v2 import AudioStreamingService

__all__ = [
    "BaseMusicService",
    "YouTubeMusicAggregator",
    "SpotifyAggregator",
    "SubsonicAggregator",
    "JellyfinAggregator",
    "AudioStreamingService",
]
