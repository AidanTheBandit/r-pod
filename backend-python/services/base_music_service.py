"""
Base Music Service - Abstract base class for all music service aggregators
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class BaseMusicService(ABC):
    """Abstract base class for music service aggregators"""
    
    def __init__(self, credentials: Dict[str, Any]):
        """
        Initialize the service with credentials
        
        Args:
            credentials: Dictionary containing service-specific credentials
        """
        self.credentials = credentials
        self.is_authenticated = False
        self.service_name = self.__class__.__name__.replace("Aggregator", "").lower()
    
    @abstractmethod
    async def authenticate(self) -> bool:
        """
        Authenticate with the music service
        
        Returns:
            bool: True if authentication successful, False otherwise
        """
        pass
    
    @abstractmethod
    async def get_tracks(self) -> List[Dict[str, Any]]:
        """
        Get user's tracks/songs
        
        Returns:
            List of track dictionaries
        """
        pass
    
    @abstractmethod
    async def get_albums(self, album_type: str = "user") -> List[Dict[str, Any]]:
        """
        Get albums
        
        Args:
            album_type: Type of albums to fetch ("user" or "popular")
            
        Returns:
            List of album dictionaries
        """
        pass
    
    @abstractmethod
    async def get_playlists(self) -> List[Dict[str, Any]]:
        """
        Get playlists
        
        Returns:
            List of playlist dictionaries
        """
        pass
    
    @abstractmethod
    async def get_artists(self, artist_type: str = "user") -> List[Dict[str, Any]]:
        """
        Get artists
        
        Args:
            artist_type: Type of artists to fetch ("user" or "popular")
            
        Returns:
            List of artist dictionaries
        """
        pass
    
    @abstractmethod
    async def search(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for music content
        
        Args:
            query: Search query string
            
        Returns:
            List of search result dictionaries
        """
        pass
    
    async def get_recommendations(self) -> List[Dict[str, Any]]:
        """
        Get recommendations (optional, can be overridden)
        
        Returns:
            List of recommendation dictionaries
        """
        logger.info(f"[{self.service_name}] get_recommendations not implemented")
        return []
    
    def _map_track(self, track_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map service-specific track data to common format
        Override this in child classes for custom mapping
        
        Args:
            track_data: Raw track data from service
            
        Returns:
            Standardized track dictionary
        """
        return track_data
    
    def _map_album(self, album_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map service-specific album data to common format
        Override this in child classes for custom mapping
        
        Args:
            album_data: Raw album data from service
            
        Returns:
            Standardized album dictionary
        """
        return album_data
    
    def _map_playlist(self, playlist_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map service-specific playlist data to common format
        Override this in child classes for custom mapping
        
        Args:
            playlist_data: Raw playlist data from service
            
        Returns:
            Standardized playlist dictionary
        """
        return playlist_data
    
    def _map_artist(self, artist_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map service-specific artist data to common format
        Override this in child classes for custom mapping
        
        Args:
            artist_data: Raw artist data from service
            
        Returns:
            Standardized artist dictionary
        """
        return artist_data
