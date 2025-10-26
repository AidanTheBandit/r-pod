# API Keys Reference

## 🔑 Understanding API Keys in R-Pod

This document explains the different types of API keys used in R-Pod and their security implications.

---

## YouTube InnerTube API Keys

### What are they?

The YouTube InnerTube API keys found in the codebase are **public client API keys** extracted from YouTube's web, Android, and iOS clients. These are:

1. **Not secret** - They're embedded in public YouTube clients
2. **Safe to commit** - They're meant to be used by client applications
3. **Rate-limited per IP** - YouTube limits usage per IP, not per key
4. **Fallback values** - Used if custom keys aren't provided

### Default Keys

```python
# backend-python/services/innertube_streaming_service.py
DEFAULT_API_KEYS = {
    "WEB_REMIX": "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30",
    "ANDROID_MUSIC": "AIzaSyAOghZGza2MQSZkY_zfZ370N-PUdXEo8AI",
    "IOS_MUSIC": "AIzaSyBAETezhkwP0ZWA02RsqT1zu78Fpt0bC_s",
    "TVHTML5": "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
}
```

### How they're used

```python
# Priority: Environment variable → Default fallback
api_key = os.getenv("YOUTUBE_INNERTUBE_API_KEY_WEB") or DEFAULT_API_KEY
```

### Do you need custom keys?

**No, in most cases.** The default keys work fine for personal use. Only override if:

- You're hitting rate limits (unlikely for personal use)
- You want to separate traffic for analytics
- You're running a high-traffic public instance

### Setting custom keys (optional)

If you want to use your own InnerTube API keys:

```bash
# In backend-python/.env
YOUTUBE_INNERTUBE_API_KEY_WEB=your-custom-web-key
YOUTUBE_INNERTUBE_API_KEY_ANDROID=your-custom-android-key
YOUTUBE_INNERTUBE_API_KEY_IOS=your-custom-ios-key
```

**Note:** These are different from YouTube Data API v3 keys. InnerTube keys are client-side keys extracted from YouTube's apps.

---

## Service-Specific API Keys

### YouTube Music Authentication

**Type:** Cookie-based authentication OR OAuth  
**Location:** `.env` or `headers_auth.json`  
**Required:** Yes (for YouTube Music features)  
**Secret:** Yes - User-specific, don't share

```bash
# Option 1: Cookie (in .env)
YOUTUBE_MUSIC_COOKIE=your-browser-cookie

# Option 2: OAuth (in headers_auth.json)
# Created via: ytmusicapi oauth
```

### Spotify

**Type:** OAuth Client Credentials  
**Location:** `.env`  
**Required:** Optional (only if using Spotify)  
**Secret:** Yes - App-specific credentials

```bash
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
```

**Get yours at:** https://developer.spotify.com/dashboard

### Jellyfin

**Type:** API Key  
**Location:** `.env`  
**Required:** Optional (only if using Jellyfin)  
**Secret:** Yes - Server admin key

```bash
JELLYFIN_API_KEY=your-api-key
```

**Create in:** Jellyfin Dashboard → API Keys

---

## Security Classification

| Key Type | Public | Commit to Git | Share | Notes |
|----------|--------|---------------|-------|-------|
| YouTube InnerTube (default) | ✅ Yes | ✅ Yes | ✅ Yes | Public client keys |
| YouTube InnerTube (custom) | ❌ No | ❌ No | ❌ No | If you create custom ones |
| YouTube Music Cookie | ❌ No | ❌ No | ❌ No | Personal authentication |
| YouTube OAuth (`headers_auth.json`) | ❌ No | ❌ No | ❌ No | Personal authentication |
| Spotify Client Secret | ❌ No | ❌ No | ❌ No | App credentials |
| Jellyfin API Key | ❌ No | ❌ No | ❌ No | Server admin key |
| Server Password | ❌ No | ❌ No | ❌ No | Backend protection |

---

## Rate Limits

