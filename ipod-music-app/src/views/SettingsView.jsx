import { useState } from 'react'
import { useServiceStore } from '../store/serviceStore'
import ListView from '../components/ListView'
import './SettingsView.css'

function SettingsView() {
  const {
    services,
    backendServerUrl,
    useBackendServer,
    toggleService,
    updateService,
    setBackendServer,
    clearService,
  } = useServiceStore()
  
  const [selectedService, setSelectedService] = useState(null)
  const [showBackendConfig, setShowBackendConfig] = useState(false)
  
  // Main settings menu
  const settingsItems = [
    {
      id: 'backend',
      title: 'Backend Server',
      subtitle: useBackendServer ? 'Connected' : 'Not configured',
      icon: '🖥️',
    },
    {
      id: 'spotify',
      title: 'Spotify',
      subtitle: services.spotify.enabled ? 'Connected' : 'Not connected',
      icon: '🎵',
    },
    {
      id: 'appleMusic',
      title: 'Apple Music',
      subtitle: services.appleMusic.enabled ? 'Connected' : 'Not connected',
      icon: '🍎',
    },
    {
      id: 'youtubeMusic',
      title: 'YouTube Music',
      subtitle: services.youtubeMusic.enabled ? 'Connected' : 'Not connected',
      icon: '▶️',
    },
    {
      id: 'jellyfin',
      title: 'Jellyfin',
      subtitle: services.jellyfin.enabled ? 'Connected' : 'Not connected',
      icon: '📺',
    },
    {
      id: 'navidrome',
      title: 'Navidrome',
      subtitle: services.navidrome.enabled ? 'Connected' : 'Not connected',
      icon: '🎶',
    },
    {
      id: 'subsonic',
      title: 'Subsonic',
      subtitle: services.subsonic.enabled ? 'Connected' : 'Not connected',
      icon: '🎸',
    },
  ]
  
  const handleSettingClick = (item) => {
    if (item.id === 'backend') {
      setShowBackendConfig(true)
    } else {
      setSelectedService(item.id)
    }
  }
  
  // Render service configuration form
  const renderServiceConfig = () => {
    if (!selectedService) return null
    
    const serviceConfig = services[selectedService]
    const serviceName = settingsItems.find(s => s.id === selectedService)?.title
    
    return (
      <div className="service-config">
        <div className="config-header">
          <button onClick={() => setSelectedService(null)} className="back-btn">
            ‹ Back
          </button>
          <h2>{serviceName} Configuration</h2>
        </div>
        
        <div className="config-form">
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={serviceConfig.enabled}
                onChange={(e) => toggleService(selectedService, e.target.checked)}
              />
              Enable {serviceName}
            </label>
          </div>
          
          {/* OAuth services */}
          {['spotify', 'appleMusic', 'youtubeMusic'].includes(selectedService) && (
            <>
              <div className="form-group">
                <label>Client ID</label>
                <input
                  type="text"
                  value={serviceConfig.clientId || ''}
                  onChange={(e) => updateService(selectedService, { clientId: e.target.value })}
                  placeholder="Enter client ID"
                />
              </div>
              <div className="form-group">
                <label>Client Secret</label>
                <input
                  type="password"
                  value={serviceConfig.clientSecret || ''}
                  onChange={(e) => updateService(selectedService, { clientSecret: e.target.value })}
                  placeholder="Enter client secret"
                />
              </div>
              <button className="connect-btn">Connect with OAuth</button>
            </>
          )}
          
          {/* FOSS services with server URLs */}
          {['jellyfin', 'navidrome', 'subsonic'].includes(selectedService) && (
            <>
              <div className="form-group">
                <label>Server URL</label>
                <input
                  type="url"
                  value={serviceConfig.serverUrl || ''}
                  onChange={(e) => updateService(selectedService, { serverUrl: e.target.value })}
                  placeholder="https://your-server.com"
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={serviceConfig.username || ''}
                  onChange={(e) => updateService(selectedService, { username: e.target.value })}
                  placeholder="Enter username"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={serviceConfig.password || ''}
                  onChange={(e) => updateService(selectedService, { password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
              <button className="connect-btn">Test Connection</button>
            </>
          )}
          
          <button
            className="disconnect-btn"
            onClick={() => clearService(selectedService)}
          >
            Disconnect {serviceName}
          </button>
        </div>
      </div>
    )
  }
  
  // Render backend server configuration
  const renderBackendConfig = () => {
    return (
      <div className="service-config">
        <div className="config-header">
          <button onClick={() => setShowBackendConfig(false)} className="back-btn">
            ‹ Back
          </button>
          <h2>Backend Server</h2>
        </div>
        
        <div className="config-form">
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={useBackendServer}
                onChange={(e) => setBackendServer(backendServerUrl, null, e.target.checked)}
              />
              Use Backend Server
            </label>
          </div>
          
          <div className="form-group">
            <label>Server URL</label>
            <input
              type="url"
              value={backendServerUrl || ''}
              onChange={(e) => setBackendServer(e.target.value, null, useBackendServer)}
              placeholder="http://localhost:3001"
            />
          </div>
          
          <div className="form-group">
            <label>Server Password</label>
            <input
              type="password"
              placeholder="Enter server password"
            />
          </div>
          
          <button className="connect-btn">Test Connection</button>
          
          <div className="info-box">
            <strong>Backend Server Benefits:</strong>
            <ul>
              <li>Manage all services in one place</li>
              <li>Simplified OAuth flow</li>
              <li>Better security for credentials</li>
              <li>Multi-service search aggregation</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="settings-view view-wrapper">
      {selectedService ? (
        renderServiceConfig()
      ) : showBackendConfig ? (
        renderBackendConfig()
      ) : (
        <>
          <div className="settings-header">
            <p className="settings-description">
              Configure music streaming services. You can either use the backend server
              for easy management or connect services directly with your own OAuth keys.
            </p>
          </div>
          <ListView items={settingsItems} onItemClick={handleSettingClick} />
        </>
      )}
    </div>
  )
}

export default SettingsView
