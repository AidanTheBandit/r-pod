"""
Proxy Manager for YouTube Streaming
Handles rotating proxies to avoid bot detection and rate limits
"""
import logging
import random
import asyncio
from typing import List, Optional, Dict, Any
import aiohttp
from dataclasses import dataclass
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

@dataclass
class ProxyInfo:
    """Information about a proxy"""
    url: str
    protocol: str  # http, https, socks5
    failures: int = 0
    last_used: Optional[datetime] = None
    last_success: Optional[datetime] = None
    avg_response_time: float = 0.0
    
    @property
    def is_healthy(self) -> bool:
        """Check if proxy is healthy enough to use"""
        # Too many recent failures
        if self.failures > 5:
            return False
        
        # No recent success in last 5 minutes
        if self.last_success:
            if datetime.now() - self.last_success > timedelta(minutes=5):
                return False
        
        return True


class ProxyManager:
    """
    Manages a pool of rotating proxies for YouTube requests
    
    Proxy sources you can use:
    1. Free proxy lists (unreliable but free)
    2. Residential proxy services (reliable, paid)
       - BrightData: https://brightdata.com
       - Smartproxy: https://smartproxy.com
       - Oxylabs: https://oxylabs.io
    3. Datacenter proxies (cheap, medium reliability)
       - ProxyMesh: https://proxymesh.com
       - WebShare: https://www.webshare.io
    """
    
    def __init__(self, proxies: List[str] = None):
        """
        Initialize proxy manager
        
        Args:
            proxies: List of proxy URLs in format:
                     - http://host:port
                     - http://user:pass@host:port
                     - socks5://host:port
        """
        self.proxies: List[ProxyInfo] = []
        self._load_proxies(proxies or [])
        self._lock = asyncio.Lock()
    
    def _load_proxies(self, proxy_urls: List[str]):
        """Load proxies from URL list"""
        for url in proxy_urls:
            # Determine protocol
            if url.startswith('socks5://'):
                protocol = 'socks5'
            elif url.startswith('https://'):
                protocol = 'https'
            else:
                protocol = 'http'
            
            self.proxies.append(ProxyInfo(
                url=url,
                protocol=protocol
            ))
        
        logger.info(f"[ProxyManager] Loaded {len(self.proxies)} proxies")
    
    async def get_proxy(self) -> Optional[ProxyInfo]:
        """
        Get the next available healthy proxy using round-robin with health checks
        """
        async with self._lock:
            # Filter healthy proxies
            healthy_proxies = [p for p in self.proxies if p.is_healthy]
            
            if not healthy_proxies:
                logger.warning("[ProxyManager] No healthy proxies available!")
                return None
            
            # Sort by:
            # 1. Least recently used
            # 2. Lowest failure count
            # 3. Fastest response time
            healthy_proxies.sort(key=lambda p: (
                p.last_used or datetime.min,
                p.failures,
                p.avg_response_time
            ))
            
            # Get the best proxy
            proxy = healthy_proxies[0]
            proxy.last_used = datetime.now()
            
            return proxy
    
    async def mark_success(self, proxy: ProxyInfo, response_time: float):
        """Mark proxy as successful"""
        async with self._lock:
            proxy.last_success = datetime.now()
            proxy.failures = max(0, proxy.failures - 1)  # Reduce failure count on success
            
            # Update average response time (exponential moving average)
            if proxy.avg_response_time == 0:
                proxy.avg_response_time = response_time
            else:
                proxy.avg_response_time = 0.7 * proxy.avg_response_time + 0.3 * response_time
            
            logger.debug(f"[ProxyManager] Proxy success: {proxy.url} ({response_time:.2f}s)")
    
    async def mark_failure(self, proxy: ProxyInfo, error: str):
        """Mark proxy as failed"""
        async with self._lock:
            proxy.failures += 1
            logger.warning(f"[ProxyManager] Proxy failure #{proxy.failures}: {proxy.url} - {error}")
            
            # If too many failures, temporarily disable
            if proxy.failures > 10:
                logger.error(f"[ProxyManager] Disabling proxy due to too many failures: {proxy.url}")
    
    async def test_proxy(self, proxy: ProxyInfo) -> bool:
        """Test if a proxy is working"""
        try:
            start = datetime.now()
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    'https://www.youtube.com',
                    proxy=proxy.url,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    success = resp.status == 200
                    
                    if success:
                        response_time = (datetime.now() - start).total_seconds()
                        await self.mark_success(proxy, response_time)
                    
                    return success
        except Exception as e:
            await self.mark_failure(proxy, str(e))
            return False
    
    async def test_all_proxies(self):
        """Test all proxies and log results"""
        logger.info("[ProxyManager] Testing all proxies...")
        
        tasks = [self.test_proxy(proxy) for proxy in self.proxies]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        working = sum(1 for r in results if r is True)
        logger.info(f"[ProxyManager] Test complete: {working}/{len(self.proxies)} proxies working")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about proxy pool"""
        healthy = [p for p in self.proxies if p.is_healthy]
        
        return {
            "total_proxies": len(self.proxies),
            "healthy_proxies": len(healthy),
            "unhealthy_proxies": len(self.proxies) - len(healthy),
            "avg_response_time": sum(p.avg_response_time for p in healthy) / len(healthy) if healthy else 0,
            "proxies": [
                {
                    "url": p.url[:50] + "..." if len(p.url) > 50 else p.url,
                    "failures": p.failures,
                    "last_success": p.last_success.isoformat() if p.last_success else None,
                    "response_time": f"{p.avg_response_time:.2f}s",
                    "healthy": p.is_healthy
                }
                for p in self.proxies
            ]
        }


# Free proxy sources (for testing - not recommended for production)
async def fetch_free_proxies() -> List[str]:
    """
    Fetch free proxies from public sources
    WARNING: Free proxies are unreliable, slow, and may log your traffic
    Use only for testing!
    """
    proxies = []
    
    # Try multiple free proxy sources
    sources = [
        "https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all",
        "https://www.proxy-list.download/api/v1/get?type=http",
    ]
    
    async with aiohttp.ClientSession() as session:
        for source in sources:
            try:
                async with session.get(source, timeout=10) as resp:
                    if resp.status == 200:
                        text = await resp.text()
                        # Parse proxy list (one per line: IP:PORT)
                        for line in text.strip().split('\n'):
                            if ':' in line:
                                proxies.append(f"http://{line.strip()}")
            except Exception as e:
                logger.warning(f"[ProxyManager] Failed to fetch from {source}: {e}")
    
    logger.info(f"[ProxyManager] Fetched {len(proxies)} free proxies")
    return proxies


# Example configuration for paid proxy services
PROXY_SERVICE_EXAMPLES = {
    "brightdata": {
        "url": "http://customer-{customer_id}-zone-{zone_name}:{password}@brd.superproxy.io:22225",
        "note": "Residential proxies, very reliable"
    },
    "smartproxy": {
        "url": "http://user-{username}-sessionduration-10:{password}@gate.smartproxy.com:7000",
        "note": "Residential proxies with session control"
    },
    "webshare": {
        "url": "http://{username}:{password}@proxy.webshare.io:80",
        "note": "Cheap datacenter proxies"
    },
    "proxymesh": {
        "url": "http://{username}:{password}@us-wa.proxymesh.com:31280",
        "note": "US-based datacenter proxies"
    }
}
