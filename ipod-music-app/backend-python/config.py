"""
Configuration management for the iPod Music Backend
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings - Compatible with existing Node.js .env format"""
    
    # Server Configuration
    app_name: str = "iPod Music Backend"
    app_version: str = "2.0.0"
    host: str = "0.0.0.0"
    port: int = 3001
    node_env: str = "production"
    debug: bool = False
    
    # Security - Compatible with existing .env
    server_password: str = "music-aggregator-2025"
    jwt_secret: Optional[str] = None
    encryption_key: Optional[str] = None
    secret_key: Optional[str] = None  # Fallback
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Cache Settings
    cache_ttl: int = 3600  # 1 hour (matches Node.js default)
    
    # YouTube Music - Compatible with existing .env
    youtube_music_cookie: Optional[str] = None
    youtube_music_profile: Optional[str] = None  # Profile selection (unused - cookie handles it)
    youtube_client_id: Optional[str] = None
    youtube_client_secret: Optional[str] = None
    youtube_redirect_uri: Optional[str] = None
    
    # Apple Music - Compatible with existing .env (not implemented yet)
    apple_music_team_id: Optional[str] = None
    apple_music_key_id: Optional[str] = None
    apple_music_private_key_path: Optional[str] = None
    
    # Spotify - Compatible with existing .env
    spotify_client_id: Optional[str] = None
    spotify_client_secret: Optional[str] = None
    spotify_redirect_uri: str = "http://localhost:3001/callback/spotify"
    
    # Jellyfin - Compatible with existing .env
    jellyfin_server_url: Optional[str] = None
    jellyfin_api_key: Optional[str] = None
    
    # Subsonic/Navidrome - Compatible with existing .env
    subsonic_server_url: Optional[str] = None
    subsonic_username: Optional[str] = None
    subsonic_password: Optional[str] = None
    navidrome_server_url: Optional[str] = None
    navidrome_username: Optional[str] = None
    navidrome_password: Optional[str] = None
    
    # Session Management
    session_timeout: int = 3600  # 1 hour in seconds
    session_cleanup_interval: int = 300  # 5 minutes
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Debug mode based on NODE_ENV
        if self.node_env.lower() in ['development', 'dev']:
            self.debug = True


# Global settings instance
settings = Settings()
