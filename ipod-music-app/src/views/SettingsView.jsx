import { useState, useEffect } from 'react'
import { backendAPI, updateBackendConfig } from '../services/backendClient'
import { useServiceStore } from '../store/serviceStore'
import ListView from '../components/ListView'
import './SettingsView.css'

function SettingsView() {
  const { toggleService, services } = useServiceStore()
  const [selectedService, setSelectedService] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState({})
  const [backendConfig, setBackendConfig] = useState({
    url: 'http://localhost:3001',
    password: 'music-aggregator-2025'
  })
  const [backendStatus, setBackendStatus] = useState(null)

  // Service configuration state
  const [serviceConfigs, setServiceConfigs] = useState({
    spotify: { clientId: '', clientSecret: '', accessToken: '', refreshToken: '' },
    youtubeMusic: { cookie: '' },
    subsonic: { serverUrl: '', username: '', password: '' },
    navidrome: { serverUrl: '', username: '', password: '' },
    jellyfin: { serverUrl: '', apiKey: '', userId: '' }
  })

  // Load backend config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('backend-config')
    if (savedConfig) {
      try {
        setBackendConfig(JSON.parse(savedConfig))
      } catch (e) {
        console.error('Failed to parse saved backend config')
      }
    }

    // Load service configs
    const savedServiceConfigs = localStorage.getItem('service-configs')
    if (savedServiceConfigs) {
      try {
        setServiceConfigs(JSON.parse(savedServiceConfigs))
      } catch (e) {
        console.error('Failed to parse saved service configs')
      }
    }

    // Load connection status
    const savedConnectionStatus = localStorage.getItem('connection-status')
    if (savedConnectionStatus) {
      try {
        setConnectionStatus(JSON.parse(savedConnectionStatus))
      } catch (e) {
        console.error('Failed to parse saved connection status')
      }
    }
  }, [])

  // Save backend config to localStorage
  const saveBackendConfig = (config) => {
    setBackendConfig(config)
    localStorage.setItem('backend-config', JSON.stringify(config))
    // Update the global backend client config
    updateBackendConfig(config.url, config.password)
  }

  // Save service configs to localStorage
  const saveServiceConfig = (service, config) => {
    const newConfigs = { ...serviceConfigs, [service]: config }
    setServiceConfigs(newConfigs)
    localStorage.setItem('service-configs', JSON.stringify(newConfigs))
  }

  // Save connection status to localStorage
  const saveConnectionStatus = (service, connected) => {
    const newStatus = { ...connectionStatus, [service]: connected }
    setConnectionStatus(newStatus)
    localStorage.setItem('connection-status', JSON.stringify(newStatus))
  }

  // Test backend connection
  const testBackendConnection = async () => {
    try {
      const response = await fetch(`${backendConfig.url}/health`, {
        headers: {
          'x-server-password': backendConfig.password
        }
      })
      if (response.ok) {
        const data = await response.json()
        setBackendStatus({ connected: true, data })
      } else {
        setBackendStatus({ connected: false, error: `HTTP ${response.status}` })
      }
    } catch (error) {
      setBackendStatus({ connected: false, error: error.message })
    }
  }

  // Main settings menu
  const settingsItems = [
    {
      id: 'backend',
      title: 'Backend Server',
      subtitle: backendStatus?.connected ? 'Connected' : 'Configure server',
    },
    {
      id: 'spotify',
      title: 'Spotify',
      subtitle: services.spotify.enabled ? 'Connected' : 'Not connected',
    },
    {
      id: 'youtubeMusic',
      title: 'YouTube Music',
      subtitle: services.youtubeMusic.enabled ? 'Connected' : 'Not connected',
    },
    {
      id: 'jellyfin',
      title: 'Jellyfin',
      subtitle: services.jellyfin.enabled ? 'Connected' : 'Not connected',
    },
    {
      id: 'navidrome',
      title: 'Navidrome',
      subtitle: services.navidrome.enabled ? 'Connected' : 'Not connected',
    },
    {
      id: 'subsonic',
      title: 'Subsonic',
      subtitle: services.subsonic.enabled ? 'Connected' : 'Not connected',
    },
  ]

  const handleSettingClick = (item) => {
    setSelectedService(item.id)
  }

  const updateServiceConfig = (service, field, value) => {
    const newConfig = { ...serviceConfigs[service], [field]: value }
    saveServiceConfig(service, newConfig)
  }

  const handleConnectService = async (service) => {
    setConnecting(true)
    try {
      await backendAPI.connectService(service, serviceConfigs[service])
      saveConnectionStatus(service, true)
      // Also enable the service in the serviceStore
      toggleService(service, true)
      alert(`${service} connected successfully!`)
    } catch (error) {
      console.error(`Failed to connect ${service}:`, error)
      saveConnectionStatus(service, false)
      // Disable the service in the serviceStore on failure
      toggleService(service, false)
      alert(`Failed to connect ${service}: ${error.message}`)
    } finally {
      setConnecting(false)
    }
  }

  // Render backend server configuration
  const renderBackendConfig = () => {
    return (
      <div className="service-config">
        <div className="config-header">
          <button onClick={() => setSelectedService(null)} className="back-btn">
            ‹ Back
          </button>
          <h2>Backend Server Configuration</h2>
        </div>

        <div className="config-form">
          <div className="form-group">
            <label>Server URL</label>
            <input
              type="url"
              value={backendConfig.url}
              onChange={(e) => setBackendConfig(prev => ({ ...prev, url: e.target.value }))}
              placeholder="http://localhost:3001"
            />
          </div>

          <div className="form-group">
            <label>Server Password</label>
            <input
              type="password"
              value={backendConfig.password}
              onChange={(e) => setBackendConfig(prev => ({ ...prev, password: e.target.value }))}
              placeholder="music-aggregator-2025"
            />
          </div>

          <div className="form-actions">
            <button
              className="connect-btn"
              onClick={testBackendConnection}
            >
              Test Connection
            </button>
            <button
              className="connect-btn"
              onClick={() => saveBackendConfig(backendConfig)}
            >
              Save Configuration
            </button>
          </div>

          {backendStatus && (
            <div className="info-box">
              <strong>Connection Status:</strong>
              <p style={{ color: backendStatus.connected ? 'green' : 'red' }}>
                {backendStatus.connected ? '✅ Connected' : `❌ ${backendStatus.error}`}
              </p>
              {backendStatus.data && (
                <div style={{ fontSize: '12px', marginTop: '8px' }}>
                  <p>Sessions: {backendStatus.data.sessions}</p>
                  <p>Status: {backendStatus.data.status}</p>
                  <p>Time: {new Date(backendStatus.data.timestamp).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}

          <div className="info-box">
            <strong>Backend Server Setup:</strong>
            <ul>
              <li>Run the backend server: <code>cd backend && node server.js</code></li>
              <li>Default URL: <code>http://localhost:3001</code></li>
              <li>Default Password: <code>music-aggregator-2025</code></li>
              <li>Change password in production for security</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // Render service configuration form
  const renderServiceConfig = () => {
    if (!selectedService) return null

    // Handle backend configuration separately
    if (selectedService === 'backend') {
      return renderBackendConfig()
    }

    const serviceName = settingsItems.find(s => s.id === selectedService)?.title
    const config = serviceConfigs[selectedService]

    return (
      <div className="service-config">
        <div className="config-header">
          <button onClick={() => setSelectedService(null)} className="back-btn">
            ‹ Back
          </button>
          <h2>{serviceName} Configuration</h2>
        </div>

        <div className="config-form">
          {/* Spotify Configuration */}
          {selectedService === 'spotify' && (
            <>
              <div className="form-group">
                <label>Client ID</label>
                <input
                  type="text"
                  value={config.clientId}
                  onChange={(e) => updateServiceConfig('spotify', 'clientId', e.target.value)}
                  placeholder="Enter Spotify Client ID"
                />
              </div>
              <div className="form-group">
                <label>Client Secret</label>
                <input
                  type="password"
                  value={config.clientSecret}
                  onChange={(e) => updateServiceConfig('spotify', 'clientSecret', e.target.value)}
                  placeholder="Enter Spotify Client Secret"
                />
              </div>
              <div className="form-group">
                <label>Access Token (optional)</label>
                <input
                  type="password"
                  value={config.accessToken}
                  onChange={(e) => updateServiceConfig('spotify', 'accessToken', e.target.value)}
                  placeholder="Enter access token"
                />
              </div>
              <div className="form-group">
                <label>Refresh Token (optional)</label>
                <input
                  type="password"
                  value={config.refreshToken}
                  onChange={(e) => updateServiceConfig('spotify', 'refreshToken', e.target.value)}
                  placeholder="Enter refresh token"
                />
              </div>
            </>
          )}

          {/* YouTube Music Configuration */}
          {selectedService === 'youtubeMusic' && (
            <>
              <div className="form-group">
                <label>YouTube Music Cookie</label>
                <textarea
                  value={config.cookie}
                  onChange={(e) => updateServiceConfig('youtubeMusic', 'cookie', e.target.value)}
                  placeholder="Paste your YouTube Music cookie string here"
                  rows={4}
                />
                <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
                  <strong>How to get your cookie:</strong>
                  <ol style={{ margin: '4px 0', paddingLeft: '20px' }}>
                    <li>Open Chrome and go to <code>music.youtube.com</code></li>
                    <li>Log in to your YouTube Music account</li>
                    <li>Open DevTools (F12) → Application tab</li>
                    <li>Go to Cookies → music.youtube.com</li>
                    <li>Find the cookie named <code>__Secure-3PAPISID</code> or similar</li>
                    <li>Copy the entire cookie value (very long string)</li>
                    <li>Paste it here</li>
                  </ol>
                  <strong>Note:</strong> Cookie expires after ~1 month. You'll need to update it periodically.
                  <br />
                  <strong>Alternative:</strong> Copy all cookies as a single string from the Network tab.
                </div>
              </div>

              <div className="form-group">
                <label>Profile Selection (Optional)</label>
                <select
                  value={config.profile || ''}
                  onChange={(e) => updateServiceConfig('youtubeMusic', 'profile', e.target.value)}
                >
                  <option value="">Default Profile</option>
                  <option value="personal">Personal Account</option>
                  <option value="brand">Brand Account</option>
                </select>
                <small>If you have multiple YouTube accounts, select which one to use</small>
              </div>
            </>
          )}

          {/* FOSS Services Configuration */}
          {['subsonic', 'navidrome', 'jellyfin'].includes(selectedService) && (
            <>
              <div className="form-group">
                <label>Server URL</label>
                <input
                  type="url"
                  value={config.serverUrl}
                  onChange={(e) => updateServiceConfig(selectedService, 'serverUrl', e.target.value)}
                  placeholder="https://your-server.com"
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={config.username}
                  onChange={(e) => updateServiceConfig(selectedService, 'username', e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div className="form-group">
                <label>Password / API Key</label>
                <input
                  type={selectedService === 'jellyfin' ? 'text' : 'password'}
                  value={selectedService === 'jellyfin' ? config.apiKey : config.password}
                  onChange={(e) => updateServiceConfig(selectedService,
                    selectedService === 'jellyfin' ? 'apiKey' : 'password', e.target.value)}
                  placeholder={selectedService === 'jellyfin' ? 'Enter API Key' : 'Enter password'}
                />
              </div>
              {selectedService === 'jellyfin' && (
                <div className="form-group">
                  <label>User ID (optional)</label>
                  <input
                    type="text"
                    value={config.userId}
                    onChange={(e) => updateServiceConfig('jellyfin', 'userId', e.target.value)}
                    placeholder="Enter user ID"
                  />
                </div>
              )}
            </>
          )}

          <button
            className="connect-btn"
            onClick={() => handleConnectService(selectedService)}
            disabled={connecting}
          >
            {connecting ? 'Connecting...' : 'Connect Service'}
          </button>

          <div className="info-box">
            <strong>Connection Status:</strong>
            <p>{services[selectedService]?.enabled ? '✅ Connected' : '❌ Not connected'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-view view-wrapper">
      {selectedService ? (
        renderServiceConfig()
      ) : (
        <>
          <div className="settings-header">
            <p className="settings-description">
              Connect your music streaming services. The backend aggregator will combine
              all your music into one unified library.
            </p>
          </div>
          <ListView items={settingsItems} onItemClick={handleSettingClick} />
        </>
      )}
    </div>
  )
}

export default SettingsView
