"""
Proxy Configuration for YouTube Streaming

IMPORTANT: Choose ONE of these options:

OPTION 1: Use Paid Proxy Service (RECOMMENDED for production)
=========================================================
Paid proxies are reliable, fast, and won't get you blocked.

Residential Proxies (Best for YouTube):
- BrightData: https://brightdata.com (~$8.40/GB, very reliable)
- Smartproxy: https://smartproxy.com (~$7/GB, good for streaming)
- Oxylabs: https://oxylabs.io (~$15/GB, premium quality)

Datacenter Proxies (Cheaper, less reliable):
- WebShare: https://www.webshare.io (~$2.99/month for 10 proxies)
- ProxyMesh: https://proxymesh.com (~$10/month)

OPTION 2: Use Free Proxies (NOT recommended)
============================================
Free proxies are slow, unreliable, and may log your traffic.
Only use for testing!

OPTION 3: No Proxies (Simplest)
===============================
Use Cobalt API which handles proxy management internally.
"""

# ========================================
# CONFIGURATION - EDIT THIS SECTION
# ========================================

# Option 1: Paid Proxy Configuration
# Uncomment and fill in your proxy service credentials

# BrightData Example:
# PROXY_LIST = [
#     "http://customer-YOUR_CUSTOMER_ID-zone-YOUR_ZONE:YOUR_PASSWORD@brd.superproxy.io:22225"
# ]

# Smartproxy Example:
# PROXY_LIST = [
#     "http://user-YOUR_USERNAME-sessionduration-10:YOUR_PASSWORD@gate.smartproxy.com:7000"
# ]

# WebShare Example (multiple datacenter proxies):
# PROXY_LIST = [
#     "http://YOUR_USERNAME:YOUR_PASSWORD@proxy.webshare.io:80",
#     "http://YOUR_USERNAME:YOUR_PASSWORD@proxy2.webshare.io:80",
#     "http://YOUR_USERNAME:YOUR_PASSWORD@proxy3.webshare.io:80",
# ]

# Option 2: Free Proxies (fetch from public sources)
# USE_FREE_PROXIES = True  # WARNING: Unreliable!

# Option 3: No proxies (use Cobalt API instead)
PROXY_LIST = []  # Empty list = no proxies
USE_FREE_PROXIES = False

# ========================================
# ADVANCED SETTINGS
# ========================================

# Proxy health check settings
PROXY_MAX_FAILURES = 5  # Remove proxy after this many failures
PROXY_HEALTH_CHECK_INTERVAL = 300  # Check proxy health every 5 minutes

# Request timeout settings
PROXY_TIMEOUT_SECONDS = 15  # Timeout for requests through proxy

# Rotation strategy
PROXY_ROTATION_STRATEGY = "round_robin"  # Options: round_robin, least_used, fastest

# Enable proxy statistics logging
PROXY_STATS_LOGGING = True
