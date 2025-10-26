/**
 * Device Pairing View for Rabbit R1
 * Displays pairing code and QR code for easy credential setup
 */
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import QRCode from 'qrcode';
import './DevicePairingView.css';

const DevicePairingView = () => {
  const [pairingCode, setPairingCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, requesting, waiting, paired, error
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);

  // Get device ID from localStorage or generate new one
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('r1_device_id');
    if (!deviceId) {
      deviceId = `r1-${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('r1_device_id', deviceId);
    }
    return deviceId;
  };

  useEffect(() => {
    // Connect to Socket.IO server
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3451';
    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('[Pairing] Connected to server');
    });

    newSocket.on('disconnect', () => {
      console.log('[Pairing] Disconnected from server');
      setStatus('error');
      setError('Disconnected from server');
    });

    // Listen for pairing code
    newSocket.on('pair_code', async (data) => {
      console.log('[Pairing] Received code:', data.code);
      setPairingCode(data.code);
      setExpiresIn(data.expires_in);
      setStatus('waiting');

      // Generate QR code
      try {
        const pairingUrl = data.pairing_url || `https://pair.r-pod.app/?code=${data.code}`;
        const qrUrl = await QRCode.toDataURL(pairingUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(qrUrl);
      } catch (err) {
        console.error('[Pairing] QR code generation error:', err);
      }
    });

    // Listen for credentials from pairing client
    newSocket.on('pair_credentials', (data) => {
      console.log('[Pairing] Received credentials');
      
      // Store credentials in localStorage
      localStorage.setItem('ytm_cookie', data.cookie);
      localStorage.setItem('ytm_profile', data.profile || '0');
      if (data.channel_id) {
        localStorage.setItem('ytm_channel_id', data.channel_id);
      }
      if (data.brand_account_id) {
        localStorage.setItem('ytm_brand_account_id', data.brand_account_id);
      }

      setStatus('paired');
      
      // Confirm pairing success
      newSocket.emit('pair_confirm', {
        code: pairingCode,
        success: true
      });

      // Reload app after 2 seconds to apply new credentials
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    });

    // Listen for errors
    newSocket.on('pair_error', (data) => {
      console.error('[Pairing] Error:', data.error);
      setStatus('error');
      setError(data.error);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (expiresIn > 0 && status === 'waiting') {
      const timer = setInterval(() => {
        setExpiresIn(prev => {
          if (prev <= 1) {
            setStatus('error');
            setError('Pairing code expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [expiresIn, status]);

  const requestPairingCode = () => {
    if (!socket) {
      setError('Not connected to server');
      return;
    }

    setStatus('requesting');
    setError('');

    const deviceId = getDeviceId();
    
    socket.emit('pair_request', { device_id: deviceId });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="device-pairing-view">
      <div className="pairing-header">
        <h2>Device Pairing</h2>
        <p className="pairing-subtitle">Configure your R1 from any device</p>
      </div>

      <div className="pairing-content">
        {status === 'idle' && (
          <div className="pairing-idle">
            <p className="info-text">
              Pair your R1 device with a web browser to easily configure
              YouTube Music credentials without typing.
            </p>
            <button className="primary-button" onClick={requestPairingCode}>
              Generate Pairing Code
            </button>
          </div>
        )}

        {status === 'requesting' && (
          <div className="pairing-requesting">
            <div className="spinner"></div>
            <p>Generating pairing code...</p>
          </div>
        )}

        {status === 'waiting' && (
          <div className="pairing-waiting">
            <div className="pairing-code-display">
              <h3>Pairing Code</h3>
              <div className="code-box">
                {pairingCode}
              </div>
              <p className="expires-text">
                Expires in: <strong>{formatTime(expiresIn)}</strong>
              </p>
            </div>

            {qrCodeUrl && (
              <div className="qr-code-section">
                <p className="scan-text">Scan with your phone</p>
                <img src={qrCodeUrl} alt="Pairing QR Code" className="qr-code" />
              </div>
            )}

            <div className="pairing-instructions">
              <h4>How to pair:</h4>
              <ol>
                <li>Visit <strong>pair.r-pod.app</strong> on any device</li>
                <li>Enter the code: <strong>{pairingCode}</strong></li>
                <li>Follow the setup wizard</li>
                <li>Your R1 will auto-configure!</li>
              </ol>
            </div>

            <div className="waiting-indicator">
              <div className="pulse"></div>
              <p>Waiting for pairing...</p>
            </div>
          </div>
        )}

        {status === 'paired' && (
          <div className="pairing-success">
            <div className="success-icon">✓</div>
            <h3>Pairing Successful!</h3>
            <p>Your R1 has been configured.</p>
            <p className="reload-text">Reloading in 2 seconds...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="pairing-error">
            <div className="error-icon">✕</div>
            <h3>Pairing Failed</h3>
            <p className="error-message">{error}</p>
            <button className="primary-button" onClick={requestPairingCode}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevicePairingView;
