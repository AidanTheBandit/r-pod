import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { getBackendUrl } from './config';
import './App.css';

function App() {
  const [step, setStep] = useState('code'); // code, credentials, testing, success
  const [pairingCode, setPairingCode] = useState('');
  const [ytmCookie, setYtmCookie] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [channelId, setChannelId] = useState('');
  const [brandAccountId, setBrandAccountId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Get code from URL if present
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setPairingCode(code.toUpperCase());
    }

    // Connect to Socket.IO using auto-detected URL
    const backendUrl = getBackendUrl();
    
    console.log('[Pairing Client] Connecting to backend:', backendUrl);
    
    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('[Pairing Client] Connected');
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const validateCode = async () => {
    if (!pairingCode || pairingCode.length !== 6) {
      setError('Please enter a 6-character pairing code');
      return;
    }

    setLoading(true);
    setError('');

    socket.emit('pair_validate', { code: pairingCode }, (response) => {
      setLoading(false);
      if (response.valid) {
        setStep('credentials');
      } else {
        setError(response.error || 'Invalid pairing code');
      }
    });

    // Listen for validation result
    socket.once('pair_validate_result', (response) => {
      setLoading(false);
      if (response.valid) {
        setStep('credentials');
      } else {
        setError(response.error || 'Invalid pairing code');
      }
    });
  };

  const detectAccounts = async () => {
    if (!ytmCookie) {
      setError('Please enter your YouTube Music cookie');
      return;
    }

    setLoading(true);
    setError('');

    socket.emit('pair_detect_accounts', { cookie: ytmCookie });

    socket.once('pair_accounts_result', (response) => {
      setLoading(false);
      if (response.success) {
        setAccounts(response.accounts);
        if (response.accounts.length > 0) {
          setSelectedAccount(response.accounts[0].index.toString());
        }
      } else {
        setError(response.error || 'Failed to detect accounts');
      }
    });
  };

  const testCredentials = async () => {
    if (!ytmCookie) {
      setError('Please enter your YouTube Music cookie');
      return;
    }

    setLoading(true);
    setError('');

    socket.emit('pair_test_credentials', {
      cookie: ytmCookie,
      profile: selectedAccount || '0'
    });

    socket.once('pair_test_result', (response) => {
      setLoading(false);
      if (response.success) {
        alert(`✓ ${response.message}`);
      } else {
        setError(response.error || 'Connection test failed');
      }
    });
  };

  const submitPairing = async () => {
    if (!ytmCookie) {
      setError('Please enter your YouTube Music cookie');
      return;
    }

    setLoading(true);
    setError('');
    setStep('testing');

    socket.emit('pair_submit', {
      code: pairingCode,
      credentials: {
        cookie: ytmCookie,
        profile: selectedAccount || '0',
        channel_id: channelId,
        brand_account_id: brandAccountId
      }
    });

    socket.once('pair_submit_result', (response) => {
      setLoading(false);
      if (response.success) {
        setStep('success');
      } else {
        setError(response.error || 'Pairing failed');
        setStep('credentials');
      }
    });
  };

  const getCookieFromBrowser = () => {
    alert(
      'To get your YouTube Music cookie:\n\n' +
      '1. Open Chrome and go to music.youtube.com\n' +
      '2. Login to your account\n' +
      '3. Press F12 (or Cmd+Option+I on Mac)\n' +
      '4. Click the "Network" tab\n' +
      '5. Filter by "browse"\n' +
      '6. Click any browse request\n' +
      '7. Find "Cookie:" in Request Headers\n' +
      '8. Copy the entire cookie value'
    );
  };

  return (
    <div className="pairing-app">
      <div className="pairing-container">
        <div className="pairing-logo">
          <h1>🎵 R-Pod</h1>
          <p>Device Pairing</p>
        </div>

        {/* Step 1: Enter Code */}
        {step === 'code' && (
          <div className="step-container">
            <h2>Enter Pairing Code</h2>
            <p className="step-description">
              Enter the 6-character code displayed on your R1 device
            </p>

            <input
              type="text"
              className="code-input"
              placeholder="ABCD12"
              maxLength={6}
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
              autoFocus
            />

            {error && <div className="error-message">{error}</div>}

            <button
              className="primary-btn"
              onClick={validateCode}
              disabled={loading}
            >
              {loading ? 'Validating...' : 'Continue'}
            </button>
          </div>
        )}

        {/* Step 2: Enter Credentials */}
        {step === 'credentials' && (
          <div className="step-container">
            <h2>Configure YouTube Music</h2>
            <p className="step-description">
              Code: <strong>{pairingCode}</strong>
            </p>

            <div className="form-group">
              <label>YouTube Music Cookie</label>
              <textarea
                className="cookie-input"
                placeholder="Paste your cookie here..."
                rows={4}
                value={ytmCookie}
                onChange={(e) => setYtmCookie(e.target.value)}
              />
              <button className="help-btn" onClick={getCookieFromBrowser}>
                How to get cookie?
              </button>
            </div>

            {ytmCookie && (
              <>
                <button
                  className="secondary-btn"
                  onClick={detectAccounts}
                  disabled={loading}
                >
                  {loading ? 'Detecting...' : 'Detect Accounts'}
                </button>

                {accounts.length > 0 && (
                  <div className="form-group">
                    <label>Select Account</label>
                    <select
                      className="account-select"
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                    >
                      {accounts.map((account) => (
                        <option
                          key={account.index}
                          value={account.index}
                        >
                          Account {account.index} - {account.first_section}
                          {account.is_personal && ' (Personal)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Channel ID (Optional)</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="UC..."
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Brand Account ID (Optional)</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Brand account ID"
                    value={brandAccountId}
                    onChange={(e) => setBrandAccountId(e.target.value)}
                  />
                </div>
              </>
            )}

            {error && <div className="error-message">{error}</div>}

            <div className="button-group">
              <button
                className="secondary-btn"
                onClick={testCredentials}
                disabled={loading || !ytmCookie}
              >
                Test Connection
              </button>
              <button
                className="primary-btn"
                onClick={submitPairing}
                disabled={loading || !ytmCookie}
              >
                Pair Device
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Testing */}
        {step === 'testing' && (
          <div className="step-container text-center">
            <div className="spinner"></div>
            <h2>Pairing Device...</h2>
            <p>Sending credentials to your R1</p>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="step-container text-center">
            <div className="success-icon">✓</div>
            <h2>Pairing Successful!</h2>
            <p>Your R1 device has been configured.</p>
            <p className="success-note">
              You can close this window now.
            </p>
          </div>
        )}
      </div>

      <footer className="pairing-footer">
        <p>R-Pod Device Pairing System</p>
        <p className="footer-note">Your credentials are sent securely and not stored</p>
      </footer>
    </div>
  );
}

export default App;
