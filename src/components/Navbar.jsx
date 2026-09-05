import React from 'react';
import { Volume2, VolumeX, Home } from 'lucide-react';

export default function Navbar({
  onHome,
  language,
  voiceEnabled,
  onToggleVoice,
  demoMode,
}) {
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
          <div className="navbar-logo brand-logo-circular" aria-hidden="true">
            <span className="logo-sparkle">𖣠</span>
          </div>
          <div>
            <div className="navbar-title">SAMARTH AI</div>
            <div className="navbar-subtitle">समर्थ— Visual Assistant</div>
          </div>
        </button>

        {/* Actions */}
        <div className="navbar-actions">
          {/* Status Indicator */}
          <div
            className="nav-pill"
            style={{
              color: 'var(--color-success)',
              borderColor: 'rgba(16,185,129,0.3)',
            }}
            title="Gemini AI active"
          >
            <div
              className="status-dot"
              style={{ background: 'var(--color-success)' }}
            />
            <span></span>
          </div>

          {/* Language Pill */}
          <div className="nav-pill" aria-label={`Current language: ${language}`}>
            <span aria-hidden="true">🌐</span>
            <span>{language ? language.split('-')[0].toUpperCase() : 'EN'}</span>
          </div>

          {/* Voice Feedback Toggle */}
          <button
            className={`icon-btn ${voiceEnabled ? 'active' : ''}`}
            onClick={onToggleVoice}
            aria-label={voiceEnabled ? 'Disable voice feedback' : 'Enable voice feedback'}
            aria-pressed={voiceEnabled}
            title={voiceEnabled ? 'Voice On' : 'Voice Off'}
          >
            {voiceEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>

          {/* Home Button */}
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
    </nav>
  );
}