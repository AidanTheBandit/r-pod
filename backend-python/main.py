"""
Main FastAPI Application
iPod Music Backend - Python Edition
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI, HTTPException, Request, Query, Header, Response, Depends, Body
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, Response
from pydantic import BaseModel
import httpx

from config import settings
from services.youtube_music_aggregator import YouTubeMusicAggregator
from services.spotify_aggregator import SpotifyAggregator
from services.audio_streaming_service_v2 import AudioStreamingService

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="[%(asctime)s] %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# Session storage
sessions: Dict[str, Dict[str, Any]] = {}

# Audio streaming service (initialized at startup)
audio_streaming_service = None


# Pydantic models
class ConnectServiceRequest(BaseModel):
    sessionId: str
    service: str
    credentials: Dict[str, Any]


class SessionInfo(BaseModel):
    sessionId: str
    services: List[str]
    created: str
    lastAccess: str


# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global audio_streaming_service
    
    # Startup
    logger.info("=" * 60)
    logger.info(f"{settings.app_name} v{settings.app_version}")
    logger.info("=" * 60)
    logger.info("Environment:")
    logger.info(f"  SERVER_PASSWORD: {'✓ Set' if settings.server_password else '✗ Not set'}")
    logger.info(f"  YOUTUBE_MUSIC_COOKIE: {'✓ Set' if settings.youtube_music_cookie else '✗ Not set'}")
    logger.info(f"  YOUTUBE_MUSIC_PROFILE: {settings.youtube_music_profile or 'Not set'}")
    logger.info(f"  YOUTUBE_MUSIC_BRAND_ACCOUNT_ID: {'✓ Set' if settings.youtube_music_brand_account_id else '✗ Not set'}")
    logger.info(f"  SPOTIFY_CLIENT_ID: {'✓ Set' if settings.spotify_client_id else '✗ Not set'}")
    logger.info(f"  CACHE_TTL: {settings.cache_ttl}s")
    logger.info(f"  CORS_ORIGINS: {settings.cors_origins}")
    logger.info("=" * 60)
    
    # Initialize audio streaming service with cookie
    audio_streaming_service = AudioStreamingService(cookie=settings.youtube_music_cookie)
    logger.info("Audio streaming service initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan
)

# CORS middleware - Extra permissive for Android WebView
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "Content-Range", "Accept-Ranges"],
)

# Additional CORS headers for problematic clients (like Android WebView)
@app.middleware("http")
async def add_cors_headers(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, HEAD"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Expose-Headers"] = "Content-Length, Content-Range, Accept-Ranges"
    response.headers["Access-Control-Max-Age"] = "3600"
    # Additional headers for WebView compatibility
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "ALLOWALL"  # Allow iframes if needed
    return response


# Authentication dependency
async def verify_password(x_server_password: Optional[str] = Header(None)):
    """Verify server password from header"""
    if x_server_password != settings.server_password:
        logger.error("[Auth] Unauthorized access attempt")
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True


# Session management
def get_session(session_id: str) -> Dict[str, Any]:
    """Get or create session"""
    if session_id not in sessions:
        logger.info(f"[Session] Creating new session: {session_id}")
        sessions[session_id] = {
            "services": {},
            "lastAccess": datetime.now(),
            "created": datetime.now()
        }
    else:
        sessions[session_id]["lastAccess"] = datetime.now()
    
    session = sessions[session_id]
    logger.debug(f"[Session] Session {session_id} - Services: {list(session['services'].keys())}")
    return session


async def session_cleanup_loop():
    """Background task to cleanup old sessions"""
    while True:
        try:
            await asyncio.sleep(settings.session_cleanup_interval)
            now = datetime.now()
            timeout = timedelta(seconds=settings.session_timeout)
            
            to_remove = [
                sid for sid, sess in sessions.items()
                if now - sess["lastAccess"] > timeout
            ]
            
            for sid in to_remove:
                logger.info(f"[Cleanup] Removing stale session: {sid}")
                del sessions[sid]
                
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[Cleanup] Error: {e}")


async def aggregate(session: Dict[str, Any], method: str, *args, **kwargs) -> List[Dict[str, Any]]:
    """Aggregate data from all connected services"""
    logger.info(f"[Aggregate] Method: {method}, Services: {list(session['services'].keys())}, Args: {args}, Kwargs: {kwargs}")
    
    # Auto-connect YouTube Music if available
    if not session["services"] and settings.youtube_music_cookie:
        logger.info("[Aggregate] Auto-connecting YouTube Music")
        try:
            ytm = YouTubeMusicAggregator({
                "cookie": settings.youtube_music_cookie,
                "profile": settings.youtube_music_profile,
                "brand_account_id": settings.youtube_music_brand_account_id
            })
            if await ytm.authenticate():
                session["services"]["youtubeMusic"] = ytm
                logger.info("[Aggregate] ✓ YouTube Music auto-connected")
        except Exception as e:
            logger.error(f"[Aggregate] Auto-connect failed: {e}")
    
    results = []
    errors = []
    
    for name, service in session["services"].items():
        try:
            logger.info(f"[Aggregate] Calling {method} on {name}")
            
            if not hasattr(service, method):
                logger.error(f"[Aggregate] {name} does not have method {method}")
                errors.append({"service": name, "error": f"Method {method} not found"})
                continue
            
            start_time = datetime.now()
            data = await getattr(service, method)(*args, **kwargs)
            duration = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"[Aggregate] {name}.{method}() completed in {duration:.2f}s - {len(data) if isinstance(data, list) else 0} items")
            
            if isinstance(data, list):
                results.extend(data)
            else:
                logger.warning(f"[Aggregate] {name}.{method}() did not return a list")
                
        except Exception as e:
            logger.error(f"[Aggregate] {name}.{method}() error: {e}")
            errors.append({"service": name, "error": str(e)})
    
    logger.info(f"[Aggregate] Total results: {len(results)}, Errors: {len(errors)}")
    return results


# API Routes
@app.get("/")
async def root(request: Request):
    """Root endpoint - redirects to health or shows basic info"""
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("User-Agent", "unknown")
    referer = request.headers.get("Referer", "none")
    logger.info(f"[Root] Request from {client_ip}")
    logger.info(f"[Root] User-Agent: {user_agent}")
    logger.info(f"[Root] Referer: {referer}")
    
    # Check if this looks like a health check request (common monitoring patterns)
    if ("health" in user_agent.lower() or 
        "monitor" in user_agent.lower() or 
        "check" in user_agent.lower() or
        "r1" in user_agent.lower() or
        "android" in user_agent.lower()):
        logger.info(f"[Root] Detected monitoring/health check request, redirecting to /health")
        return RedirectResponse(url="/health", status_code=302)
    
    return {
        "message": "iPod Music Backend API",
        "version": "2.0.0",
        "status": "running",
        "health": "/health",
        "cors_test": "/cors-test",
        "docs": "See /health for full status",
        "client_ip": client_ip,
        "user_agent": user_agent[:100],
        "referer": referer
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    health = {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "sessions": len(sessions),
        "environment": {
            "hasServerPassword": settings.server_password != "change-me-in-production",
            "hasYouTubeMusicCookie": bool(settings.youtube_music_cookie),
            "hasSpotifyConfig": bool(settings.spotify_client_id),
        },
        "cors_test": "This endpoint should be accessible from any origin"
    }
    return health

@app.get("/cors-test")
async def cors_test():
    """Simple CORS test endpoint - no authentication required"""
    return {
        "message": "CORS test successful",
        "timestamp": datetime.now().isoformat(),
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
            "Access-Control-Allow-Headers": "*",
        }
    }


@app.post("/api/services/connect")
async def connect_service(
    request: ConnectServiceRequest,
    authenticated: bool = Depends(verify_password)
):
    """Connect to a music service"""
    try:
        logger.info(f"[Connect] Service: {request.service}, Session: {request.sessionId}")
        
        session = get_session(request.sessionId)
        
        if request.service == "youtubeMusic":
            credentials = request.credentials if request.credentials.get("cookie") else {
                "cookie": settings.youtube_music_cookie,
                "profile": request.credentials.get("profile", settings.youtube_music_profile),
                "brand_account_id": settings.youtube_music_brand_account_id
            }
            
            if not credentials.get("cookie"):
                raise HTTPException(400, "YouTube Music cookie not provided")
            
            service = YouTubeMusicAggregator(credentials)
            if not await service.authenticate():
                raise HTTPException(401, "YouTube Music authentication failed")
            
            session["services"]["youtubeMusic"] = service
            
        elif request.service == "spotify":
            service = SpotifyAggregator(request.credentials)
            if not await service.authenticate():
                raise HTTPException(401, "Spotify authentication failed")
            
            session["services"]["spotify"] = service
            
        else:
            raise HTTPException(400, f"Unknown service: {request.service}")
        
        logger.info(f"[Connect] ✓ Connected to {request.service}")
        
        return {
            "success": True,
            "sessionId": request.sessionId,
            "connectedServices": list(session["services"].keys())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Connect] Error: {e}")
        raise HTTPException(500, str(e))


@app.get("/api/tracks")
async def get_tracks(
    sessionId: str = Query(...),
    section: Optional[str] = Query(None),
    authenticated: bool = Depends(verify_password)
):
    """
    Get tracks from all services
    
    Query params:
        - section: Optional section name for YTM (e.g., 'Quick Picks', 'Listen again')
    """
    session = get_session(sessionId)
    
    # If specific section requested from YouTube Music
    if section:
        ytm_service = session["services"].get("youtubeMusic")
        if ytm_service:
            logger.info(f"[API] Getting tracks from section: {section}")
            tracks = await ytm_service.get_home_section(section)
            return {"tracks": tracks}
        else:
            raise HTTPException(404, "YouTube Music not connected")
    
    # Otherwise aggregate from all services (uses improved get_tracks with priority sections)
    tracks = await aggregate(session, "get_tracks")
    return {"tracks": tracks}


@app.get("/api/albums")
async def get_albums(
    sessionId: str = Query(...),
    type: str = Query("user"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    authenticated: bool = Depends(verify_password)
):
    """Get albums from all services with pagination"""
    session = get_session(sessionId)
    albums = await aggregate(session, "get_albums", type, offset=offset, limit=limit)
    return {"albums": albums}


@app.get("/api/playlists")
async def get_playlists(
    sessionId: str = Query(...),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    authenticated: bool = Depends(verify_password)
):
    """Get playlists from all services with pagination"""
    session = get_session(sessionId)
    playlists = await aggregate(session, "get_playlists", offset=offset, limit=limit)
    return {"playlists": playlists}


@app.get("/api/playlists/{playlistId}/tracks")
async def get_playlist_tracks(
    playlistId: str,
    sessionId: str = Query(...),
    authenticated: bool = Depends(verify_password)
):
    """Get tracks for a specific playlist"""
    session = get_session(sessionId)
    
    # Find the service that owns this playlist
    tracks = []
    for service_name, service in session["services"].items():
        try:
            if hasattr(service, "get_playlist_tracks"):
                service_tracks = await service.get_playlist_tracks(playlistId)
                if service_tracks:
                    tracks.extend(service_tracks)
                    break
        except Exception as e:
            logger.warning(f"[API] Failed to get playlist tracks from {service_name}: {e}")
            continue
    
    if not tracks:
        raise HTTPException(404, f"Playlist {playlistId} not found or no tracks available")
    
    return {"tracks": tracks}


@app.get("/api/albums/{albumId}/tracks")
async def get_album_tracks(
    albumId: str,
    sessionId: str = Query(...),
    authenticated: bool = Depends(verify_password)
):
    """Get tracks for a specific album"""
    session = get_session(sessionId)
    tracks = await aggregate(session, "get_album_tracks", albumId)
    return {"tracks": tracks}


@app.get("/api/artists")
async def get_artists(
    sessionId: str = Query(...),
    type: str = Query("user"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    authenticated: bool = Depends(verify_password)
):
    """Get artists from all services with pagination"""
    session = get_session(sessionId)
    artists = await aggregate(session, "get_artists", type, offset=offset, limit=limit)
    return {"artists": artists}


@app.get("/api/artists/{artistId}/albums")
async def get_artist_albums(
    artistId: str,
    sessionId: str = Query(...),
    authenticated: bool = Depends(verify_password)
):
    """Get albums for a specific artist"""
    session = get_session(sessionId)
    albums = await aggregate(session, "get_artist_albums", artistId)
    return {"albums": albums}


@app.get("/api/search")
async def search(
    sessionId: str = Query(...),
    q: str = Query(..., min_length=2),
    authenticated: bool = Depends(verify_password)
):
    """Search across all services"""
    session = get_session(sessionId)
    results = await aggregate(session, "search", q)
    return {"results": results}


@app.get("/api/recommendations")
async def get_recommendations(
    sessionId: str = Query(...),
    section: Optional[str] = Query(None),
    authenticated: bool = Depends(verify_password)
):
    """
    Get recommendations from all services
    
    Query params:
        - section: Optional section name (e.g., 'Quick Picks', 'Listen again')
    """
    session = get_session(sessionId)
    
    # If specific section requested, get it from YouTube Music
    if section:
        ytm_service = session["services"].get("youtubeMusic")
        if ytm_service:
            logger.info(f"[API] Getting home section: {section}")
            tracks = await ytm_service.get_home_section(section)
            return {"recommendations": tracks}
        else:
            raise HTTPException(404, "YouTube Music not connected")
    
    # Otherwise get all recommendations
    recommendations = await aggregate(session, "get_recommendations")
    return {"recommendations": recommendations}


@app.get("/api/radio/{videoId}")
async def get_radio(
    videoId: str,
    sessionId: str = Query(...),
    authenticated: bool = Depends(verify_password)
):
    """Get radio tracks for a seed song"""
    session = get_session(sessionId)
    
    ytm_service = session["services"].get("youtubeMusic")
    if not ytm_service:
        raise HTTPException(404, "YouTube Music not connected")
    
    tracks = await ytm_service.start_radio_from_song(videoId)
    return {"tracks": tracks}


@app.post("/api/songs/{videoId}/rate")
async def rate_song(
    videoId: str,
    rating: str = Body(..., embed=True),
    sessionId: str = Query(...),
    authenticated: bool = Depends(verify_password)
):
    """Rate a song using YouTube Music API"""
    if rating not in ['LIKE', 'DISLIKE', 'INDIFFERENT']:
        raise HTTPException(400, "Invalid rating. Must be LIKE, DISLIKE, or INDIFFERENT")
    
    session = get_session(sessionId)
    
    ytm_service = session["services"].get("youtubeMusic")
    if not ytm_service:
        raise HTTPException(404, "YouTube Music not connected")
    
    result = await ytm_service.rate_song(videoId, rating)
    
    if result is None:
        raise HTTPException(500, "Failed to rate song")
    
    return {"success": True, "video_id": videoId, "rating": rating}


@app.get("/api/songs/{videoId}")
async def get_song_info(
    videoId: str,
    sessionId: str = Query(...),
    authenticated: bool = Depends(verify_password)
):
    """Get song info including like status"""
    session = get_session(sessionId)
    
    ytm_service = session["services"].get("youtubeMusic")
    if not ytm_service:
        raise HTTPException(404, "YouTube Music not connected")
    
    # Search for the song to get its current status
    results = await ytm_service.search(videoId, limit=1)
    
    if results and len(results) > 0:
        return results[0]
    
    raise HTTPException(404, "Song not found")


@app.get("/api/debug/auth")
async def debug_auth(
    sessionId: str = Query(...),
    authenticated: bool = Depends(verify_password)
):
    """Debug YouTube Music authentication"""
    session = get_session(sessionId)
    
    ytm_service = session["services"].get("youtubeMusic")
    if not ytm_service:
        # Try to create and test authentication directly
        logger.info("[Debug] YouTube Music not connected, creating service for testing")
        try:
            ytm_service = YouTubeMusicAggregator({
                "cookie": settings.youtube_music_cookie,
                "profile": settings.youtube_music_profile
            })
        except Exception as e:
            return {"error": f"Failed to create YouTube Music service: {str(e)}"}
    
    debug_info = await ytm_service.debug_authentication()
    return debug_info


@app.get("/api/debug/accounts")
async def debug_accounts(
    sessionId: str = Query(...),
    authenticated: bool = Depends(verify_password)
):
    """Debug multiple Google accounts to help identify the correct one"""
    session = get_session(sessionId)
    
    results = []
    
    # Try different account indices
    for account_idx in range(5):  # Try accounts 0-4
        logger.info(f"[Account Debug] Testing account index {account_idx}")
        
        try:
            # Create a fresh service instance for each account
            ytm_service = YouTubeMusicAggregator({
                "cookie": settings.youtube_music_cookie,
                "profile": str(account_idx)
            })
            
            # Try to authenticate
            auth_success = await ytm_service.authenticate()
            
            if auth_success:
                # Get debug info for this account
                debug_info = await ytm_service.debug_authentication()
                
                # Extract key information
                account_info = {
                    "account_index": account_idx,
                    "authentication_success": True,
                    "home_sections": debug_info.get("home_sections", []),
                    "total_sections": debug_info.get("total_home_sections", 0),
                    "sample_tracks": []
                }
                
                # Get some sample tracks to help identify the account
                try:
                    tracks = await ytm_service.get_tracks()
                    account_info["sample_tracks"] = [
                        {
                            "title": track.get("title", "Unknown"),
                            "artist": track.get("artist", "Unknown"),
                            "album": track.get("album", "Unknown")
                        }
                        for track in tracks[:5]  # First 5 tracks
                    ]
                    account_info["total_tracks_found"] = len(tracks)
                except Exception as e:
                    account_info["sample_tracks"] = []
                    account_info["track_error"] = str(e)
                
                results.append(account_info)
                logger.info(f"[Account Debug] Account {account_idx}: {len(account_info['home_sections'])} sections, {len(account_info['sample_tracks'])} sample tracks")
            
            else:
                results.append({
                    "account_index": account_idx,
                    "authentication_success": False,
                    "error": "Authentication failed"
                })
                logger.info(f"[Account Debug] Account {account_idx}: Authentication failed")
                
        except Exception as e:
            results.append({
                "account_index": account_idx,
                "authentication_success": False,
                "error": str(e)
            })
            logger.error(f"[Account Debug] Account {account_idx} error: {e}")
    
    return {
        "accounts_tested": results,
        "instructions": "Look at the sample_tracks and home_sections for each account. Find the account that has your preferred music (e.g., The Smashing Pumpkins, The Beatles). Use that account_index in your YOUTUBE_MUSIC_PROFILE setting."
    }


@app.options("/api/stream/youtube/{videoId}")
async def stream_youtube_options(videoId: str):
    """Handle CORS preflight for streaming"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "Range, Content-Type, X-Server-Password",
            "Access-Control-Max-Age": "3600"
        }
    )

