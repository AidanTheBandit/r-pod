# 🎵 R-Pod Development Guide

## Development Setup

### Prerequisites
- Node.js 18+
- Python 3.8+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/AidanTheBandit/r-pod.git
cd r-pod

# Install frontend dependencies
npm install

# Setup Python backend
cd backend-python
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or venv\Scripts\activate  # Windows
pip install -r requirements.txt
cd ..
```

### Development Workflow

```bash
# Start frontend development server
npm run dev

# Start backend in another terminal
./start-backend.sh

# Or start both services
npm run host-both
```

## Project Structure

```
r-pod/
├── src/                    # Frontend React application
│   ├── components/        # Reusable UI components
│   ├── views/            # Main application views
│   ├── services/         # API client and utilities
│   ├── store/            # Zustand state management
│   ├── hooks/            # React Query hooks
│   └── styles/           # CSS stylesheets
├── backend-python/        # Python FastAPI backend
│   ├── services/         # Music service aggregators
│   ├── main.py          # FastAPI application
│   └── config.py        # Configuration management
├── public/               # Static assets
├── dist/                # Production build output
└── SETUP.md             # Setup and deployment guide
```

## Key Components

### Frontend
- **React + Vite**: Modern frontend framework
- **Zustand**: Lightweight state management
- **React Query**: Data fetching and caching
- **CSS Modules**: Scoped styling

### Backend
- **FastAPI**: High-performance Python web framework
- **Service Aggregators**: Modular music service integrations
- **Environment Variables**: Secure configuration management

## Development Guidelines

### Code Style
- Use ESLint and Prettier for JavaScript/React
- Follow PEP 8 for Python
- Use meaningful variable and function names
- Add comments for complex logic

### Git Workflow
- Create feature branches from `main`
- Use descriptive commit messages
- Test changes before committing
- Keep commits focused and atomic

### Testing
- Test API endpoints with curl/Postman
- Test frontend components manually
- Verify music playback functionality
- Test with different service configurations

## Service Integration

### Adding a New Music Service

1. Create aggregator in `backend-python/services/`
2. Implement the service interface
3. Add configuration to `config.py`
4. Update frontend settings if needed
5. Test authentication and API calls

### Service Interface

```python
class BaseMusicService:
    async def authenticate(self, credentials: dict) -> bool:
        """Authenticate with the service"""
        pass

    async def get_tracks(self) -> List[Track]:
        """Get user's tracks"""
        pass

    async def get_albums(self) -> List[Album]:
        """Get user's albums"""
        pass

    async def get_playlists(self) -> List[Playlist]:
        """Get user's playlists"""
        pass

    async def search(self, query: str) -> SearchResults:
        """Search across the service"""
        pass
```

## Deployment

See `SETUP.md` for detailed deployment instructions.

## Troubleshooting

### Common Issues

**Backend won't start:**
- Check Python virtual environment is activated
- Verify all dependencies are installed
- Check environment variables are set

**Frontend build fails:**
- Clear node_modules and reinstall
- Check Node.js version (18+ required)
- Verify all environment variables are configured

**Service authentication fails:**
- Verify API credentials are correct
- Check service API status
- Review backend logs for specific errors

### Debug Tools

```bash
# Test backend health
curl http://localhost:3451/health

# Test with authentication
curl -H "x-server-password:your-password" http://localhost:3451/health

# Check service logs
tail -f backend-python/logs/app.log
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Security

- Never commit API keys or passwords
- Use environment variables for sensitive data
- Keep dependencies updated
- Review code for security vulnerabilities

## Performance

- Optimize bundle size for R1 device constraints
- Cache API responses appropriately
- Minimize re-renders in React components
- Use efficient data structures in Python