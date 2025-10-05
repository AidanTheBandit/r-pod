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

    this.nodes = this.loadNodes();
    this.currentNodeIndex = -1;
    this.rejectUnauthorized = process.env.LAVALINK_REJECT_UNAUTHORIZED !== 'false';
  }

  loadNodes() {
    try {
      if (process.env.LAVALINK_NODES) {
        const parsed = JSON.parse(process.env.LAVALINK_NODES);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((node, idx) => ({
            host: node.host,
            port: Number(node.port) || 2333,
            password: node.password || 'youshallnotpass',
            secure: !!node.secure,
            label: node.label || `node-${idx + 1}`
          })).filter(node => node.host);
        }
      }
    } catch (error) {
      console.error('[Lavalink] Failed to parse LAVALINK_NODES env:', error.message);
    }

    const envHost = process.env.LAVALINK_HOST || 'localhost';
    const envPort = Number(process.env.LAVALINK_PORT) || 2333;
    const envPassword = process.env.LAVALINK_PASSWORD || 'music-aggregator-2025';
    const envSecure = process.env.LAVALINK_SECURE === 'true';

    const nodes = [
      {
        host: envHost,
        port: envPort,
        password: envPassword,
        secure: envSecure,
        label: 'primary-env'
      }
    ];

    if (!process.env.LAVALINK_HOST) {
      nodes.push(
        {
          host: 'localhost',
          port: 2333,
          password: 'music-aggregator-2025',
          secure: false,
          label: 'local-default'
        },
        {
          host: 'lavalink.dev.darrennathanael.com',
          port: 80,
          password: 'youshallnotpass',
          secure: false,
          label: 'public-darrennathanael'
        },
        {
          host: 'freelavalink.serenetia.com',
          port: 2333,
          password: 'youshallnotpass',
          secure: false,
          label: 'public-serenetia'
        }
      );
    }

    return nodes;
  }

  get currentNode() {
    if (this.currentNodeIndex < 0 || this.currentNodeIndex >= this.nodes.length) {
      return null;
    }
    return this.nodes[this.currentNodeIndex];
  }

  async pickNextNode() {
    if (!this.nodes.length) {
      throw new Error('No Lavalink nodes configured');
    }

    const initialIndex = this.currentNodeIndex;

    for (let attempts = 0; attempts < this.nodes.length; attempts++) {
      this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
      const node = this.currentNode;
      if (!node) {
        continue;
      }

      const healthy = await this.checkNodeHealth(node).catch(() => false);
      if (healthy) {
        console.log('[Lavalink] Selected node:', node.label, `${node.host}:${node.port}`);
        return node;
      }

      console.warn('[Lavalink] Node unhealthy, skipping:', node.label);

      if (this.currentNodeIndex === initialIndex) {
        break;
      }
    }

    throw new Error('No healthy Lavalink nodes available');
  }

  async checkNodeHealth(node) {
    const protocol = node.secure ? 'https' : 'http';
    const url = `${protocol}://${node.host}:${node.port}/v4/info`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(url, {
        headers: { Authorization: node.password },
        signal: controller.signal
      });
      return response.ok;
    } catch (error) {
      console.warn('[Lavalink] Health check failed for node', node.label, error.message);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Connect to Lavalink server
   */
  async connect() {
    try {
      const node = await this.pickNextNode();
      await this.connectToNode(node);

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
      console.error('[Lavalink] Connection failed:', error.message || error);
      throw error;
    }
  }

  async connectToNode(node) {
    const protocol = node.secure ? 'wss' : 'ws';
    const url = `${protocol}://${node.host}:${node.port}`;

    console.log('[Lavalink] Connecting to node:', node.label, url);

    this.ws = new WebSocket(url, {
      headers: {
        Authorization: node.password,
        'User-Id': 'ipod-music-app',
        'Client-Name': 'iPod-Music-Aggregator/1.0'
      },
      rejectUnauthorized: this.rejectUnauthorized
    });
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
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Lavalink] Max reconnection attempts reached');
      this.emit('disconnected');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[Lavalink] Reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);

    setTimeout(async () => {
      try {
        await this.connect();
        this.reconnectAttempts = 0;
      } catch (error) {
        console.error('[Lavalink] Reconnect attempt failed:', error.message);
        this.handleDisconnect();
      }
    }, this.reconnectDelay);
  }

  /**
   * Load tracks from Lavalink
   */
  async loadTracks(identifier) {
    const node = this.currentNode || await this.pickNextNode();
    const protocol = node.secure ? 'https' : 'http';
    const url = `${protocol}://${node.host}:${node.port}/v4/loadtracks?identifier=${encodeURIComponent(identifier)}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: node.password,
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