@app.get("/api/stream/youtube/{videoId}")
async def stream_youtube(
    videoId: str,
    password: Optional[str] = Query(None),
    x_server_password: Optional[str] = Header(None),
    range_header: Optional[str] = Header(None, alias="Range")
):
    """Stream YouTube audio - proxies via yt-dlp with proper streaming support"""
    # Check auth from query or header
    if password != settings.server_password and x_server_password != settings.server_password:
        raise HTTPException(401, "Unauthorized")
    
    try:
        logger.info(f"[Stream] Request for: {videoId}")
        
        # Get fresh stream URL from yt-dlp
        stream_info = await audio_streaming_service.get_stream_url(videoId)
        
        # Check for YouTube protection errors
        if not stream_info:
            logger.error(f"[Stream] No stream info available for {videoId}")
            raise HTTPException(503, "Stream URL not available")
        
        # Handle structured error responses from yt-dlp protection issues
        if stream_info.get('error') == 'YOUTUBE_PROTECTION':
            logger.warning(f"[Stream] YouTube protection error for {videoId}: {stream_info.get('error_message')}")
            raise HTTPException(
                451,  # 451 Unavailable For Legal Reasons - appropriate for content protection
                detail=stream_info.get('error_message', 'Content temporarily unavailable due to YouTube protections')
            )
        
        if not stream_info.get("url"):
            logger.error(f"[Stream] No stream URL available for {videoId}")
            raise HTTPException(503, "Stream URL not available")
        
        stream_url = stream_info["url"]
        
        # Prepare headers for Google's servers
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Origin": "https://music.youtube.com",
            "Referer": "https://music.youtube.com/",
            "Sec-Fetch-Dest": "audio",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "cross-site"
        }
        
        # Handle range requests for seeking
        if range_header:
            headers["Range"] = range_header
            logger.info(f"[Stream] Range request: {range_header}")
        
        # Stream the audio with proper error handling and retry logic
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            max_retries = 3
            retry_count = 0
            
            while retry_count <= max_retries:
                try:
                    response = await client.get(stream_url, headers=headers)
                    
                    if response.status_code == 403 and retry_count < max_retries:
                        retry_count += 1
                        logger.warning(f"[Stream] 403 Forbidden - retrying ({retry_count}/{max_retries})...")
                        # Get a fresh URL and retry
                        stream_info = await audio_streaming_service.get_stream_url(videoId)
                        if stream_info and stream_info.get("url"):
                            stream_url = stream_info["url"]
                            continue
                        else:
                            logger.error(f"[Stream] Failed to get fresh URL after 403 error")
                            raise HTTPException(503, "Stream URL unavailable after retries")
                    elif response.status_code == 403:
                        logger.error(f"[Stream] 403 Forbidden - max retries exceeded")
                        raise HTTPException(403, "Stream access denied - YouTube URL expired")
                    
                    # Success - prepare response headers with CORS
                    response_headers = {
                        "Content-Type": response.headers.get("Content-Type", "audio/webm"),
                        "Accept-Ranges": "bytes",
                        "Cache-Control": "no-cache",  # Don't cache, URLs expire
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                        "Access-Control-Allow-Headers": "Range, Content-Type",
                        "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges"
                    }
                    
                    # Add Content-Length and Range headers if present
                    if "Content-Length" in response.headers:
                        response_headers["Content-Length"] = response.headers["Content-Length"]
                    if "Content-Range" in response.headers:
                        response_headers["Content-Range"] = response.headers["Content-Range"]
                    
                    content_length = len(response.content)
                    logger.info(f"[Stream] ✓ Proxying {content_length} bytes (status: {response.status_code})")
                    
                    return Response(
                        content=response.content,
                        status_code=response.status_code,
                        headers=response_headers,
                        media_type=response.headers.get("Content-Type", "audio/webm")
                    )
                    
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 403 and retry_count < max_retries:
                        retry_count += 1
                        logger.warning(f"[Stream] HTTP 403 error - retrying ({retry_count}/{max_retries})...")
                        # Get a fresh URL and retry
                        stream_info = await audio_streaming_service.get_stream_url(videoId)
                        if stream_info and stream_info.get("url"):
                            stream_url = stream_info["url"]
                            continue
                        else:
                            logger.error(f"[Stream] Failed to get fresh URL after HTTP 403 error")
                            raise HTTPException(503, "Stream URL unavailable after retries")
                    else:
                        logger.error(f"[Stream] HTTP error {e.response.status_code}: {e}")
                        raise HTTPException(e.response.status_code, f"Stream error: {e}")
                
                # If we get here, we've exhausted retries
                break
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Stream] Error: {e}", exc_info=True)
        raise HTTPException(503, f"Streaming service unavailable: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
