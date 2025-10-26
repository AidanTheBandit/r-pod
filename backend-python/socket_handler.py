"""
Socket.IO Integration for Device Pairing
Handles real-time communication between R1 devices and pairing web client
"""
import socketio
import logging
from typing import Dict, Any, Optional
from pairing_service import pairing_service
import httpx

logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',  # Configure based on settings in production
    logger=False,
    engineio_logger=False
)

# Wrap with ASGI app
socket_app = socketio.ASGIApp(sio)


@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    logger.info(f"[Socket.IO] Client connected: {sid}")
    await sio.emit('connected', {'sid': sid}, room=sid)


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"[Socket.IO] Client disconnected: {sid}")


# ======================
# Device Pairing Events
# ======================

@sio.event
async def pair_request(sid, data):
    """
    Handle pairing code request from R1 device
    
    Args:
        data: {
            device_id: str - Unique device identifier
        }
    """
    try:
        device_id = data.get('device_id')
        if not device_id:
            await sio.emit('pair_error', {
                'error': 'device_id is required'
            }, room=sid)
            return
        
        # Generate pairing code
        pairing = pairing_service.generate_code(device_id, sid)
        
        # Send code to device
        await sio.emit('pair_code', {
            'code': pairing.code,
            'expires_in': pairing.time_remaining(),
            'pairing_url': f'https://pair.r-pod.app/?code={pairing.code}'
        }, room=sid)
        
        logger.info(f"[Pairing] Code {pairing.code} sent to device {device_id}")
        
    except Exception as e:
        logger.error(f"[Pairing] Error generating code: {e}")
        await sio.emit('pair_error', {
            'error': str(e)
        }, room=sid)


@sio.event
async def pair_validate(sid, data):
    """
    Validate a pairing code from web client
    
    Args:
        data: {
            code: str - Pairing code to validate
        }
    """
    try:
        code = data.get('code', '').upper().strip()
        
        if not code:
            await sio.emit('pair_validate_result', {
                'valid': False,
                'error': 'Pairing code is required'
            }, room=sid)
            return
        
        # Validate code
        is_valid, error = pairing_service.validate_code(code)
        
        if is_valid:
            pairing = pairing_service.get_pairing(code)
            await sio.emit('pair_validate_result', {
                'valid': True,
                'expires_in': pairing.time_remaining() if pairing else 0
            }, room=sid)
        else:
            await sio.emit('pair_validate_result', {
                'valid': False,
                'error': error
            }, room=sid)
        
    except Exception as e:
        logger.error(f"[Pairing] Error validating code: {e}")
        await sio.emit('pair_validate_result', {
            'valid': False,
            'error': str(e)
        }, room=sid)


@sio.event
async def pair_submit(sid, data):
    """
    Submit credentials from web client to device
    
    Args:
        data: {
            code: str - Pairing code
            credentials: {
                cookie: str - YouTube Music cookie
                profile: str - Account profile index
                channel_id: str - Optional channel ID
                brand_account_id: str - Optional brand account ID
            }
        }
    """
    try:
        code = data.get('code', '').upper().strip()
        credentials = data.get('credentials', {})
        
        # Validate code
        is_valid, error = pairing_service.validate_code(code)
        if not is_valid:
            await sio.emit('pair_submit_result', {
                'success': False,
                'error': error
            }, room=sid)
            return
        
        # Get pairing
        pairing = pairing_service.get_pairing(code)
        if not pairing:
            await sio.emit('pair_submit_result', {
                'success': False,
                'error': 'Pairing not found'
            }, room=sid)
            return
        
        # Validate credentials
        if not credentials.get('cookie'):
            await sio.emit('pair_submit_result', {
                'success': False,
                'error': 'YouTube Music cookie is required'
            }, room=sid)
            return
        
        # Get device socket
        device_socket = pairing.device_socket_id
        if not device_socket:
            await sio.emit('pair_submit_result', {
                'success': False,
                'error': 'Device not connected'
            }, room=sid)
            return
        
        # Send credentials to device
        await sio.emit('pair_credentials', {
            'cookie': credentials.get('cookie'),
            'profile': credentials.get('profile', '0'),
            'channel_id': credentials.get('channel_id'),
            'brand_account_id': credentials.get('brand_account_id')
        }, room=device_socket)
        
        # Store credentials on backend for authenticated API calls
        try:
            from config import settings
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"http://localhost:{settings.port}/api/devices/{pairing.device_id}/credentials",
                    json={
                        'cookie': credentials.get('cookie'),
                        'profile': credentials.get('profile', '0'),
                        'channel_id': credentials.get('channel_id'),
                        'brand_account_id': credentials.get('brand_account_id')
                    },
                    headers={'X-Server-Password': settings.server_password},
                    timeout=10.0
                )
            logger.info(f"[Pairing] Credentials stored on backend for device {pairing.device_id}")
        except Exception as e:
            logger.warning(f"[Pairing] Failed to store credentials on backend: {e}")
        
        # Mark code as used
        pairing_service.mark_code_used(code)
        
        # Notify web client of success
        await sio.emit('pair_submit_result', {
            'success': True,
            'message': 'Credentials sent to device successfully'
        }, room=sid)
        
        logger.info(f"[Pairing] Credentials sent for code {code}")
        
    except Exception as e:
        logger.error(f"[Pairing] Error submitting credentials: {e}")
        await sio.emit('pair_submit_result', {
            'success': False,
            'error': str(e)
        }, room=sid)


