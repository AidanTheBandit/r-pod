import { useState } from 'react'
import { backendAPI } from '../services/backendClient'
import ListView from '../components/ListView'
import './SettingsView.css'

function SettingsView() {
  const [selectedService, setSelectedService] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState({})

  // Service configuration state
  const [serviceConfigs, setServiceConfigs] = useState({
    spotify: { clientId: '', clientSecret: '', accessToken: '', refreshToken: '' },
    youtubeMusic: { cookie: '' },
    subsonic: { serverUrl: '', username: '', password: '' },
    navidrome: { serverUrl: '', username: '', password: '' },
    jellyfin: { serverUrl: '', apiKey: '', userId: '' }
  })

  // Main settings menu
  const settingsItems = [
    {
      id: 'spotify',
      title: 'Spotify',
      subtitle: connectionStatus.spotify ? 'Connected' : 'Not connected',
    },
    {
      id: 'youtubeMusic',
      title: 'YouTube Music',
      subtitle: connectionStatus.youtubeMusic ? 'Connected' : 'Not connected',
    },
    {
      id: 'jellyfin',
      title: 'Jellyfin',
      subtitle: connectionStatus.jellyfin ? 'Connected' : 'Not connected',
    },
    {
      id: 'navidrome',
      title: 'Navidrome',
      subtitle: connectionStatus.navidrome ? 'Connected' : 'Not connected',
    },
    {
      id: 'subsonic',
      title: 'Subsonic',
      subtitle: connectionStatus.subsonic ? 'Connected' : 'Not connected',
    },
  ]

  const handleSettingClick = (item) => {
    setSelectedService(item.id)
  }

  const updateServiceConfig = (service, field, value) => {
    setServiceConfigs(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        [field]: value
      }
    }))
  }

  const handleConnectService = async (service) => {
    setConnecting(true)
    try {
      await backendAPI.connectService(service, serviceConfigs[service])
      setConnectionStatus(prev => ({ ...prev, [service]: true }))
      alert(`${service} connected successfully!`)
    } catch (error) {
      console.error(`Failed to connect ${service}:`, error)
      alert(`Failed to connect ${service}: ${error.message}`)
    } finally {
      setConnecting(false)
    }
  }

  // Render service configuration form
  const renderServiceConfig = () => {
    if (!selectedService) return null

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
            <div className="form-group">
              <label>YouTube Music Cookie</label>
              <textarea
                value={config.cookie}
                onChange={(e) => updateServiceConfig('youtubeMusic', 'cookie', e.target.value)}
                placeholder="Paste your YouTube Music cookie string here"
                rows={4}
              />
              <small>Get cookie from browser dev tools → Network → browse request</small>
            </div>
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
            <p>{connectionStatus[selectedService] ? '✅ Connected' : '❌ Not connected'}</p>
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
