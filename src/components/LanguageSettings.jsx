import React, { useState } from 'react';
import { ArrowLeft, Volume2, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, GREETINGS } from '../utils/constants';

export default function LanguageSettings({ onBack, language, onLanguageChange, ttsSpeak }) {
  const [previewing, setPreviewing] = useState(null);

  const preview = (lang) => {
    setPreviewing(lang);
    const greeting = GREETINGS[lang] || GREETINGS['en-IN'];
    ttsSpeak(greeting);
    setTimeout(() => setPreviewing(null), 3000);
  };

  const selectLanguage = (lang) => {
    onLanguageChange(lang);
    const greeting = GREETINGS[lang] || GREETINGS['en-IN'];
    ttsSpeak(greeting);
  };

  return (
    <div className="screen">
      {/* Header */}
      <div className="screen-header">
        <button className="back-btn" onClick={onBack} aria-label="Go back to home">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="screen-title">🌐 Language Settings</div>
          <div className="screen-subtitle">Choose your preferred language for voice and responses</div>
        </div>
      </div>

      {/* Current */}
      <div
        style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
        role="status"
        aria-label={`Currently selected language: ${SUPPORTED_LANGUAGES.find(l => l.code === language)?.name}`}
      >
        <span style={{ fontSize: 28 }}>{SUPPORTED_LANGUAGES.find(l => l.code === language)?.flag}</span>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)' }}>
            Current: {SUPPORTED_LANGUAGES.find(l => l.code === language)?.name}
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-3)' }}>
            {SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeName}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => preview(language)}
          aria-label="Hear greeting in current language"
          style={{ marginLeft: 'auto' }}
        >
          <Volume2 size={14} />
          Preview Voice
        </button>
      </div>

      {/* Language grid */}
      <div
        className="lang-grid"
        role="radiogroup"
        aria-label="Select language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = lang.code === language;
          const isPreviewing = previewing === lang.code;

          return (
            <button
              key={lang.code}
              className={`lang-card ${isSelected ? 'selected' : ''}`}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${lang.name} — ${lang.nativeName}${isSelected ? ', currently selected' : ''}`}
              onClick={() => selectLanguage(lang.code)}
            >
              <span className="lang-flag">{lang.flag}</span>
              <span className="lang-name">{lang.name}</span>
              <span className="lang-native">{lang.nativeName}</span>

              <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                {isSelected && (
                  <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                    <Check size={10} /> Active
                  </span>
                )}
                <button
                  className="btn btn-ghost"
                  style={{ padding: '3px 8px', fontSize: '0.65rem', borderRadius: 99 }}
                  onClick={(e) => { e.stopPropagation(); preview(lang.code); }}
                  aria-label={`Hear ${lang.name} greeting`}
                  disabled={isPreviewing}
                >
                  {isPreviewing ? '🔊...' : '🔊'}
                </button>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info card */}
      <div className="card" style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>ℹ️</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 6 }}>
              About Multilingual Support
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)', lineHeight: 1.7 }}>
              SAMARTH AI uses Gemini's multilingual capabilities for text responses and the Web Speech API 
              for voice output. Language quality depends on your device's installed voice packs. 
              For best results with Indian languages, ensure the relevant TTS voice is installed on your device.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {SUPPORTED_LANGUAGES.map(l => (
                <span key={l.code} className="badge badge-accent">{l.flag} {l.name}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
