"""
Device Pairing Service
Handles pairing between Rabbit R1 devices and web configuration clients
"""
import asyncio
import secrets
import string
import time
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class PairingCode:
    """Represents a pairing code with expiration and metadata"""
    
    def __init__(self, code: str, device_id: str):
        self.code = code
        self.device_id = device_id
        self.created_at = datetime.now()
        self.expires_at = datetime.now() + timedelta(minutes=5)
        self.used = False
        self.device_socket_id: Optional[str] = None
    
    def is_valid(self) -> bool:
        """Check if code is still valid"""
        return not self.used and datetime.now() < self.expires_at
    
    def mark_used(self):
        """Mark code as used"""
        self.used = True
    
    def time_remaining(self) -> int:
        """Get seconds remaining until expiration"""
        if self.used:
            return 0
        remaining = (self.expires_at - datetime.now()).total_seconds()
        return max(0, int(remaining))


class PairingService:
    """Service for managing device pairing"""
    
    def __init__(self):
        self.active_codes: Dict[str, PairingCode] = {}
        self.device_sockets: Dict[str, str] = {}  # device_id -> socket_id
        self.cleanup_task: Optional[asyncio.Task] = None
    
    def start(self):
        """Start the pairing service"""
        logger.info("[Pairing] Service starting...")
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("[Pairing] ✓ Service started")
    
    def stop(self):
        """Stop the pairing service"""
        logger.info("[Pairing] Service stopping...")
        if self.cleanup_task:
            self.cleanup_task.cancel()
        logger.info("[Pairing] ✓ Service stopped")
    
    async def _cleanup_loop(self):
        """Background task to cleanup expired codes"""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                now = datetime.now()
                expired = [
                    code for code, pairing in self.active_codes.items()
                    if pairing.expires_at < now
                ]
                
                for code in expired:
                    logger.info(f"[Pairing] Removing expired code: {code}")
                    del self.active_codes[code]
                
                if expired:
                    logger.info(f"[Pairing] Cleaned up {len(expired)} expired codes")
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[Pairing] Cleanup error: {e}")
    
    def generate_code(self, device_id: str, socket_id: str) -> PairingCode:
        """
        Generate a new pairing code for a device
        
        Args:
            device_id: Unique device identifier
            socket_id: Socket.IO connection ID
            
        Returns:
            PairingCode object
        """
        # Generate 6-character alphanumeric code (excluding ambiguous chars)
        chars = string.ascii_uppercase + string.digits
        chars = chars.replace('O', '').replace('0', '').replace('I', '').replace('1', '')
        
        # Ensure code is unique
        code = None
        for _ in range(10):
            code = ''.join(secrets.choice(chars) for _ in range(6))
            if code not in self.active_codes:
                break
        
        if not code or code in self.active_codes:
            raise RuntimeError("Failed to generate unique pairing code")
        
        # Create pairing code
        pairing = PairingCode(code, device_id)
        pairing.device_socket_id = socket_id
        self.active_codes[code] = pairing
        self.device_sockets[device_id] = socket_id
        
        logger.info(f"[Pairing] Generated code {code} for device {device_id}")
        
        return pairing
    
    def validate_code(self, code: str) -> tuple[bool, Optional[str]]:
        """
        Validate a pairing code
        
        Args:
            code: Pairing code to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        code = code.upper().strip()
        
        if code not in self.active_codes:
            return False, "Invalid pairing code"
        
        pairing = self.active_codes[code]
        
        if not pairing.is_valid():
            if pairing.used:
                return False, "Code has already been used"
            else:
                return False, "Code has expired"
        
        return True, None
    
    def get_pairing(self, code: str) -> Optional[PairingCode]:
        """Get pairing by code"""
        return self.active_codes.get(code.upper().strip())
    
    def get_device_socket(self, device_id: str) -> Optional[str]:
        """Get socket ID for a device"""
        return self.device_sockets.get(device_id)
    
    def mark_code_used(self, code: str):
        """Mark a code as used"""
        code = code.upper().strip()
        if code in self.active_codes:
            self.active_codes[code].mark_used()
            logger.info(f"[Pairing] Code {code} marked as used")
    
    def remove_device(self, device_id: str):
        """Remove device and associated code"""
        if device_id in self.device_sockets:
            del self.device_sockets[device_id]
        
        # Remove associated code
        to_remove = [
            code for code, pairing in self.active_codes.items()
            if pairing.device_id == device_id
        ]
        
        for code in to_remove:
            del self.active_codes[code]
        
        logger.info(f"[Pairing] Removed device {device_id}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get pairing service statistics"""
        active = sum(1 for p in self.active_codes.values() if p.is_valid())
        expired = sum(1 for p in self.active_codes.values() if not p.is_valid())
        
        return {
            "active_codes": active,
            "expired_codes": expired,
            "total_codes": len(self.active_codes),
            "connected_devices": len(self.device_sockets)
        }


# Global pairing service instance
pairing_service = PairingService()
