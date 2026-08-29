import React, { useState } from 'react';
import { Volume2, VolumeX, Home, Key, X, Eye } from 'lucide-react';

export default function Navbar({
  onHome,
  language,
  voiceEnabled,
  onToggleVoice,
  demoMode,
  onToggleDemo,
  apiKey,
  onApiKeyChange,
}) {
  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey || '');

  const saveKey = () => {
    onApiKeyChange(keyInput);
    setShowKey(false);
  };

  return (
    <nav className="navbar" role="navigation" aria-label="SAMARTH AI navigation">
      <div className="navbar-inner">
        {/* Brand */}
        <button
          className="navbar-brand"
          onClick={onHome}
          aria-label="SAMARTH AI home"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div className="navbar-logo" aria-hidden="true">🦯</div>
          <div>
            <div className="navbar-title">SAMARTH AI</div>
            <div className="navbar-subtitle">आवाहन — Visual Assistant</div>
          </div>
        </button>

        {/* Actions */}
        <div className="navbar-actions">
          {/* Demo mode indicator */}
          <div
            className="nav-pill"
            style={demoMode ? {} : { color: 'var(--color-success)', borderColor: 'rgba(16,185,129,0.3)' }}
            title={demoMode ? 'Running in demo mode — add API key for real AI' : 'Gemini AI active'}
          >
            <div
              className="status-dot"
              style={{ background: demoMode ? 'var(--color-warning)' : 'var(--color-success)' }}
            />
            {demoMode ? 'Demo Mode' : 'AI Active'}
          </div>

          {/* Language pill */}
          <div className="nav-pill" aria-label={`Current language: ${language}`}>
            <span aria-hidden="true">🌐</span>
            <span>{language.split('-')[0].toUpperCase()}</span>
          </div>

          {/* Voice toggle */}
          <button
            className={`icon-btn ${voiceEnabled ? 'active' : ''}`}
            onClick={onToggleVoice}
            aria-label={voiceEnabled ? 'Disable voice feedback' : 'Enable voice feedback'}
            aria-pressed={voiceEnabled}
            title={voiceEnabled ? 'Voice On' : 'Voice Off'}
          >
            {voiceEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>

          {/* API Key */}
          <button
            className={`icon-btn ${apiKey ? 'active' : ''}`}
            onClick={() => setShowKey(s => !s)}
            aria-label="Configure Gemini API key"
            aria-expanded={showKey}
            title="API Key Settings"
          >
            <Key size={17} />
          </button>

          {/* Home */}
          <button
            className="icon-btn"
            onClick={onHome}
            aria-label="Go to home screen"
            title="Home"
          >
            <Home size={17} />
          </button>
        </div>
      </div>

      {/* API Key panel */}
      {showKey && (
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '12px 24px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderTop: '1px solid var(--glass-border)',
            background: 'rgba(245,158,11,0.04)',
          }}
          role="region"
          aria-label="API key configuration"
        >
          <span style={{ fontSize: '0.875rem', color: 'var(--color-warning)', flexShrink: 0, fontWeight: 600 }}>
            🔑 Gemini API Key:
          </span>
          <input
            type="password"
            className="api-key-input"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="AIza... (get from aistudio.google.com)"
            aria-label="Enter Gemini API key"
            onKeyDown={e => e.key === 'Enter' && saveKey()}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={saveKey}
            aria-label="Save API key"
          >
            Save
          </button>
          <button
            className="btn btn-ghost btn-sm btn-icon-only"
            onClick={() => setShowKey(false)}
            aria-label="Close API key panel"
          >
            <X size={14} />
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', flexShrink: 0 }}>
            Key is stored locally only
          </span>
        </div>
      )}
    </nav>
  );
}
