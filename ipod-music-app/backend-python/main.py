"""
Main FastAPI Application
iPod Music Backend - Python Edition
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI, HTTPException, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import httpx

from config import settings
from services.youtube_music_aggregator import YouTubeMusicAggregator
from services.spotify_aggregator import SpotifyAggregator
from services.audio_streaming_service import audio_streaming_service

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="[%(asctime)s] %(levelname)s - %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# Session storage
sessions: Dict[str, Dict[str, Any]] = {}


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
    logger.info("=" * 60)
    logger.info(f"{settings.app_name} v{settings.app_version}")
    logger.info("=" * 60)
    logger.info("Environment:")
    logger.info(f"  SERVER_PASSWORD: {'✓ Set' if settings.server_password != 'change-me-in-production' else '✗ Using default'}")
    logger.info(f"  YOUTUBE_MUSIC_COOKIE: {'✓ Set' if settings.youtube_music_cookie else '✗ Not set'}")
    logger.info(f"  SPOTIFY_CLIENT_ID: {'✓ Set' if settings.spotify_client_id else '✗ Not set'}")
    logger.info(f"  CACHE_TTL: {settings.cache_ttl}s")
    logger.info(f"  CORS_ORIGINS: {settings.cors_origins}")
    logger.info("=" * 60)
    
    # Start session cleanup task
    cleanup_task = asyncio.create_task(session_cleanup_loop())
    
    yield
    
    # Cleanup
    cleanup_task.cancel()
    logger.info("Shutting down...")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


async def aggregate(session: Dict[str, Any], method: str, *args) -> List[Dict[str, Any]]:
    """Aggregate data from all connected services"""
    logger.info(f"[Aggregate] Method: {method}, Services: {list(session['services'].keys())}")
    
    # Auto-connect YouTube Music if available
    if not session["services"] and settings.youtube_music_cookie:
        logger.info("[Aggregate] Auto-connecting YouTube Music")
        try:
            ytm = YouTubeMusicAggregator({
                "cookie": settings.youtube_music_cookie,
                "profile": settings.youtube_music_profile
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
            data = await getattr(service, method)(*args)
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
        "sessionDetails": [
            {
                "id": sid,
                "services": list(sess["services"].keys()),
                "created": sess["created"].isoformat(),
                "lastAccess": sess["lastAccess"].isoformat(),
            }
            for sid, sess in sessions.items()
        ]
    }
    return health


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
                "profile": request.credentials.get("profile", settings.youtube_music_profile)
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
    authenticated: bool = Depends(verify_password)
):
    """Get tracks from all services"""
    session = get_session(sessionId)
    tracks = await aggregate(session, "get_tracks")
    return {"tracks": tracks}


@app.get("/api/albums")
async def get_albums(
    sessionId: str = Query(...),
    type: str = Query("user"),
    authenticated: bool = Depends(verify_password)
):
    """Get albums from all services"""
    session = get_session(sessionId)
    albums = await aggregate(session, "get_albums", type)
    return {"albums": albums}


@app.get("/api/playlists")
async def get_playlists(
    sessionId: str = Query(...),
    authenticated: bool = Depends(verify_password)
):
    """Get playlists from all services"""
    session = get_session(sessionId)
    playlists = await aggregate(session, "get_playlists")
    return {"playlists": playlists}


@app.get("/api/artists")
async def get_artists(
    sessionId: str = Query(...),
    type: str = Query("user"),
    authenticated: bool = Depends(verify_password)
):
    """Get artists from all services"""
    session = get_session(sessionId)
    artists = await aggregate(session, "get_artists", type)
    return {"artists": artists}


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
    authenticated: bool = Depends(verify_password)
):
    """Get recommendations from all services"""
    session = get_session(sessionId)
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
    
    tracks = await ytm_service.get_radio(videoId)
    return {"tracks": tracks}


@app.get("/api/stream/youtube/{videoId}")
async def stream_youtube(
    videoId: str,
    password: Optional[str] = Query(None),
    x_server_password: Optional[str] = Header(None)
):
    """Stream YouTube audio"""
    # Check auth from query or header
    if password != settings.server_password and x_server_password != settings.server_password:
        raise HTTPException(401, "Unauthorized")
    
    try:
        logger.info(f"[Stream] Request for: {videoId}")
        
        stream_info = await audio_streaming_service.get_stream_url(videoId)
        
        if not stream_info or not stream_info.get("url"):
            raise HTTPException(503, "Stream URL not available")
        
        stream_url = stream_info["url"]
        
        # Proxy the stream
        async def stream_generator():
            async with httpx.AsyncClient() as client:
                async with client.stream("GET", stream_url) as response:
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        yield chunk
        
        return StreamingResponse(
            stream_generator(),
            media_type="audio/webm",
            headers={
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=3600",
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Stream] Error: {e}")
        raise HTTPException(503, f"Streaming service unavailable: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