### YouTube InnerTube API

- **Limit:** ~10,000 requests per day per IP
- **Scope:** Per IP address, not per API key
- **Exceeded:** HTTP 429 errors, temporary block

**Mitigation:**
- Use proxies (see `proxy_config.py`)
- Implement request throttling
- Cache aggressively

### Spotify API

- **Limit:** Varies by endpoint
- **Typical:** 180 requests per minute
- **Exceeded:** HTTP 429 with `Retry-After` header

**Mitigation:**
- Built-in rate limiting in `spotipy` library
- Exponential backoff on errors

### Jellyfin API

- **Limit:** Generally none (self-hosted)
- **Depends:** On your server capacity

---

## Best Practices

### 1. Use Environment Variables

```bash
# ✅ Good - Environment variable
API_KEY = os.getenv("API_KEY")

# ❌ Bad - Hardcoded
API_KEY = "abc123secret"
```

### 2. Fallback to Defaults (for public keys)

```python
# ✅ Good - Fallback to public default
api_key = os.getenv("YOUTUBE_INNERTUBE_API_KEY") or DEFAULT_PUBLIC_KEY

# ❌ Bad - No fallback, crashes if not set
api_key = os.getenv("SECRET_KEY")  # Could be None
```

### 3. Never Log Secrets

```python
# ✅ Good - Mask secrets in logs
logger.info(f"API Key: {'✓ Set' if api_key else '✗ Not set'}")

# ❌ Bad - Logs secret value
logger.info(f"API Key: {api_key}")
```

### 4. Validate at Startup

```python
# ✅ Good - Check critical secrets at startup
if not settings.server_password or settings.server_password == "change-me":
    logger.error("SERVER_PASSWORD not configured!")
    sys.exit(1)
```

---

## FAQ

### Q: Are the YouTube InnerTube keys safe to commit?

**A:** Yes. These are public client-side API keys extracted from YouTube's official apps. They're designed to be embedded in client applications. However, user-specific cookies and OAuth tokens are **never** safe to commit.

### Q: Will YouTube block my IP if I use default keys?

**A:** Unlikely for personal use. Rate limits are per-IP, not per-key. If you're running a public instance with many users, consider implementing proxy rotation.

### Q: Do I need a YouTube Data API key?

**A:** No. R-Pod uses the InnerTube API (internal YouTube API), not the public YouTube Data API v3.

### Q: Can I share my Spotify Client ID?

**A:** The Client ID alone is semi-public (it's visible in browser requests), but you should **never share your Client Secret**.

### Q: How often should I rotate keys?

**A:** 
- **YouTube Music cookies:** Every 6-12 months (or when they expire)
- **Spotify credentials:** Every 6 months or when compromised
- **Server passwords:** Every 90 days
- **InnerTube API keys:** No need to rotate (public keys)

---

## Troubleshooting

### "Invalid API key" errors

1. **Check the key is set:**
   ```bash
   echo $YOUTUBE_INNERTUBE_API_KEY_WEB
   ```

2. **Verify no extra whitespace:**
   ```bash
   # Remove trailing whitespace
   YOUTUBE_INNERTUBE_API_KEY_WEB=AIzaSy...
   # Not: YOUTUBE_INNERTUBE_API_KEY_WEB=AIzaSy... 
   ```

3. **Use defaults:**
   ```bash
   # Just remove the env var to use defaults
   # unset YOUTUBE_INNERTUBE_API_KEY_WEB
   ```

### Rate limit errors (HTTP 429)

1. **Implement caching:**
   ```bash
   CACHE_TTL=3600  # Cache for 1 hour
   ```

2. **Enable proxy rotation:**
   ```bash
   PROXY_ENABLED=true
   PROXY_LIST=http://proxy1.com,http://proxy2.com
   ```

3. **Reduce request frequency:**
   - Use cached data when possible
   - Implement request throttling

---

**Last Updated:** October 26, 2025
