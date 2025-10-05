import WebSocket from 'ws';
import { EventEmitter } from 'events';

/**
 * Lavalink Service
 * Handles communication with Lavalink server for audio streaming
 */
class LavalinkService extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
    this.players = new Map();
    
            // Lavalink configuration - using public server
    this.config = {
      host: 'lavalink.dev.darrennathanael.com',
      port: 80,
      password: 'youshallnotpass',
      secure: false,
    };
  }

  /**
   * Connect to Lavalink server
   */
  async connect() {
    const protocol = this.config.secure ? 'wss' : 'ws';
    const url = `${protocol}://${this.config.host}:${this.config.port}`;
    
    console.log('[Lavalink] Connecting to public server:', url);
    
    try {
      this.ws = new WebSocket(url, [], {
        headers: {
          'Authorization': this.config.password,
          'User-Id': 'ipod-music-app',
          'Client-Name': 'iPod-Music-Aggregator/1.0',
        },
      });

      this.ws.on('open', () => {
        console.log('[Lavalink] ✓ Connected successfully');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('[Lavalink] Failed to parse message:', error);
        }
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[Lavalink] Connection closed: ${code} - ${reason}`);
        this.connected = false;
        this.handleDisconnect();
      });

      this.ws.on('error', (error) => {
        console.error('[Lavalink] WebSocket error:', error.message);
      });

    } catch (error) {
      console.error('[Lavalink] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Handle incoming messages from Lavalink
   */
  handleMessage(message) {
    const { op, type, guildId } = message;

    switch (op) {
      case 'ready':
        console.log('[Lavalink] Server ready, session:', message.sessionId);
        break;
      
      case 'playerUpdate':
        // Player position update
        this.emit('playerUpdate', { guildId, state: message.state });
        break;
      
      case 'stats':
        // Server stats
        this.emit('stats', message);
        break;
      
      case 'event':
        this.handleEvent(message);
        break;
      
      default:
        console.log('[Lavalink] Unknown message:', message);
    }
  }

  /**
   * Handle Lavalink events
   */
  handleEvent(event) {
    const { type, guildId } = event;

    switch (type) {
      case 'TrackStartEvent':
        console.log('[Lavalink] Track started:', event.track);
        this.emit('trackStart', { guildId, track: event.track });
        break;
      
      case 'TrackEndEvent':
        console.log('[Lavalink] Track ended:', event.reason);
        this.emit('trackEnd', { guildId, reason: event.reason });
        break;
      
      case 'TrackExceptionEvent':
        console.error('[Lavalink] Track exception:', event.exception);
        this.emit('trackException', { guildId, exception: event.exception });
        break;
      
      case 'TrackStuckEvent':
        console.error('[Lavalink] Track stuck:', event.thresholdMs);
        this.emit('trackStuck', { guildId, thresholdMs: event.thresholdMs });
        break;
      
      case 'WebSocketClosedEvent':
        console.log('[Lavalink] WebSocket closed:', event.reason);
        break;
    }
  }

  /**
   * Handle disconnection and attempt reconnect
   */
  handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[Lavalink] Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectDelay);
    } else {
      console.error('[Lavalink] Max reconnection attempts reached');
      this.emit('disconnected');
    }
  }

  /**
   * Load tracks from Lavalink
   */
  async loadTracks(identifier) {
    const protocol = this.config.secure ? 'https' : 'http';
    const url = `${protocol}://${this.config.host}:${this.config.port}/v4/loadtracks?identifier=${encodeURIComponent(identifier)}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': this.config.password,
        },
      });

      if (!response.ok) {
        throw new Error(`Lavalink returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Lavalink] Failed to load tracks:', error);
      throw error;
    }
  }

  /**
   * Search for tracks
   */
  async search(query, source = 'ytsearch') {
    const identifier = `${source}:${query}`;
    console.log('[Lavalink] Searching:', identifier);
    
    const result = await this.loadTracks(identifier);
    
    if (result.loadType === 'empty' || result.loadType === 'error') {
      console.log('[Lavalink] No results found');
      return [];
    }

    return result.data || [];
  }

  /**
   * Get stream URL for a YouTube video
   */
  async getStreamUrl(videoId) {
    console.log('[Lavalink] Getting stream URL for:', videoId);
    
    // Try YouTube Music first, fallback to regular YouTube
    const identifiers = [
      `https://music.youtube.com/watch?v=${videoId}`,
      `https://www.youtube.com/watch?v=${videoId}`,
      `ytsearch:${videoId}`,
    ];

    for (const identifier of identifiers) {
      try {
        const result = await this.loadTracks(identifier);
        
        if (result.loadType === 'track' && result.data) {
          console.log('[Lavalink] ✓ Track loaded:', result.data.info.title);
          return result.data;
        }
        
        if (result.loadType === 'search' && result.data && result.data.length > 0) {
          console.log('[Lavalink] ✓ Track found via search:', result.data[0].info.title);
          return result.data[0];
        }
      } catch (error) {
        console.log(`[Lavalink] Failed with ${identifier}:`, error.message);
        continue;
      }
    }

    throw new Error('Track not found or unavailable');
  }

  /**
   * Send command to Lavalink
   */
  send(data) {
    if (!this.connected || !this.ws) {
      console.error('[Lavalink] Cannot send - not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('[Lavalink] Failed to send:', error);
      return false;
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Close connection
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
      console.log('[Lavalink] Disconnected');
    }
  }
}

// Export singleton instance
export default new LavalinkService();