@sio.event
async def pair_confirm(sid, data):
    """
    Confirm pairing success from device
    
    Args:
        data: {
            code: str - Pairing code
            success: bool - Whether pairing was successful
        }
    """
    try:
        code = data.get('code', '').upper().strip()
        success = data.get('success', False)
        
        logger.info(f"[Pairing] Device confirmed pairing for code {code}: {success}")
        
        # Notify web client if still connected
        # (We'd need to track web client sid for this)
        
    except Exception as e:
        logger.error(f"[Pairing] Error confirming pairing: {e}")


@sio.event
async def pair_test_credentials(sid, data):
    """
    Test credentials before submitting to device
    
    Args:
        data: {
            cookie: str - YouTube Music cookie
            profile: str - Account profile index
        }
    """
    try:
        from services.youtube_music_aggregator import YouTubeMusicAggregator
        
        cookie = data.get('cookie')
        profile = data.get('profile', '0')
        
        if not cookie:
            await sio.emit('pair_test_result', {
                'success': False,
                'error': 'Cookie is required'
            }, room=sid)
            return
        
        # Create temporary aggregator to test
        ytm = YouTubeMusicAggregator({
            'cookie': cookie,
            'profile': profile
        })
        
        # Try to authenticate
        auth_success = await ytm.authenticate()
        
        if auth_success:
            # Get some sample data to verify
            try:
                home = await ytm._run_sync(ytm.ytm.get_home, limit=1)
                section_count = len(home) if home else 0
                
                await sio.emit('pair_test_result', {
                    'success': True,
                    'message': f'Connection successful! Found {section_count} sections',
                    'sections': section_count
                }, room=sid)
            except Exception as e:
                await sio.emit('pair_test_result', {
                    'success': False,
                    'error': f'Authentication succeeded but data fetch failed: {str(e)}'
                }, room=sid)
        else:
            await sio.emit('pair_test_result', {
                'success': False,
                'error': 'Authentication failed - check your cookie and profile'
            }, room=sid)
        
    except Exception as e:
        logger.error(f"[Pairing] Error testing credentials: {e}")
        await sio.emit('pair_test_result', {
            'success': False,
            'error': str(e)
        }, room=sid)


@sio.event
async def pair_detect_accounts(sid, data):
    """
    Detect available accounts for a cookie
    
    Args:
        data: {
            cookie: str - YouTube Music cookie
        }
    """
    try:
        from services.youtube_music_aggregator import YouTubeMusicAggregator
        
        cookie = data.get('cookie')
        
        if not cookie:
            await sio.emit('pair_accounts_result', {
                'success': False,
                'error': 'Cookie is required'
            }, room=sid)
            return
        
        accounts = []
        
        # Test accounts 0-4
        for account_idx in range(5):
            try:
                ytm = YouTubeMusicAggregator({
                    'cookie': cookie,
                    'profile': str(account_idx)
                })
                
                if await ytm.authenticate():
                    # Get home sections to identify account
                    home = await ytm._run_sync(ytm.ytm.get_home, limit=3)
                    
                    if home and len(home) > 0:
                        first_section = home[0].get('title', 'Unknown')
                        
                        accounts.append({
                            'index': account_idx,
                            'first_section': first_section,
                            'section_count': len(home),
                            'is_personal': any(
                                indicator in first_section.lower()
                                for indicator in ['quick pick', 'listen again', 'mixed for you']
                            )
                        })
            except Exception as e:
                logger.debug(f"[Pairing] Account {account_idx} test failed: {e}")
                continue
        
        await sio.emit('pair_accounts_result', {
            'success': True,
            'accounts': accounts,
            'message': f'Found {len(accounts)} available accounts'
        }, room=sid)
        
    except Exception as e:
        logger.error(f"[Pairing] Error detecting accounts: {e}")
        await sio.emit('pair_accounts_result', {
            'success': False,
            'error': str(e)
        }, room=sid)


# ======================
# Admin/Stats Events
# ======================

@sio.event
async def pair_stats(sid):
    """Get pairing service statistics"""
    try:
        stats = pairing_service.get_stats()
        await sio.emit('pair_stats_result', stats, room=sid)
    except Exception as e:
        logger.error(f"[Pairing] Error getting stats: {e}")
        await sio.emit('pair_error', {'error': str(e)}, room=sid)


def get_socket_app():
    """Get the Socket.IO ASGI app for mounting"""
    return socket_app


def start_pairing_service():
    """Start the pairing service (call from lifespan)"""
    pairing_service.start()


def stop_pairing_service():
    """Stop the pairing service (call from lifespan)"""
    pairing_service.stop()
