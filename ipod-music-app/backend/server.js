import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';
import { Innertube } from 'youtubei.js';
import { SpotifyAggregator } from './services/spotifyAggregator.js';
import { YouTubeMusicAggregator } from './services/youtubeMusicAggregator.js';
import { SubsonicAggregator } from './services/subsonicAggregator.js';
import { JellyfinAggregator } from './services/jellyfinAggregator.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL) || 600 });
const sessions = new Map();

// Initialize YouTube InnerTube client for streaming
let youtubeClient = null;

async function getYouTubeClient() {
  if (!youtubeClient) {
    console.log('[Server] Initializing YouTube client...');
    youtubeClient = await Innertube.create({
      cache: new NodeCache({ stdTTL: 3600 }),
    });
    console.log('[Server] ✓ YouTube client initialized');
  }
  return youtubeClient;
}

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const authenticate = (req, res, next) => {
  const password = req.headers['x-server-password'];
  
  if (password !== process.env.SERVER_PASSWORD) {
    console.error('[Auth] ✗ Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

const getSession = (sessionId) => {
  console.log('[Session] Getting session:', sessionId);
  
  if (!sessions.has(sessionId)) {
    console.log('[Session] Creating new session:', sessionId);
    sessions.set(sessionId, { 
      services: {}, 
      lastAccess: Date.now(),
      created: Date.now()
    });
  } else {
    // Update last access time
    const session = sessions.get(sessionId);
    session.lastAccess = Date.now();
  }
  
  const session = sessions.get(sessionId);
  console.log('[Session] Session state:', {
    sessionId,
    services: Object.keys(session.services),
    serviceCount: Object.keys(session.services).length,
    created: new Date(session.created).toISOString(),
    lastAccess: new Date(session.lastAccess).toISOString()
  });
  
  return session;
};

// Function to log available YouTube Music profiles/accounts
async function logAvailableYouTubeProfiles() {
  if (!process.env.YOUTUBE_MUSIC_COOKIE) {
    console.log('[Profiles] No YOUTUBE_MUSIC_COOKIE set, skipping profile enumeration');
    return;
  }

  console.log('[Profiles] Enumerating available YouTube Music profiles/accounts...');

  const maxProfiles = 5; // Try up to 5 profiles
  const availableProfiles = [];

  for (let profile = 0; profile < maxProfiles; profile++) {
    try {
      console.log(`[Profiles] Testing profile ${profile}...`);
      
      const credentials = {
        cookie: process.env.YOUTUBE_MUSIC_COOKIE,
        profile: profile.toString()
      };

      const tempAggregator = new YouTubeMusicAggregator(credentials);
      const authSuccess = await tempAggregator.authenticate();

      if (authSuccess) {
        // Try to get channel name from home sections
        try {
          const homeSections = await tempAggregator.ytm.getHomeSections();
          const channelName = homeSections?.[0]?.title || `Profile ${profile}`;
          availableProfiles.push({ profile, name: channelName });
          console.log(`[Profiles] ✓ Profile ${profile}: ${channelName}`);
        } catch (nameError) {
          availableProfiles.push({ profile, name: `Profile ${profile}` });
          console.log(`[Profiles] ✓ Profile ${profile}: Available (name unknown)`);
        }
      } else {
        console.log(`[Profiles] ✗ Profile ${profile}: Not available`);
        break; // Stop at first failure
      }
    } catch (error) {
      console.log(`[Profiles] ✗ Profile ${profile}: Error - ${error.message}`);
      break;
    }
  }

  if (availableProfiles.length > 0) {
    console.log('[Profiles] Available profiles:', availableProfiles.map(p => `${p.profile} (${p.name})`).join(', '));
    console.log(`[Profiles] Use YOUTUBE_MUSIC_PROFILE env var to select (default: 0)`);
  } else {
    console.log('[Profiles] No profiles available');
  }
}

app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    sessions: sessions.size,
    environment: {
      hasServerPassword: !!process.env.SERVER_PASSWORD,
      hasYouTubeMusicCookie: !!process.env.YOUTUBE_MUSIC_COOKIE,
      youtubeMusicCookieLength: process.env.YOUTUBE_MUSIC_COOKIE?.length || 0
    },
    sessionDetails: Array.from(sessions.entries()).map(([id, session]) => ({
      id,
      services: Object.keys(session.services),
      created: new Date(session.created).toISOString(),
      lastAccess: new Date(session.lastAccess).toISOString(),
      age: `${Math.floor((Date.now() - session.created) / 1000)}s`
    }))
  };
  
  console.log('[Health] Status check:', health);
  res.json(health);
});

