import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';
import { SpotifyAggregator } from './services/spotifyAggregator.js';
import { YouTubeMusicAggregator } from './services/youtubeMusicAggregator.js';
import { SubsonicAggregator } from './services/subsonicAggregator.js';
import { JellyfinAggregator } from './services/jellyfinAggregator.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL) || 600 });
const sessions = new Map();

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

const authenticate = (req, res, next) => {
  const password = req.headers['x-server-password'];
  if (password !== process.env.SERVER_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const getSession = (sessionId) => {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { services: {}, lastAccess: Date.now() });
  }
  return sessions.get(sessionId);
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), sessions: sessions.size });
});

app.post('/api/services/connect', authenticate, async (req, res) => {
  try {
    const { sessionId, service, credentials } = req.body;
    const session = getSession(sessionId);
    
    switch (service) {
      case 'spotify':
        session.services.spotify = new SpotifyAggregator(credentials);
        break;
      case 'youtubeMusic':
        session.services.youtubeMusic = new YouTubeMusicAggregator(credentials);
        await session.services.youtubeMusic.authenticate();
        break;
      case 'subsonic':
      case 'navidrome':
        session.services[service] = new SubsonicAggregator(credentials);
        break;
      case 'jellyfin':
        session.services.jellyfin = new JellyfinAggregator(credentials);
        break;
      default:
        return res.status(400).json({ error: 'Unknown service' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function aggregate(session, method, ...args) {
  const results = [];
  for (const [name, service] of Object.entries(session.services)) {
    try {
      const data = await service[method](...args);
      results.push(...data);
    } catch (err) {
      console.error(`${name} error:`, err.message);
    }
  }
  return results;
}

app.get('/api/tracks', authenticate, async (req, res) => {
  const { sessionId } = req.query;
  const session = getSession(sessionId);
  const tracks = await aggregate(session, 'getTracks');
  res.json({ tracks });
});

app.get('/api/albums', authenticate, async (req, res) => {
  const { sessionId } = req.query;
  const session = getSession(sessionId);
  const albums = await aggregate(session, 'getAlbums');
  res.json({ albums });
});

app.get('/api/playlists', authenticate, async (req, res) => {
  const { sessionId } = req.query;
  const session = getSession(sessionId);
  const playlists = await aggregate(session, 'getPlaylists');
  res.json({ playlists });
});

app.get('/api/artists', authenticate, async (req, res) => {
  const { sessionId } = req.query;
  const session = getSession(sessionId);
  const artists = await aggregate(session, 'getArtists');
  res.json({ artists });
});

app.get('/api/search', authenticate, async (req, res) => {
  const { sessionId, q } = req.query;
  const session = getSession(sessionId);
  const results = await aggregate(session, 'search', q);
  res.json({ results });
});

app.listen(PORT, () => {
  console.log(`Universal Music Aggregator - http://localhost:${PORT}`);
});
