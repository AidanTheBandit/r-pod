"""
YouTube Music Service Aggregator
Uses ytmusicapi for superior YouTube Music support with proper authentication
"""
from typing import List, Dict, Any, Optional
import logging
from ytmusicapi import YTMusic
import os
import tempfile
import hashlib
import time

from .base_music_service import BaseMusicService

logger = logging.getLogger(__name__)

class YouTubeMusicAggregator(BaseMusicService):
    """YouTube Music service using ytmusicapi with proper cookie authentication"""
    
    def __init__(self, credentials: Dict[str, Any]):
        """
        Initialize YouTube Music service
        
        Args:
            credentials: Dictionary with 'cookie' and optional 'profile', 'brand_account_id'
        """
        super().__init__(credentials)
        self.ytm: Optional[YTMusic] = None
        self.cookie = credentials.get("cookie")
        self.profile = credentials.get("profile", "1")
        self.brand_account_id = credentials.get("brand_account_id")
        self.cookie_file = None
        
    def _create_cookie_file(self):
        """Create a temporary cookie file for ytmusicapi"""
        try:
            self.cookie_file = tempfile.NamedTemporaryFile(
                mode='w', 
                suffix='.txt',
                delete=False
            )
            
            # Write cookies in simple format for ytmusicapi
            self.cookie_file.write(self.cookie)
            self.cookie_file.close()
            
            logger.info(f"[YTM] Created cookie file: {self.cookie_file.name}")
            return self.cookie_file.name
            
        except Exception as e:
            logger.error(f"[YTM] Failed to create cookie file: {e}")
            return None
        
    def _create_proper_cookie_file(self):
        """Create a proper JSON headers file for ytmusicapi"""
        try:
            self.cookie_file = tempfile.NamedTemporaryFile(
                mode='w', 
                suffix='.json',
                delete=False
            )
            
            # Parse cookies for SAPISID
            cookies = {}
            for cookie_pair in self.cookie.split('; '):
                if '=' in cookie_pair:
                    name, value = cookie_pair.split('=', 1)
                    cookies[name] = value
            
            # Create comprehensive headers in JSON format that ytmusicapi expects
            headers = {
                "Cookie": self.cookie,
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Origin": "https://music.youtube.com",
                "Referer": "https://music.youtube.com/",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "same-origin",
                "Sec-Fetch-Site": "same-origin",
                "sec-ch-ua": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                "sec-ch-ua-arch": '"arm"',
                "sec-ch-ua-bitness": '"64"',
                "sec-ch-ua-form-factors": '"Desktop"',
                "sec-ch-ua-full-version": '"140.0.7339.186"',
                "sec-ch-ua-full-version-list": '"Chromium";v="140.0.7339.186", "Not=A?Brand";v="24.0.0.0", "Google Chrome";v="140.0.7339.186"',
                "sec-ch-ua-mobile": '?0',
                "sec-ch-ua-model": '""',
                "sec-ch-ua-platform": '"macOS"',
                "sec-ch-ua-platform-version": '"26.0.1"',
                "sec-ch-ua-wow64": '?0',
                "X-Goog-AuthUser": self.profile,
                "X-Goog-PageId": "account-chooser",
                "X-Goog-Visitor-Id": "CgtQU3JVTUNmejVKYyjOsIvHBjIKCgJVUxIEGgAgJA%3D%3D",
                "X-Origin": "https://music.youtube.com",
                "X-Client-Data": "CMTaygE=",
                "X-YouTube-Bootstrap-Logged-In": "true",
                "X-YouTube-Client-Name": "67",
                "X-YouTube-Client-Version": "1.20250929.03.00",
                "Priority": "u=1, i"
            }
            
            # Add SAPISID authentication
            if 'SAPISID' in cookies or '__Secure-3PAPISID' in cookies:
                import hashlib
                import time
                
                sapisid = cookies.get('__Secure-3PAPISID') or cookies.get('SAPISID')
                if sapisid:
                    timestamp = str(int(time.time()))
                    origin = 'https://music.youtube.com'
                    
                    hash_input = f"{timestamp} {sapisid} {origin}"
                    sapisid_hash = hashlib.sha1(hash_input.encode()).hexdigest()
                    
                    headers['Authorization'] = f'SAPISIDHASH {timestamp}_{sapisid_hash}'
            
            # Write as JSON
            import json
            json.dump(headers, self.cookie_file, indent=2)
            self.cookie_file.close()
            
            logger.info(f"[YTM] Created proper JSON headers file: {self.cookie_file.name}")
            return self.cookie_file.name
            
        except Exception as e:
            logger.error(f"[YTM] Failed to create proper JSON headers file: {e}")
            return None
        
    async def authenticate(self) -> bool:
        """Enhanced authentication with multiple fallback methods"""
        try:
            logger.info(f"[YTM] Starting authentication with multiple methods")

            if not self.cookie:
                logger.error("[YTM] No cookie provided")
                return False

            # Method 0: Try official ytmusicapi headers_auth.json first (most reliable for all endpoints)
            logger.info("[YTM] Method 0: Trying official ytmusicapi headers_auth.json")
            try:
                # Check if headers_auth.json exists in the current directory
                headers_auth_path = os.path.join(os.getcwd(), 'headers_auth.json')
                if os.path.exists(headers_auth_path):
                    logger.info(f"[YTM] Found headers_auth.json at {headers_auth_path}")
                    self.ytm = YTMusic(headers_auth_path, self.brand_account_id)
                    
                    # Test library endpoint first (most restrictive)
                    try:
                        test_library = await self._run_sync(self.ytm.get_library_songs, limit=1)
                        logger.info(f"[YTM] ✓ Official authentication successful - library endpoints work (found {len(test_library) if test_library else 0} songs)")
                        self.is_authenticated = True
                        return True
                    except Exception as lib_e:
                        logger.warning(f"[YTM] Library test failed with headers_auth.json: {lib_e}")
                        
                        # Fallback to home test
                        try:
                            test_home = await self._run_sync(self.ytm.get_home, limit=1)
                            if test_home and len(test_home) > 0:
                                logger.info(f"[YTM] ✓ Basic authentication successful with headers_auth.json - home endpoints work ({len(test_home)} sections)")
                                self.is_authenticated = True
                                return True
                        except Exception as home_e:
                            logger.warning(f"[YTM] Home test also failed with headers_auth.json: {home_e}")
                else:
                    logger.info("[YTM] headers_auth.json not found, trying other methods")
            except Exception as e:
                logger.warning(f"[YTM] Official headers_auth.json method failed: {e}")

            # Method 1: Try proper ytmusicapi JSON headers format (most reliable for all endpoints)
            logger.info("[YTM] Method 1: Trying proper ytmusicapi JSON headers format")
            try:
                headers_file_path = self._create_proper_cookie_file()
                if headers_file_path:
                    self.ytm = YTMusic(headers_file_path, self.brand_account_id)
                    
                    # Test library endpoint first (most restrictive)
                    try:
                        test_library = await self._run_sync(self.ytm.get_library_songs, limit=1)
                        logger.info(f"[YTM] ✓ Full authentication successful - library endpoints work (found {len(test_library) if test_library else 0} songs)")
                        self.is_authenticated = True
                        return True
                    except Exception as lib_e:
                        logger.warning(f"[YTM] Library test failed: {lib_e}")
                        
                        # Fallback to home test
                        try:
                            test_home = await self._run_sync(self.ytm.get_home, limit=1)
                            if test_home and len(test_home) > 0:
                                logger.info(f"[YTM] ✓ Basic authentication successful - home endpoints work ({len(test_home)} sections)")
                                self.is_authenticated = True
                                return True
                        except Exception as home_e:
                            logger.warning(f"[YTM] Home test also failed: {home_e}")
            except Exception as e:
                logger.warning(f"[YTM] JSON headers method failed: {e}")

            # Method 2: Try cookie file method (most reliable)
            logger.info("[YTM] Method 2: Trying cookie file authentication")
            try:
                cookie_file_path = self._create_cookie_file()
                if cookie_file_path:
                    self.ytm = YTMusic(cookie_file_path, self.brand_account_id)

                    # Test authentication with library endpoint first
                    try:
                        test_library = await self._run_sync(self.ytm.get_library_songs, limit=1)
                        if test_library is not None:
                            logger.info(f"[YTM] ✓ Cookie file auth successful - library endpoints work")
                            self.is_authenticated = True
                            return True
                    except Exception as lib_e:
                        logger.warning(f"[YTM] Library test failed, trying home: {lib_e}")

                    # Fallback to home test
                    test_home = await self._run_sync(self.ytm.get_home, limit=1)
                    if test_home and len(test_home) > 0:
                        first_section = test_home[0].get("title", "").lower()
                        personal_indicators = ['quick pick', 'listen again', 'mixed for you', 'your']
                        is_personal = any(indicator in first_section for indicator in personal_indicators)

                        if is_personal:
                            logger.info(f"[YTM] ✓ Cookie file auth successful - got section: {test_home[0].get('title')}")
                        else:
                            logger.warning(f"[YTM] ⚠ Cookie file auth successful but content may not be personal - got section: {test_home[0].get('title')}")

                        self.is_authenticated = True
                        return True
            except Exception as e:
                logger.warning(f"[YTM] Cookie file method failed: {e}")

            # Method 3: Try manual header setup with compression handling
            logger.info("[YTM] Method 3: Trying manual headers with compression handling")
            try:
                # Try account 1 first (brand account), then fallback to account 0
                for auth_user in ["1", "0"]:
                    logger.info(f"[YTM] Trying account index: {auth_user}")

                    self.ytm = YTMusic(None, self.brand_account_id)

                    # Parse cookies for SAPISID
                    cookies = {}
                    for cookie_pair in self.cookie.split('; '):
                        if '=' in cookie_pair:
                            name, value = cookie_pair.split('=', 1)
                            cookies[name] = value

                    # Create comprehensive browser-like headers matching the working curl
                    headers = {
                        'Cookie': self.cookie,
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
                        'Accept': '*/*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Origin': 'https://music.youtube.com',
                        'Referer': 'https://music.youtube.com/',
                        'Sec-Fetch-Dest': 'empty',
                        'Sec-Fetch-Mode': 'same-origin',
                        'Sec-Fetch-Site': 'same-origin',
                        'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                        'sec-ch-ua-arch': '"arm"',
                        'sec-ch-ua-bitness': '"64"',
                        'sec-ch-ua-form-factors': '"Desktop"',
                        'sec-ch-ua-full-version': '"140.0.7339.186"',
                        'sec-ch-ua-full-version-list': '"Chromium";v="140.0.7339.186", "Not=A?Brand";v="24.0.0.0", "Google Chrome";v="140.0.7339.186"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-model': '""',
                        'sec-ch-ua-platform': '"macOS"',
                        'sec-ch-ua-platform-version': '"26.0.1"',
                        'sec-ch-ua-wow64': '?0',
                        'X-Goog-AuthUser': auth_user,
                        'X-Goog-PageId': 'account-chooser',
                        'X-Goog-Visitor-Id': 'CgtkUUNUWjk4M0o5VSi7p4rHBjIKCgJVUxIEGgAgJA%3D%3D',
                        'X-Origin': 'https://music.youtube.com',
                        'X-Client-Data': 'CMTaygE=',
                        'X-YouTube-Bootstrap-Logged-In': 'true',
                        'X-YouTube-Client-Name': '67',
                        'X-YouTube-Client-Version': '1.20250929.03.00',
                        'Priority': 'u=1, i'
                    }

                    # Add SAPISID authentication with all three hash types like in the working curl
                    if 'SAPISID' in cookies or '__Secure-3PAPISID' in cookies:
                        import hashlib
                        import time

                        sapisid = cookies.get('__Secure-3PAPISID') or cookies.get('SAPISID')
                        if sapisid:
                            timestamp = str(int(time.time()))
                            origin = 'https://music.youtube.com'

                            # Create SAPISID hash
                            hash_input = f"{timestamp} {sapisid} {origin}"
                            sapisid_hash = hashlib.sha1(hash_input.encode()).hexdigest()

                            # Add all three authorization headers like in the working curl
                            headers['Authorization'] = f'SAPISIDHASH {timestamp}_{sapisid_hash}'
                            headers['Sapisid1phash'] = f'SAPISID1PHASH {timestamp}_{sapisid_hash}'
                            headers['Sapisid3phash'] = f'SAPISID3PHASH {timestamp}_{sapisid_hash}'
                            logger.info(f"[YTM] Added SAPISID authentication for account {auth_user}")

                    # Set headers on ytmusic instance
                    if not hasattr(self.ytm, 'headers'):
                        self.ytm.headers = {}
                    self.ytm.headers.update(headers)

                    # Try to configure the underlying requests session to handle Brotli
                    if hasattr(self.ytm, '_session') and self.ytm._session:
                        try:
                            import brotli
                            self.ytm._session.headers.update(headers)
                            logger.info("[YTM] Updated session headers and Brotli is available")
                        except ImportError:
                            logger.warning("[YTM] Brotli library not available, compression may fail")

                    # Test authentication
                    test_home = await self._run_sync(self.ytm.get_home, limit=1)
                    if test_home and len(test_home) > 0:
                        first_section = test_home[0].get("title", "").lower()
                        personal_indicators = ['quick pick', 'listen again', 'mixed for you', 'your']
                        is_personal = any(indicator in first_section for indicator in personal_indicators)

                        if is_personal:
                            logger.info(f"[YTM] ✓ Personal authentication successful with account {auth_user} - got section: {test_home[0].get('title')}")
                            self.is_authenticated = True
                            return True
                        else:
                            logger.info(f"[YTM] Account {auth_user} authenticated but not personal - got section: {test_home[0].get('title')}")
                            # If this is account 1 and it's not personal, continue to account 0
                            if auth_user == "1":
                                logger.info("[YTM] Account 1 not personal, trying account 0...")
                                continue
                            else:
                                # Account 0 also not personal, but we'll use it anyway
                                self.is_authenticated = True
                                return True

                logger.warning("[YTM] Authentication test failed")
                return False

            except Exception as e:
                logger.warning(f"[YTM] Manual headers method failed: {e}")
                return False

            logger.error("[YTM] All authentication methods failed")
            self.is_authenticated = False
            return False

        except Exception as e:
            logger.error(f"[YTM] Authentication failed: {e}")
            self.is_authenticated = False
            return False
    
    async def debug_current_auth(self) -> None:
        """Debug the current authentication state and available accounts"""
        try:
            logger.info("[YTM] === DEBUGGING AUTHENTICATION ===")
            
            debug_info = await self.debug_authentication()
            
            logger.info(f"[YTM] Current profile: {debug_info.get('account_info', {}).get('current_profile')}")
            logger.info(f"[YTM] Available accounts: {debug_info.get('account_info', {}).get('available_accounts')}")
            logger.info(f"[YTM] Cookie length: {debug_info.get('cookie_length')}")
            
            # Show first few home sections
            home_sections = debug_info.get('home_sections', [])
            logger.info(f"[YTM] Home sections ({len(home_sections)}):")
            for i, section in enumerate(home_sections):
                logger.info(f"[YTM]   {i+1}. {section.get('title')} ({section.get('content_count')} items)")
            
            logger.info("[YTM] === END DEBUG ===")
            
        except Exception as e:
            logger.error(f"[YTM] Debug failed: {e}")
        """Debug method to check what account/region we're actually authenticated as"""
        if not self.is_authenticated:
            await self.authenticate()
        
        try:
            # Get account info
            logger.info("[YTM] Checking authentication details...")
            
            # Parse cookies to find account information
            cookies = {}
            for cookie_pair in self.cookie.split('; '):
                if '=' in cookie_pair:
                    name, value = cookie_pair.split('=', 1)
                    cookies[name] = value
            
            # Try to get account information from different sources
            account_info = {
                "current_profile": self.profile,
                "available_accounts": [],
                "cookie_accounts": []
            }
            
            # Check for multiple account indicators in cookies
            if 'LOGIN_INFO' in cookies:
                # LOGIN_INFO contains account information
                login_info = cookies['LOGIN_INFO']
                account_info["login_info_length"] = len(login_info)
                logger.info(f"[YTM] LOGIN_INFO cookie found (length: {len(login_info)})")
            
            # Try different account indices to see what's available
            for account_idx in range(5):  # Try accounts 0-4
                try:
                    logger.info(f"[YTM] Testing account index {account_idx}")
                    
                    # Create temporary YTM instance for this account
                    temp_ytm = YTMusic()
                    
                    # Parse cookies for SAPISID
                    temp_cookies = {}
                    for cookie_pair in self.cookie.split('; '):
                        if '=' in cookie_pair:
                            name, value = cookie_pair.split('=', 1)
                            temp_cookies[name] = value
                    
                    # Create headers for this account
                    temp_headers = {
                        'Cookie': self.cookie,
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
                        'Accept': '*/*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Origin': 'https://music.youtube.com',
                        'Referer': 'https://music.youtube.com/',
                        'Sec-Fetch-Dest': 'empty',
                        'Sec-Fetch-Mode': 'same-origin',
                        'Sec-Fetch-Site': 'same-origin',
                        'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                        'sec-ch-ua-arch': '"arm"',
                        'sec-ch-ua-bitness': '"64"',
                        'sec-ch-ua-form-factors': '"Desktop"',
                        'sec-ch-ua-full-version': '"140.0.7339.186"',
                        'sec-ch-ua-full-version-list': '"Chromium";v="140.0.7339.186", "Not=A?Brand";v="24.0.0.0", "Google Chrome";v="140.0.7339.186"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-model': '""',
                        'sec-ch-ua-platform': '"macOS"',
                        'sec-ch-ua-platform-version': '"26.0.1"',
                        'sec-ch-ua-wow64': '?0',
                        'X-Goog-AuthUser': str(account_idx),
                        'X-Goog-PageId': 'account-chooser',
                        'X-Goog-Visitor-Id': 'CgtkUUNUWjk4M0o5VSi7p4rHBjIKCgJVUxIEGgAgJA%3D%3D',
                        'X-Origin': 'https://music.youtube.com',
                        'X-Client-Data': 'CMTaygE=',
                        'X-YouTube-Bootstrap-Logged-In': 'true',
                        'X-YouTube-Client-Name': '67',
                        'X-YouTube-Client-Version': '1.20250929.03.00',
                        'Priority': 'u=1, i'
                    }
                    
                    # Add SAPISID authentication
                    if 'SAPISID' in temp_cookies or '__Secure-3PAPISID' in temp_cookies:
                        import hashlib
                        import time
                        
                        sapisid = temp_cookies.get('__Secure-3PAPISID') or temp_cookies.get('SAPISID')
                        if sapisid:
                            timestamp = str(int(time.time()))
                            origin = 'https://music.youtube.com'
                            
                            hash_input = f"{timestamp} {sapisid} {origin}"
                            sapisid_hash = hashlib.sha1(hash_input.encode()).hexdigest()
                            
                            temp_headers['Authorization'] = f'SAPISIDHASH {timestamp}_{sapisid_hash}'
                    
                    # Set headers
                    if not hasattr(temp_ytm, 'headers'):
                        temp_ytm.headers = {}
                    temp_ytm.headers.update(temp_headers)
                    
                    # Test this account
                    test_home = await self._run_sync(temp_ytm.get_home, limit=1)
                    if test_home and len(test_home) > 0:
                        first_section = test_home[0].get("title", "").lower()
                        account_info["available_accounts"].append({
                            "index": account_idx,
                            "first_section": first_section,
                            "sections_count": len(test_home)
                        })
                        logger.info(f"[YTM] Account {account_idx} available - first section: {first_section}")
                    else:
                        logger.info(f"[YTM] Account {account_idx} not available")
                        
                except Exception as e:
                    logger.warning(f"[YTM] Error testing account {account_idx}: {e}")
            
            # Test different endpoints to see what we get
            home = await self._run_sync(self.ytm.get_home, limit=2)
            
            debug_info = {
                "account_info": account_info,
                "home_sections": [
                    {
                        "title": section.get("title"),
                        "content_count": len(section.get("contents", [])),
                        "first_item_title": section.get("contents", [{}])[0].get("title") if section.get("contents") else None
                    }
                    for section in (home or [])[:5]  # First 5 sections
                ],
                "total_home_sections": len(home or []),
                "cookie_length": len(self.cookie) if self.cookie else 0,
                "headers": dict(self.ytm.headers) if hasattr(self.ytm, 'headers') else {}
            }
            
            logger.info(f"[YTM] Debug info: {debug_info}")
            return debug_info
            
        except Exception as e:
            logger.error(f"[YTM] Debug authentication failed: {e}")
            return {"error": str(e)}
    
    async def debug_current_auth(self) -> None:
        """Debug the current authentication state and available accounts"""
        try:
            logger.info("[YTM] === DEBUGGING AUTHENTICATION ===")
            
            debug_info = await self.debug_authentication()
            
            logger.info(f"[YTM] Current profile: {debug_info.get('account_info', {}).get('current_profile')}")
            logger.info(f"[YTM] Available accounts: {debug_info.get('account_info', {}).get('available_accounts')}")
            logger.info(f"[YTM] Cookie length: {debug_info.get('cookie_length')}")
            
            # Show first few home sections
            home_sections = debug_info.get('home_sections', [])
            logger.info(f"[YTM] Home sections ({len(home_sections)}):")
            for i, section in enumerate(home_sections):
                logger.info(f"[YTM]   {i+1}. {section.get('title')} ({section.get('content_count')} items)")
            
            logger.info("[YTM] === END DEBUG ===")
            
        except Exception as e:
            logger.error(f"[YTM] Debug failed: {e}")
    
    async def _check_account_setup(self) -> Dict[str, Any]:
        """Check if the YouTube Music account has been properly set up with music content"""
        try:
            home = await self._run_sync(self.ytm.get_home, limit=5)
            
            if not home:
                return {"setup": False, "reason": "No home content"}
            
            # Check for welcome/onboarding content
            welcome_indicators = [
                'pick your favorite artists',
                'try our quick start playlist', 
                'scan to download the youtube music mobile app',
                'taste builder'
            ]
            
            has_welcome_content = False
            has_music_content = False
            
            for section in home:
                contents = section.get("contents", [])
                if not contents:
                    continue
                    
                for item in contents:
                    # Check for welcome cards
                    if item.get("musicHorizontalActionCardViewModel"):
                        card_title = item.get("musicHorizontalActionCardViewModel", {}).get("cardTitle", {}).get("content", "").lower()
                        if any(indicator in card_title for indicator in welcome_indicators):
                            has_welcome_content = True
                    
                    # Check for actual music content
                    if item.get("videoId") or item.get("browseId"):
                        has_music_content = True
            
            return {
                "setup": has_music_content and not has_welcome_content,
                "has_welcome_content": has_welcome_content,
                "has_music_content": has_music_content,
                "reason": "Welcome content detected" if has_welcome_content else "Account appears set up"
            }
            
        except Exception as e:
            logger.error(f"[YTM] Error checking account setup: {e}")
            return {"setup": False, "reason": str(e)}
    
    async def _run_sync(self, func, *args, **kwargs):
        """Helper to run synchronous ytmusicapi calls"""
        import asyncio
        return await asyncio.get_event_loop().run_in_executor(
            None, lambda: func(*args, **kwargs)
        )
    
    async def get_tracks(self) -> List[Dict[str, Any]]:
        """Get user's tracks with priority on personal library songs, playlists, and liked songs"""
        if not self.is_authenticated:
            await self.authenticate()

        # Debug current authentication state
        await self.debug_current_auth()

        tracks = []

        try:
            # Always get YOUR library songs first!
            logger.info("[YTM] Fetching songs from user's library")
            
            try:
                library_songs = await self._run_sync(self.ytm.get_library_songs, limit=100)

                for song in library_songs or []:
                    track = self._map_ytm_track(song)
                    if track:
                        track["section"] = "Your Library"
                        tracks.append(track)
                        
            except Exception as e:
                logger.warning(f"[YTM] Library songs failed, falling back to recommendations: {e}")
                logger.info(f"[YTM] Library songs raw response: {library_songs}")

            logger.info(f"[YTM] ✓ Loaded {len(tracks)} library songs from {len(library_songs) if library_songs else 0} raw items")

            # If no library songs, try to get songs from user's playlists
            if len(tracks) == 0:
                logger.info("[YTM] No library songs found, trying user's playlists")
                try:
                    playlists = await self._run_sync(self.ytm.get_library_playlists, limit=10)
                    
                    for playlist in playlists or []:
                        if playlist.get("playlistId"):
                            try:
                                # Get tracks from this playlist
                                playlist_tracks = await self._run_sync(
                                    self.ytm.get_playlist,
                                    playlist["playlistId"],
                                    limit=20
                                )
                                
                                if playlist_tracks and "tracks" in playlist_tracks:
                                    for song in playlist_tracks["tracks"]:
                                        track = self._map_ytm_track(song)
                                        if track:
                                            track["section"] = f"Playlist: {playlist.get('title', 'Unknown')}"
                                            tracks.append(track)
                                            
                                            if len(tracks) >= 50:  # Limit total tracks
                                                break
                                
                                if len(tracks) >= 50:
                                    break
                                    
                            except Exception as e:
                                logger.warning(f"[YTM] Failed to get tracks from playlist {playlist.get('title')}: {e}")
                                continue
                                
                except Exception as e:
                    logger.warning(f"[YTM] Failed to get user playlists: {e}")

            # If still no tracks, try liked songs
            if len(tracks) == 0:
                logger.info("[YTM] No playlist songs found, trying liked songs")
                try:
                    liked_songs = await self._run_sync(self.ytm.get_liked_songs, limit=50)
                    
                    if liked_songs and "tracks" in liked_songs:
                        for song in liked_songs["tracks"]:
                            track = self._map_ytm_track(song)
                            if track:
                                track["section"] = "Liked Songs"
                                tracks.append(track)
                                
                                if len(tracks) >= 50:
                                    break
                                    
                except Exception as e:
                    logger.warning(f"[YTM] Failed to get liked songs: {e}")

            # If still no tracks, try to get channel uploads
            if len(tracks) == 0:
                logger.info("[YTM] No liked songs found, trying channel uploads")
                try:
                    # Search for @AidanDSMusic uploads
                    channel_results = await self._run_sync(
                        self.ytm.search,
                        "@AidanDSMusic",
                        filter="songs",
                        limit=50
                    )
                    
                    if channel_results:
                        for song in channel_results:
                            track = self._map_ytm_track(song)
                            if track:
                                track["section"] = "@AidanDSMusic Channel"
                                tracks.append(track)
                                
                                if len(tracks) >= 50:
                                    break
                                    
                except Exception as e:
                    logger.warning(f"[YTM] Failed to get channel uploads: {e}")

            logger.info(f"[YTM] ✓ Loaded {len(tracks)} tracks from library/playlists/liked")

            # Only add recommended if we still want/need more tracks
            if len(tracks) < 20:
                logger.info("[YTM] Adding personalized recommendations from home")
                try:
                    home = await self._run_sync(self.ytm.get_home, limit=10)

                    if home:
                        # Check if account shows welcome content
                        account_setup = await self._check_account_setup()
                        if not account_setup.get("setup", False):
                            logger.warning(f"[YTM] Account not fully set up: {account_setup.get('reason')}")
                            if account_setup.get("has_welcome_content", False):
                                logger.info("[YTM] Account showing welcome content - skipping home recommendations")
                                # Don't try to parse home content if it's just welcome cards
                                return tracks[:100]
                        # Focus on recommendation sections, skip action cards
                        rec_sections = [
                            'quick picks', 'listen again', 'mixed for you', 'recommended',
                            'your likes', 'similar to', 'more from', 'discover mix'
                        ]

                        for section in home:
                            # Skip sections that are action cards (no contents or wrong structure)
                            if not section.get("contents") or not isinstance(section.get("contents"), list):
                                continue

                            # Try to get section title from different possible locations
                            section_title = ""
                            if section.get("header"):
                                header = section.get("header", {})
                                if header.get("musicCarouselShelfBasicHeaderRenderer"):
                                    title_renderer = header.get("musicCarouselShelfBasicHeaderRenderer", {})
                                    if title_renderer.get("title"):
                                        title_runs = title_renderer.get("title", {}).get("runs", [])
                                        if title_runs and len(title_runs) > 0:
                                            section_title = title_runs[0].get("text", "")
                                elif header.get("title"):
                                    title_obj = header.get("title", {})
                                    if title_obj.get("runs") and len(title_obj.get("runs", [])) > 0:
                                        section_title = title_obj.get("runs", [{}])[0].get("text", "")
                                    elif title_obj.get("simpleText"):
                                        section_title = title_obj.get("simpleText", "")

                            # Handle new structure where title might be directly on section
                            if not section_title:
                                section_title = section.get("title", "")

                            section_title = (section_title or "").lower()

                            # Check if this section contains recommendations
                            is_rec_section = any(rec.lower() in section_title for rec in rec_sections)

                            if is_rec_section:
                                logger.info(f"[YTM] Processing recommendation section: {section_title}")

                                for item in section["contents"][:10]:  # Limit per section
                                    # Skip action cards
                                    if item.get("musicHorizontalActionCardViewModel"):
                                        continue

                                    # Only process items that have videoId (actual tracks)
                                    if item.get("videoId"):
                                        track = self._map_ytm_track(item)
                                        if track:
                                            track["section"] = section_title
                                            tracks.append(track)

                                            if len(tracks) >= 100:  # Limit total tracks
                                                break

                                if len(tracks) >= 100:
                                    break

                except Exception as e:
                    logger.warning(f"[YTM] Failed to get home recommendations: {e}")

            logger.info(f"[YTM] ✓ Returning {len(tracks)} tracks")

        except Exception as e:
            logger.error(f"[YTM] Error getting tracks: {e}")

        return tracks[:100]  # Limit to 100 tracks total
    
    async def get_home_section(self, section_name: str) -> List[Dict[str, Any]]:
        """Get tracks from a specific home section"""
        if not self.is_authenticated:
            await self.authenticate()
        
        try:
            logger.info(f"[YTM] Getting home section: {section_name}")
            home = await self._run_sync(self.ytm.get_home)
            
            for section in home:
                title = (section.get("title") or "").lower()
                if section_name.lower() in title:
                    tracks = []
                    logger.info(f"[YTM] Found section: {section.get('title')}")
                    
                    for item in section.get("contents", []):
                        if item.get("videoId"):
                            track = self._map_ytm_track(item)
                            if track:
                                track["section"] = section.get("title", section_name)
                                tracks.append(track)
                    
                    logger.info(f"[YTM] ✓ Returning {len(tracks)} tracks from {section_name}")
                    return tracks
            
            logger.warning(f"[YTM] Section '{section_name}' not found")
            return []
            
        except Exception as e:
            logger.error(f"[YTM] Error getting home section '{section_name}': {e}")
            return []
    
    async def get_albums(self, album_type: str = "user", offset: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """Get albums with pagination support"""
        if not self.is_authenticated:
            await self.authenticate()

        albums = []

        try:
            # Always get YOUR library albums first!
            logger.info("[YTM] Fetching albums from user's library")
            
            try:
                library_albums = await self._run_sync(self.ytm.get_library_albums, limit=50)

                for album in library_albums or []:
                    mapped = self._map_ytm_album(album)
                    if mapped:
                        albums.append(mapped)
                        
            except Exception as e:
                logger.warning(f"[YTM] Library albums failed, falling back to recommendations: {e}")

            logger.info(f"[YTM] ✓ Loaded {len(albums)} library albums from {len(library_albums) if library_albums else 0} raw items")

            # Fallback to home for curated album selections if library is small
            if len(albums) < 5:
                logger.info("[YTM] Fallback: Fetching albums from home")
                try:
                    home = await self._run_sync(self.ytm.get_home, limit=15)

                    # Check if account shows welcome content
                    account_setup = await self._check_account_setup()
                    if not account_setup.get("setup", False):
                        logger.warning(f"[YTM] Account not fully set up: {account_setup.get('reason')}")
                        if account_setup.get("has_welcome_content", False):
                            logger.info("[YTM] Account showing welcome content - skipping home albums")
                            return albums[:50]

                    for section in home or []:
                        # Skip sections that are action cards or don't have contents
                        if not section.get("contents") or not isinstance(section.get("contents"), list):
                            continue

                        # Try to get section title from different possible locations
                        section_title = ""
                        if section.get("header"):
                            header = section.get("header", {})
                            if header.get("musicCarouselShelfBasicHeaderRenderer"):
                                title_renderer = header.get("musicCarouselShelfBasicHeaderRenderer", {})
                                if title_renderer.get("title"):
                                    title_runs = title_renderer.get("title", {}).get("runs", [])
                                    if title_runs and len(title_runs) > 0:
                                        section_title = title_runs[0].get("text", "")
                            elif header.get("title"):
                                title_obj = header.get("title", {})
                                if title_obj.get("runs") and len(title_obj.get("runs", [])) > 0:
                                    section_title = title_obj.get("runs", [{}])[0].get("text", "")
                                elif title_obj.get("simpleText"):
                                    section_title = title_obj.get("simpleText", "")

                        section_title = (section_title or "").lower()

                        # Look for album sections
                        if "album" in section_title or "new releases" in section_title:
                            for item in section.get("contents", []):
                                # Skip action cards
                                if item.get("musicHorizontalActionCardViewModel"):
                                    continue

                                # Check for album browseId patterns
                                if item.get("browseId") and item.get("browseId").startswith("MPREb_"):
                                    mapped = self._map_ytm_album(item)
                                    if mapped:
                                        albums.append(mapped)
                                        if len(albums) >= 50:
                                            break
                            if len(albums) >= 50:
                                break

                except Exception as e:
                    logger.warning(f"[YTM] Failed to get home albums: {e}")

            logger.info(f"[YTM] ✓ Returning {len(albums)} albums (applying pagination: offset={offset}, limit={limit})")

        except Exception as e:
            logger.error(f"[YTM] Error getting albums: {e}")

        # Apply pagination
        return albums[offset:offset + limit]
    
    async def get_playlists(self, offset: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """Get user playlists with fallback to home recommendations and channel content"""
        if not self.is_authenticated:
            await self.authenticate()

        playlists = []

        try:
            logger.info(f"[YTM] Fetching user playlists (offset={offset}, limit={limit})")
            
            # Try library playlists first (user's own playlists)
            try:
                library_playlists = await self._run_sync(
                    self.ytm.get_library_playlists,
                    limit=50
                )
                
                if library_playlists:
                    for playlist in library_playlists:
                        mapped = self._map_ytm_playlist(playlist)
                        if mapped:
                            # For playlists with 0 track count, try to fetch actual count
                            # This is especially important for "Liked Music" and other system playlists
                            if mapped.get("trackCount", 0) == 0:
                                try:
                                    playlist_id = playlist.get("playlistId")
                                    # Special handling for Liked Music
                                    if playlist_id == "LM":
                                        liked_data = await self._run_sync(self.ytm.get_liked_songs, limit=None)
                                        if liked_data and "tracks" in liked_data:
                                            mapped["trackCount"] = len(liked_data["tracks"])
                                            logger.info(f"[YTM] Updated Liked Music count: {mapped['trackCount']}")
                                    else:
                                        # For other playlists, fetch with limit to check if empty
                                        playlist_data = await self._run_sync(self.ytm.get_playlist, playlist_id, limit=1)
                                        if playlist_data and "tracks" in playlist_data:
                                            # We only fetched 1 track, so we know there's at least 1
                                            # For now, just mark as "has content" 
                                            if len(playlist_data["tracks"]) > 0:
                                                # Fetch more to get accurate count (up to 1000)
                                                full_playlist = await self._run_sync(self.ytm.get_playlist, playlist_id, limit=1000)
                                                if full_playlist and "tracks" in full_playlist:
                                                    mapped["trackCount"] = len(full_playlist["tracks"])
                                                    logger.info(f"[YTM] Updated playlist '{mapped['name']}' count: {mapped['trackCount']}")
                                except Exception as count_err:
                                    logger.warning(f"[YTM] Failed to get accurate count for playlist '{mapped.get('name')}': {count_err}")
                            
                            # Filter out empty system playlists like "Episodes for Later"
                            if mapped.get("trackCount", 0) == 0 and playlist.get("playlistId") in ["SE", "RDTMAK"]:
                                logger.info(f"[YTM] Skipping empty system playlist: {mapped.get('name')}")
                                continue
                            
                            playlists.append(mapped)
                            
            except Exception as e:
                logger.warning(f"[YTM] Library playlists failed, falling back to recommendations: {e}")

            # Add Liked Music only if it's not already in the library playlists
            has_liked_music = any(p.get("id") == "ytm:LM" for p in playlists)
            if not has_liked_music:
                try:
                    # Fetch all liked songs to get accurate count
                    liked_songs = await self._run_sync(self.ytm.get_liked_songs, limit=None)
                    if liked_songs and "tracks" in liked_songs:
                        liked_count = len(liked_songs["tracks"])
                        
                        # Get thumbnail from first track if available
                        cover_art = None
                        if liked_count > 0 and liked_songs["tracks"][0].get("thumbnails"):
                            cover_art = liked_songs["tracks"][0]["thumbnails"][0].get("url")
                        
                        playlists.insert(0, {  # Insert at the beginning
                            "id": "ytm:LM",
                            "name": "Liked Music",
                            "title": "Liked Music", 
                            "description": f"Your {liked_count} liked songs",
                            "trackCount": liked_count,
                            "coverArt": cover_art,
                            "service": "youtubeMusic"
                        })
                        logger.info(f"[YTM] ✓ Added Liked Music with {liked_count} songs")
                except Exception as e:
                    logger.warning(f"[YTM] Failed to get liked songs count: {e}")
            
            # If no library playlists, try to get channel-specific playlists
            if len(playlists) == 0:
                logger.info("[YTM] No library playlists found, trying channel playlists")
                try:
                    # Try to get playlists from the channel
                    channel_playlists = await self._run_sync(
                        self.ytm.get_artist,
                        "UC1234567890"  # This won't work, but let's try a different approach
                    )
                    
                    # Alternative: search for playlists by the channel name
                    search_results = await self._run_sync(
                        self.ytm.search,
                        "@AidanDSMusic",
                        filter="playlists",
                        limit=20
                    )
                    
                    if search_results:
                        for result in search_results:
                            mapped = self._map_ytm_playlist(result)
                            if mapped:
                                playlists.append(mapped)
                                if len(playlists) >= 20:
                                    break
                                    
                except Exception as e:
                    logger.warning(f"[YTM] Failed to get channel playlists: {e}")
            
            if len(playlists) < 5:
                logger.info("[YTM] Fallback: Fetching playlists from home shelves")
                try:
                    home = await self._run_sync(self.ytm.get_home, limit=10)

                    # Check if account shows welcome content
                    account_setup = await self._check_account_setup()
                    if not account_setup.get("setup", False):
                        logger.warning(f"[YTM] Account not fully set up: {account_setup.get('reason')}")
                        if account_setup.get("has_welcome_content", False):
                            logger.info("[YTM] Account showing welcome content - skipping home playlists")
                            return playlists[offset:offset + limit]

                    for section in home or []:
                        # Skip sections that are action cards
                        if not section.get("contents") or not isinstance(section.get("contents"), list):
                            continue

                        title = (section.get("title") or "").lower()
                        if "playlist" in title or "mix" in title:
                            for item in section.get("contents", []):
                                if item.get("browseId") and "playlist" in str(item.get("browseId", "")):
                                    mapped = self._map_ytm_playlist(item)
                                    if mapped:
                                        playlists.append(mapped)
                                        if len(playlists) >= 50:
                                            break
                            if len(playlists) >= 50:
                                break

                except Exception as e:
                    logger.warning(f"[YTM] Failed to get home playlists: {e}")

            logger.info(f"[YTM] ✓ Returning {len(playlists)} playlists (applying pagination: offset={offset}, limit={limit})")

        except Exception as e:
            logger.error(f"[YTM] Error getting playlists: {e}")

        # Apply pagination
        return playlists[offset:offset + limit]
    
    async def get_artists(self, artist_type: str = "user", offset: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """Get artists with pagination support"""
        if not self.is_authenticated:
            await self.authenticate()

        artists = []

        try:
            # Always get YOUR library artists first!
            logger.info("[YTM] Fetching artists from user's library")
            
            try:
                library_artists = await self._run_sync(self.ytm.get_library_artists, limit=50)

                for artist in library_artists or []:
                    mapped = self._map_ytm_artist(artist)
                    if mapped:
                        artists.append(mapped)
                        
            except Exception as e:
                logger.warning(f"[YTM] Library artists failed, falling back to recommendations: {e}")

            logger.info(f"[YTM] ✓ Loaded {len(artists)} library artists from {len(library_artists) if 'library_artists' in locals() and library_artists else 0} raw items")

            # Fallback to home shelves with "artists for you" if library is small
            if len(artists) < 5:
                logger.info("[YTM] Fallback: Fetching artists from home shelves")
                try:
                    home = await self._run_sync(self.ytm.get_home, limit=10)

                    # Check if account shows welcome content
                    account_setup = await self._check_account_setup()
                    if not account_setup.get("setup", False):
                        logger.warning(f"[YTM] Account not fully set up: {account_setup.get('reason')}")
                        if account_setup.get("has_welcome_content", False):
                            logger.info("[YTM] Account showing welcome content - skipping home artists")
                            return artists[:50]

                    for section in home or []:
                        # Skip sections that are action cards
                        if not section.get("contents") or not isinstance(section.get("contents"), list):
                            continue

                        title = (section.get("title") or "").lower()
                        if "artist" in title:
                            for item in section.get("contents", []):
                                mapped = self._map_ytm_artist(item)
                                if mapped:
                                    artists.append(mapped)
                                    if len(artists) >= 50:
                                        break
                            if len(artists) >= 50:
                                break

                except Exception as e:
                    logger.warning(f"[YTM] Failed to get home artists: {e}")

            logger.info(f"[YTM] ✓ Returning {len(artists)} artists (applying pagination: offset={offset}, limit={limit})")

        except Exception as e:
            logger.error(f"[YTM] Error getting artists: {e}")

        # Apply pagination
        return artists[offset:offset + limit]
    
    async def search(self, query: str) -> List[Dict[str, Any]]:
        """Search YouTube Music"""
        if not self.is_authenticated:
            await self.authenticate()
        
        results = []
        
        try:
            logger.info(f"[YTM] Searching: {query}")
            
            # Search songs
            songs = await self._run_sync(
                self.ytm.search,
                query,
                filter="songs",
                limit=10
            )
            
            for song in songs:
                track = self._map_ytm_track(song)
                if track:
                    track["type"] = "song"
                    results.append(track)
            
            # Search albums
            albums = await self._run_sync(
                self.ytm.search,
                query,
                filter="albums",
                limit=5
            )
            
            for album in albums:
                mapped = self._map_ytm_album(album)
                if mapped:
                    mapped["type"] = "album"
                    results.append(mapped)
            
            # Search artists
            artists = await self._run_sync(
                self.ytm.search,
                query,
                filter="artists",
                limit=5
            )
            
            for artist in artists:
                mapped = self._map_ytm_artist(artist)
                if mapped:
                    mapped["type"] = "artist"
                    results.append(mapped)
            
            logger.info(f"[YTM] ✓ Found {len(results)} results")
            
        except Exception as e:
            logger.error(f"[YTM] Search error: {e}")
        
        return results
    
    async def get_recommendations(self) -> List[Dict[str, Any]]:
        """Get personalized recommendations from home feed"""
        if not self.is_authenticated:
            await self.authenticate()
        
        recommendations = []
        
        try:
            logger.info("[YTM] Getting personalized recommendations from home")
            home = await self._run_sync(self.ytm.get_home, limit=10)
            
            # Focus on recommendation sections
            rec_sections = [
                'quick picks', 'listen again', 'mixed for you', 'recommended',
                'your likes', 'similar to', 'more from', 'discover mix'
            ]
            
            for section in home:
                section_title = (section.get("title") or "").lower()
                
                # Check if this section contains recommendations
                is_rec_section = any(rec.lower() in section_title for rec in rec_sections)
                
                if is_rec_section and section.get("contents"):
                    logger.info(f"[YTM] Processing recommendation section: {section.get('title')}")
                    
                    for item in section["contents"][:8]:  # Limit per section
                        if item.get("videoId"):
                            track = self._map_ytm_track(item)
                            if track:
                                track["section"] = section.get("title", "Recommendations")
                                recommendations.append(track)
            
            logger.info(f"[YTM] ✓ Got {len(recommendations)} personalized recommendations")
            
        except Exception as e:
            logger.error(f"[YTM] Error getting recommendations: {e}")
        
        return recommendations
    
    async def get_playlist_tracks(self, playlist_id: str) -> List[Dict[str, Any]]:
        """Get tracks from a specific playlist"""
        if not self.is_authenticated:
            logger.warning("[YTM] Not authenticated, cannot get playlist tracks")
            return []

        try:
            logger.info(f"[YTM] Getting tracks for playlist: {playlist_id}")

            # Handle special case for Liked Music
            if playlist_id == "LM":
                logger.info("[YTM] Getting liked songs")
                liked_songs = await self._run_sync(self.ytm.get_liked_songs, limit=1000)
                
                if not liked_songs or "tracks" not in liked_songs:
                    logger.warning("[YTM] No liked songs found")
                    return []

                tracks = []
                for track in liked_songs["tracks"]:
                    if track and "videoId" in track:
                        formatted_track = self._map_ytm_track(track)
                        if formatted_track:
                            tracks.append(formatted_track)

                logger.info(f"[YTM] ✓ Found {len(tracks)} liked songs")
                return tracks

            # Regular playlist handling
            # Get playlist details with tracks
            playlist_data = await self._run_sync(self.ytm.get_playlist, playlist_id, limit=1000)

            if not playlist_data or "tracks" not in playlist_data:
                logger.warning(f"[YTM] No tracks found in playlist {playlist_id}")
                return []

            tracks = []
            for track in playlist_data["tracks"]:
                if track and "videoId" in track:
                    formatted_track = self._map_ytm_track(track)
                    if formatted_track:
                        tracks.append(formatted_track)

            logger.info(f"[YTM] ✓ Found {len(tracks)} tracks in playlist {playlist_id}")
            return tracks

        except Exception as e:
            logger.error(f"[YTM] Error getting playlist tracks for {playlist_id}: {e}")
            return []
    
    async def get_radio(self, video_id: str) -> List[Dict[str, Any]]:
        """Get radio/autoplay tracks based on a seed song"""
        if not self.is_authenticated:
            await self.authenticate()
        
        radio_tracks = []
        
        try:
            logger.info(f"[YTM] Getting radio for video: {video_id}")
            watch_playlist = await self._run_sync(
                self.ytm.get_watch_playlist,
                videoId=video_id,
                limit=20
            )
            
            if watch_playlist and "tracks" in watch_playlist:
                for track in watch_playlist["tracks"]:
                    mapped = self._map_ytm_track(track)
                    if mapped:
                        mapped["section"] = "Radio"
                        radio_tracks.append(mapped)
            
            logger.info(f"[YTM] ✓ Got {len(radio_tracks)} radio tracks")
            
        except Exception as e:
            logger.error(f"[YTM] Error getting radio: {e}")
        
        return radio_tracks
    
    async def get_artist_albums(self, artist_id: str) -> List[Dict[str, Any]]:
        """Get albums for a specific artist"""
        if not self.is_authenticated:
            await self.authenticate()
        
        albums = []
        
        try:
            # Remove the ytm: prefix if present
            clean_artist_id = artist_id.replace("ytm:", "") if artist_id.startswith("ytm:") else artist_id
            
            logger.info(f"[YTM] Getting albums for artist: {clean_artist_id}")
            
            # Try to get artist details first to get the artist name
            artist_name = None
            try:
                artist_data = await self._run_sync(self.ytm.get_artist, clean_artist_id)
                if artist_data and artist_data.get("name"):
                    artist_name = artist_data["name"]
                    logger.info(f"[YTM] Found artist name: {artist_name}")
                    
                    # If we have artist data, check if it contains albums
                    if artist_data.get("albums") and artist_data["albums"].get("results"):
                        for album in artist_data["albums"]["results"]:
                            mapped = self._map_ytm_album(album)
                            if mapped:
                                albums.append(mapped)
                        
                        logger.info(f"[YTM] ✓ Found {len(albums)} albums directly from artist page")
                        return albums
            except Exception as e:
                logger.warning(f"[YTM] Failed to get artist details: {e}")
            
            # Fallback: search for albums by artist name
            if not artist_name:
                # Try to get artist name from search
                try:
                    search_results = await self._run_sync(
                        self.ytm.search,
                        clean_artist_id,
                        filter="artists",
                        limit=1
                    )
                    
                    if search_results and len(search_results) > 0:
                        artist_name = search_results[0].get("artist") or search_results[0].get("name")
                        logger.info(f"[YTM] Got artist name from search: {artist_name}")
                except Exception as e:
                    logger.warning(f"[YTM] Failed to search for artist: {e}")
                    artist_name = clean_artist_id  # Use the ID as fallback
            
            if artist_name:
                # Search for albums by this artist
                search_query = f'"{artist_name}" albums'
                logger.info(f"[YTM] Searching for albums with query: {search_query}")
                
                search_results = await self._run_sync(
                    self.ytm.search,
                    search_query,
                    filter="albums",
                    limit=20
                )
                
                if search_results:
                    for album in search_results:
                        # Filter to ensure the album is actually by this artist
                        album_artist = None
                        if album.get("artists") and len(album["artists"]) > 0:
                            album_artist = album["artists"][0].get("name")
                        elif album.get("artist"):
                            album_artist = album["artist"].get("name") if isinstance(album["artist"], dict) else str(album["artist"])
                        
                        # Check if this album matches our artist (case insensitive)
                        if album_artist and (
                            album_artist.lower() == artist_name.lower() or
                            artist_name.lower() in album_artist.lower() or
                            album_artist.lower() in artist_name.lower()
                        ):
                            mapped = self._map_ytm_album(album)
                            if mapped:
                                albums.append(mapped)
                
                logger.info(f"[YTM] ✓ Found {len(albums)} albums for artist {artist_name}")
            else:
                logger.warning(f"[YTM] Could not determine artist name for {clean_artist_id}")
            
        except Exception as e:
            logger.error(f"[YTM] Error getting artist albums: {e}")
        
        return albums
    
    async def get_album_tracks(self, album_id: str) -> List[Dict[str, Any]]:
        """Get tracks for a specific album"""
        if not self.is_authenticated:
            await self.authenticate()
        
        tracks = []
        
        try:
            # Remove the ytm: prefix if present
            clean_album_id = album_id.replace("ytm:", "") if album_id.startswith("ytm:") else album_id
            
            logger.info(f"[YTM] Getting tracks for album: {clean_album_id}")
            
            # For YouTube Music, albums are accessed like playlists
            album_data = await self._run_sync(self.ytm.get_playlist, clean_album_id, limit=1000)
            
            if album_data and "tracks" in album_data:
                for track in album_data["tracks"]:
                    if track and "videoId" in track:
                        mapped = self._map_ytm_track(track)
                        if mapped:
                            tracks.append(mapped)
            
            logger.info(f"[YTM] ✓ Found {len(tracks)} tracks in album")
            
        except Exception as e:
            logger.error(f"[YTM] Error getting album tracks: {e}")
        
        return tracks
    
    def _get_best_thumbnail(self, thumbnails: List[Dict[str, Any]]) -> Optional[str]:
        """Get the highest quality thumbnail URL, with enhancement for YouTube thumbnails"""
        if not thumbnails:
            return None
        
        # Sort by resolution (width * height), highest first
        sorted_thumbs = sorted(
            thumbnails,
            key=lambda t: (t.get('width', 0) * t.get('height', 0)),
            reverse=True
        )
        
        best_url = sorted_thumbs[0].get('url')
        
        # Try to enhance YouTube/Google Photos thumbnail quality
        if best_url and ('ytimg.com' in best_url or 'googleusercontent.com' in best_url):
            try:
                # For YouTube thumbnails, try to get maxresdefault if we have a video ID
                if 'ytimg.com/vi/' in best_url:
                    # Extract video ID from URL like https://img.youtube.com/vi/VIDEO_ID/hqdefault.jpg
                    import re
                    match = re.search(r'ytimg\.com/vi/([^/]+)/', best_url)
                    if match:
                        video_id = match.group(1)
                        # Try maxresdefault first (highest quality)
                        maxres_url = f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg'
                        return maxres_url
                
                # For Google Photos style URLs, try to increase resolution
                elif 'googleusercontent.com' in best_url:
                    # URLs like https://lh3.googleusercontent.com/...=w60-h60...
                    # Try to change to higher resolution
                    enhanced_url = re.sub(r'=w\d+-h\d+', '=w1200-h1200', best_url)
                    if enhanced_url != best_url:
                        return enhanced_url
                        
                    # If no dimensions specified, try adding high resolution
                    if '=' in best_url and not best_url.endswith('=w1200-h1200'):
                        base_url = best_url.split('=')[0]
                        return f"{base_url}=w1200-h1200"
            
            except Exception as e:
                logger.warning(f"[YTM] Failed to enhance thumbnail URL: {e}")
                # Fall back to original best URL
        
        return best_url
    
    def _map_ytm_track(self, track: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            video_id = track.get("videoId")
            if not video_id:
                return None
            
            # Extract artist name
            artist = "Unknown Artist"
            if track.get("artists") and len(track["artists"]) > 0:
                artist = track["artists"][0].get("name", "Unknown Artist")
            elif track.get("artist"):
                if isinstance(track["artist"], dict):
                    artist = track["artist"].get("name", "Unknown Artist")
                else:
                    artist = str(track["artist"])
            
            # Extract album name
            album = "Unknown Album"
            if track.get("album"):
                if isinstance(track["album"], dict):
                    album = track["album"].get("name", "Unknown Album")
                else:
                    album = str(track["album"])
            
            # Get thumbnail
            thumbnail = None
            if track.get("thumbnails") and len(track["thumbnails"]) > 0:
                thumbnail = self._get_best_thumbnail(track["thumbnails"])
            elif track.get("thumbnail"):
                thumbnail = track["thumbnail"]
            
            return {
                "id": f"ytm:{video_id}",
                "title": track.get("title", "Unknown Title"),
                "artist": artist,
                "album": album,
                "duration": track.get("duration"),
                "albumArt": thumbnail,
                "streamUrl": f"/api/stream/youtube/{video_id}",
                "service": "youtubeMusic",
                "videoId": video_id
            }
        except Exception as e:
            logger.error(f"[YTM] Error mapping track: {e}")
            return None
    
    def _map_ytm_album(self, album: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Map YouTube Music album to standard format"""
        try:
            browse_id = album.get("browseId") or album.get("albumId")
            if not browse_id:
                return None
            
            # Extract artist
            artist = "Unknown Artist"
            if album.get("artists") and len(album["artists"]) > 0:
                artist = album["artists"][0].get("name", "Unknown Artist")
            elif album.get("artist"):
                if isinstance(album["artist"], dict):
                    artist = album["artist"].get("name", "Unknown Artist")
                else:
                    artist = str(album["artist"])
            
            # Get thumbnail
            thumbnail = None
            if album.get("thumbnails") and len(album["thumbnails"]) > 0:
                thumbnail = self._get_best_thumbnail(album["thumbnails"])
            
            return {
                "id": f"ytm:{browse_id}",
                "title": album.get("title") or album.get("name", "Unknown Album"),
                "artist": artist,
                "year": album.get("year"),
                "coverArt": thumbnail,
                "trackCount": album.get("trackCount", 0),
                "service": "youtubeMusic"
            }
        except Exception as e:
            logger.error(f"[YTM] Error mapping album: {e}")
            return None
    
    def _map_ytm_playlist(self, playlist: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Map YouTube Music playlist to standard format"""
        try:
            playlist_id = playlist.get("playlistId")
            if not playlist_id:
                return None
            
            # Get thumbnail
            thumbnail = None
            if playlist.get("thumbnails") and len(playlist["thumbnails"]) > 0:
                thumbnail = self._get_best_thumbnail(playlist["thumbnails"])
            
            # Get track count from various possible fields
            track_count = playlist.get("count", 0)
            if track_count == 0:
                # Try alternative field names
                track_count = playlist.get("trackCount", 0)
            if track_count == 0 and "tracks" in playlist:
                # If we have the full playlist data with tracks
                track_count = len(playlist["tracks"])
            
            return {
                "id": f"ytm:{playlist_id}",
                "name": playlist.get("title", "Unknown Playlist"),
                "title": playlist.get("title", "Unknown Playlist"),
                "description": playlist.get("description", ""),
                "trackCount": track_count,
                "coverArt": thumbnail,
                "service": "youtubeMusic"
            }
        except Exception as e:
            logger.error(f"[YTM] Error mapping playlist: {e}")
            return None
    
    def _map_ytm_artist(self, artist: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Map YouTube Music artist to standard format"""
        try:
            browse_id = artist.get("browseId") or artist.get("artistId")
            if not browse_id:
                return None
            
            # Get thumbnail
            thumbnail = None
            if artist.get("thumbnails") and len(artist["thumbnails"]) > 0:
                thumbnail = self._get_best_thumbnail(artist["thumbnails"])
            
            return {
                "id": f"ytm:{browse_id}",
                "name": artist.get("artist") or artist.get("name", "Unknown Artist"),
                "image": thumbnail,
                "service": "youtubeMusic"
            }
        except Exception as e:
            logger.error(f"[YTM] Error mapping artist: {e}")
            return None
    
    def __del__(self):
        """Cleanup cookie file on deletion"""
        if self.cookie_file and os.path.exists(self.cookie_file.name):
            try:
                os.unlink(self.cookie_file.name)
                logger.info(f"[YTM] Cleaned up cookie file")
            except Exception as e:
                logger.error(f"[YTM] Failed to cleanup cookie file: {e}")