app.post('/api/services/connect', authenticate, async (req, res) => {
  console.log('[Connect] Request body:', {
    sessionId: req.body.sessionId,
    service: req.body.service,
    hasCredentials: !!req.body.credentials
  });

  try {
    const { sessionId, service, credentials } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }
    
    const session = getSession(sessionId);
    
    console.log(`[Connect] Connecting to service: ${service}`);
    
    switch (service) {
      case 'spotify':
        console.log('[Connect] Creating Spotify aggregator');
        session.services.spotify = new SpotifyAggregator(credentials);
        break;
        
      case 'youtubeMusic':
        console.log('[Connect] Setting up YouTube Music aggregator');
        
        const ytmCredentials = credentials?.cookie ? credentials : {
          cookie: process.env.YOUTUBE_MUSIC_COOKIE,
          profile: credentials?.profile || '1'
        };
        
        console.log('[Connect] YouTube Music credentials:', {
          hasCredentialsCookie: !!credentials?.cookie,
          credentialsCookieLength: credentials?.cookie?.length,
          hasEnvCookie: !!process.env.YOUTUBE_MUSIC_COOKIE,
          envCookieLength: process.env.YOUTUBE_MUSIC_COOKIE?.length,
          usingEnvCookie: !credentials?.cookie,
          profile: ytmCredentials.profile
        });
        
        if (!ytmCredentials.cookie) {
          console.error('[Connect] ✗ No YouTube Music cookie available');
          return res.status(400).json({ 
            error: 'YouTube Music cookie not provided. Set YOUTUBE_MUSIC_COOKIE in .env or provide credentials.' 
          });
        }
        
        console.log('[Connect] Creating YouTube Music aggregator instance');
        session.services.youtubeMusic = new YouTubeMusicAggregator(ytmCredentials);
        
        console.log('[Connect] Authenticating YouTube Music...');
        const authSuccess = await session.services.youtubeMusic.authenticate();
        
        if (!authSuccess) {
          console.error('[Connect] ✗ YouTube Music authentication failed');
          delete session.services.youtubeMusic;
          return res.status(401).json({ error: 'YouTube Music authentication failed' });
        }
        
        console.log('[Connect] ✓ YouTube Music authenticated successfully');
        break;
        
      case 'subsonic':
      case 'navidrome':
        console.log(`[Connect] Creating ${service} aggregator`);
        session.services[service] = new SubsonicAggregator(credentials);
        break;
        
      case 'jellyfin':
        console.log('[Connect] Creating Jellyfin aggregator');
        session.services.jellyfin = new JellyfinAggregator(credentials);
        break;
        
      default:
        console.error('[Connect] ✗ Unknown service:', service);
        return res.status(400).json({ error: 'Unknown service' });
    }
    
    console.log(`[Connect] ✓ Successfully connected to ${service}`);
    console.log(`[Connect] Session now has services:`, Object.keys(session.services));
    
    res.json({ 
      success: true,
      sessionId,
      connectedServices: Object.keys(session.services)
    });
    
  } catch (error) {
    console.error('[Connect] ✗ Service connection error:', {
      service: req.body.service,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
  }
});

async function aggregate(session, method, ...args) {
  console.log(`[Aggregate] Starting aggregation for method: ${method}`);
  console.log(`[Aggregate] Available services:`, Object.keys(session.services));
  
  // Auto-connect YouTube Music if not connected and env cookie available
  if (Object.keys(session.services).length === 0) {
    console.log('[Aggregate] No services connected, attempting auto-connect...');
    await ensureYouTubeMusicConnected(session);
  }
  
  console.log(`[Aggregate] Services after auto-connect:`, Object.keys(session.services));
  console.log(`[Aggregate] Method arguments:`, args);
  
  const results = [];
  const errors = [];
  
  for (const [name, service] of Object.entries(session.services)) {
    try {
      console.log(`[Aggregate] Calling ${method} on ${name}...`);
      
      if (typeof service[method] !== 'function') {
        console.error(`[Aggregate] ✗ ${name} does not have method ${method}`);
        errors.push({ service: name, error: `Method ${method} not found` });
        continue;
      }
      
      const startTime = Date.now();
      const data = await service[method](...args);
      const duration = Date.now() - startTime;
      
      console.log(`[Aggregate] ${name}.${method}() completed:`, {
        duration: `${duration}ms`,
        dataType: typeof data,
        isArray: Array.isArray(data),
        length: data?.length || 0,
        sample: data?.[0] ? JSON.stringify(data[0]).substring(0, 200) : null
      });
      
      if (Array.isArray(data)) {
        results.push(...data);
        console.log(`[Aggregate] ✓ Added ${data.length} items from ${name}`);
      } else {
        console.warn(`[Aggregate] ⚠ ${name}.${method}() did not return an array:`, typeof data);
      }
      
    } catch (err) {
      console.error(`[Aggregate] ✗ ${name}.${method}() error:`, {
        message: err.message,
        stack: err.stack
      });
      errors.push({ service: name, error: err.message });
    }
  }
  
  console.log(`[Aggregate] Aggregation complete:`, {
    totalResults: results.length,
    serviceCount: Object.keys(session.services).length,
    errors: errors.length,
    errorDetails: errors
  });
  
  return results;
}

app.get('/api/tracks', authenticate, async (req, res) => {
  console.log('[API] GET /api/tracks');
  const { sessionId } = req.query;
  
  console.log('[API] Query params:', { sessionId });
  
  if (!sessionId) {
    console.error('[API] ✗ No sessionId provided');
    return res.status(400).json({ error: 'sessionId required' });
  }
  
  const session = getSession(sessionId);
  const tracks = await aggregate(session, 'getTracks');
  
  console.log(`[API] ✓ Returning ${tracks.length} tracks`);
  res.json({ tracks });
});

app.get('/api/albums', authenticate, async (req, res) => {
  console.log('[API] GET /api/albums');
  const { sessionId } = req.query;
  
  if (!sessionId) {
    console.error('[API] ✗ No sessionId provided');
    return res.status(400).json({ error: 'sessionId required' });
  }
  
  const session = getSession(sessionId);
  const albums = await aggregate(session, 'getAlbums');
  
  console.log(`[API] ✓ Returning ${albums.length} albums`);
  res.json({ albums });
});

app.get('/api/playlists', authenticate, async (req, res) => {
  console.log('[API] GET /api/playlists');
  const { sessionId } = req.query;
  
  if (!sessionId) {
    console.error('[API] ✗ No sessionId provided');
    return res.status(400).json({ error: 'sessionId required' });
  }
  
  const session = getSession(sessionId);
  const playlists = await aggregate(session, 'getPlaylists');
  
  console.log(`[API] ✓ Returning ${playlists.length} playlists`);
  res.json({ playlists });
});

app.get('/api/artists', authenticate, async (req, res) => {
  console.log('[API] GET /api/artists');
  const { sessionId, type = 'user' } = req.query;
  
  console.log('[API] Query params:', { sessionId, type });
  
  if (!sessionId) {
    console.error('[API] ✗ No sessionId provided');
    return res.status(400).json({ error: 'sessionId required' });
  }
  
  const session = getSession(sessionId);
  const artists = await aggregate(session, 'getArtists', type);
  
  console.log(`[API] ✓ Returning ${artists.length} artists`);
  res.json({ artists });
});

app.get('/api/search', authenticate, async (req, res) => {
  console.log('[API] GET /api/search');
  const { sessionId, q: query } = req.query;
  
  console.log('[API] Query params:', { sessionId, query });
  
  if (!sessionId) {
    console.error('[API] ✗ No sessionId provided');
    return res.status(400).json({ error: 'sessionId required' });
  }
  
  if (!query || query.trim().length < 2) {
    console.log('[API] Query too short, returning empty results');
    return res.json({ results: [] });
  }
  
  const session = getSession(sessionId);
  const results = await aggregate(session, 'search', query);
  
  console.log(`[API] ✓ Returning ${results.length} search results`);
  res.json({ results });
});

app.get('/api/recommendations', authenticate, async (req, res) => {
  console.log('[API] GET /api/recommendations');
  const { sessionId } = req.query;
  
  if (!sessionId) {
    console.error('[API] ✗ No sessionId provided');
    return res.status(400).json({ error: 'sessionId required' });
  }
  
  const session = getSession(sessionId);
  const recommendations = await aggregate(session, 'getRecommendations');
  
  console.log(`[API] ✓ Returning ${recommendations.length} recommendations`);
  res.json({ recommendations });
});

app.get('/api/radio/:videoId', authenticate, async (req, res) => {
  console.log('[API] GET /api/radio/:videoId');
  const { sessionId } = req.query;
  const { videoId } = req.params;
  
  console.log('[API] Params:', { sessionId, videoId });
  
  if (!sessionId) {
    console.error('[API] ✗ No sessionId provided');
    return res.status(400).json({ error: 'sessionId required' });
  }
  
  const session = getSession(sessionId);
  
  if (!session.services.youtubeMusic) {
    console.error('[API] ✗ YouTube Music not connected');
    return res.status(404).json({ error: 'YouTube Music not connected' });
  }
  
  try {
    console.log(`[API] Getting radio recommendations for ${videoId}`);
    const radioTracks = await session.services.youtubeMusic.getRadio(videoId);
    console.log(`[API] ✓ Returning ${radioTracks.length} radio tracks`);
    res.json({ tracks: radioTracks });
  } catch (error) {
    console.error('[API] ✗ Error getting radio:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/profiles/:service', authenticate, async (req, res) => {
  console.log('[API] GET /api/profiles/:service');
  const { sessionId } = req.query;
  const { service } = req.params;
  
  console.log('[API] Params:', { sessionId, service });
  
  if (!sessionId) {
    console.error('[API] ✗ No sessionId provided');
    return res.status(400).json({ error: 'sessionId required' });
  }
  
  const session = getSession(sessionId);

  if (!session.services[service]) {
    console.error(`[API] ✗ Service ${service} not connected`);
    return res.status(404).json({ error: 'Service not connected' });
  }

  try {
    console.log(`[API] Getting profiles for ${service}`);
    const profiles = await session.services[service].getProfiles();
    console.log(`[API] ✓ Returning ${profiles.length} profiles`);
    res.json({ profiles });
  } catch (error) {
    console.error('[API] ✗ Error getting profiles:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
  }
});

// YouTube Music streaming proxy endpoint
app.get('/api/stream/youtube/:videoId', authenticate, async (req, res) => {
  const { videoId } = req.params;
  console.log(`[Stream] YouTube stream request for: ${videoId}`);
  
  const cacheKey = `stream:${videoId}`;
  
  try {
    let streamUrl = cache.get(cacheKey);
    
    if (!streamUrl) {
      console.log(`[Stream] Getting stream URL for ${videoId}...`);
      const youtube = await getYouTubeClient();
      
      const info = await youtube.getInfo(videoId, 'YTMUSIC');
      
      const format = info.chooseFormat({ 
        type: 'audio',
        quality: 'best'
      });
      
      if (!format) {
        console.error('[Stream] ✗ No audio format available');
        return res.status(404).json({ error: 'No audio format available' });
      }
      
      streamUrl = format.decipher(youtube.session.player);
      cache.set(cacheKey, streamUrl, 3600);
      console.log('[Stream] ✓ Stream URL obtained and cached');
    } else {
      console.log('[Stream] ✓ Using cached stream URL');
    }
    
    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    const range = req.headers.range;
    
    if (range) {
      console.log('[Stream] Range request:', range);
      const response = await fetch(streamUrl, { headers: { Range: range } });
      
      res.status(206);
      res.setHeader('Content-Range', response.headers.get('content-range'));
      res.setHeader('Content-Length', response.headers.get('content-length'));
      
      const reader = response.body.getReader();
      const pump = async () => {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        if (!res.write(value)) {
          await new Promise(resolve => res.once('drain', resolve));
        }
        return pump();
      };
      await pump();
    } else {
      console.log('[Stream] Full file request');
      const response = await fetch(streamUrl);
      
      if (response.headers.get('content-length')) {
        res.setHeader('Content-Length', response.headers.get('content-length'));
      }
      
      const reader = response.body.getReader();
      const pump = async () => {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        if (!res.write(value)) {
          await new Promise(resolve => res.once('drain', resolve));
        }
        return pump();
      };
      await pump();
    }
    
    console.log('[Stream] ✓ Stream completed');
    
  } catch (error) {
    console.error('[Stream] ✗ Error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to stream audio', details: error.message });
  }
});

// Session cleanup - remove sessions older than 1 hour
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastAccess > oneHour) {
      console.log(`[Cleanup] Removing stale session: ${sessionId}`);
      sessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

app.listen(PORT, async () => {
  console.log('='.repeat(60));
  console.log(`Universal Music Aggregator - http://localhost:${PORT}`);
  console.log('='.repeat(60));
  console.log('Environment:');
  console.log(`  SERVER_PASSWORD: ${process.env.SERVER_PASSWORD ? '✓ Set' : '✗ Not set'}`);
  console.log(`  YOUTUBE_MUSIC_COOKIE: ${process.env.YOUTUBE_MUSIC_COOKIE ? `✓ Set (${process.env.YOUTUBE_MUSIC_COOKIE.length} chars)` : '✗ Not set'}`);
  console.log(`  YOUTUBE_MUSIC_PROFILE: ${process.env.YOUTUBE_MUSIC_PROFILE || '0 (default)'}`);
  console.log(`  CACHE_TTL: ${process.env.CACHE_TTL || 600}s`);
  console.log(`  CORS_ORIGIN: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log('='.repeat(60));
  console.log('Features:');
  console.log('  ✓ Auto-connect YouTube Music from env cookie');
  console.log('  ✓ Session persistence');
  console.log('  ✓ Automatic session cleanup (1 hour)');
  console.log('='.repeat(60));
  console.log('Endpoints:');
  console.log('  GET  /health');
  console.log('  POST /api/services/connect');
  console.log('  GET  /api/tracks?sessionId=xxx');
  console.log('  GET  /api/albums?sessionId=xxx');
  console.log('  GET  /api/playlists?sessionId=xxx');
  console.log('  GET  /api/artists?sessionId=xxx');
  console.log('  GET  /api/search?sessionId=xxx&q=query');
  console.log('  GET  /api/recommendations?sessionId=xxx');
  console.log('  GET  /api/stream/youtube/:videoId');
  console.log('='.repeat(60));

  // Log available YouTube Music profiles
  await logAvailableYouTubeProfiles();
});
