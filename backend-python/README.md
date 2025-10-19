# R-Pod Backend - Python FastAPI Server

A high-performance Python backend for the R-Pod music aggregator using FastAPI, with support for YouTube Music, Spotify, Jellyfin, and Subsonic/Navidrome.

## 🚀 Features

- **FastAPI**: Modern, async Python web framework
- **Multi-Service Support**: YouTube Music, Spotify, Jellyfin, Subsonic/Navidrome
- **Secure Authentication**: Password-protected API with session management
- **Audio Streaming**: High-quality streaming via yt-dlp and PO tokens
- **Docker Support**: Easy containerized deployment
- **Health Monitoring**: Built-in health checks and monitoring

## 📋 Requirements

- Python 3.8+
- ffmpeg (for audio processing)
- Docker (optional)

## 🛠️ Installation

### Local Development

```bash
cd backend-python
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
python main.py
```

### Docker

```bash
cd backend-python
cp .env.example .env
# Edit .env with your configuration
docker-compose up -d
```

## 🔧 Configuration

See `../SETUP.md` for detailed configuration instructions.

Essential settings in `.env`:
```bash
SERVER_PASSWORD=your-secure-password
PORT=3451
YOUTUBE_MUSIC_COOKIE=your-cookie-here
```

## 📡 API Endpoints

All endpoints require: `X-Server-Password: your-password`

- `GET /health` - Health check
- `POST /api/services/connect` - Connect music services
- `GET /api/tracks` - Get tracks
- `GET /api/albums` - Get albums
- `GET /api/playlists` - Get playlists
- `GET /api/search?q=query` - Search

## 🏗️ Architecture

- **FastAPI**: Async web framework
- **Service Aggregators**: Modular music service integrations
- **Session Management**: Per-user service connections
- **Audio Streaming**: yt-dlp with PO token support
