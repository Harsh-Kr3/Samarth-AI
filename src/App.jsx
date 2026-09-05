import React, { useState, useCallback, useEffect } from 'react';
import HomeScreen from './components/HomeScreen';
import ScanSurroundings from './components/ScanSurroundings';
import ReadText from './components/ReadText';
import VoiceAssistant from './components/VoiceAssistant';
import LanguageSettings from './components/LanguageSettings';
import Navbar from './components/Navbar';
import { speak } from './services/tts';
import { GREETINGS } from './utils/constants';
import { useVoiceWakeAssistant } from './utils/useVoiceWakeAssistant';
import './index.css';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [language, setLanguage] = useState(() => localStorage.getItem('samarth_lang') || 'en-IN');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('samarth_key') || '');
  const [demoMode, setDemoMode] = useState(() => !localStorage.getItem('samarth_key'));
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const nav = useCallback((s) => setScreen(s), []);

  const ttsSpeak = useCallback((text, langOverride) => {
    if (!voiceEnabled) return;
    speak(text, { lang: langOverride || language });
  }, [voiceEnabled, language]);

  const handleLanguageChange = useCallback((lang) => {
    setLanguage(lang);
    localStorage.setItem('samarth_lang', lang);
  }, []);

  const handleApiKeyChange = useCallback((key) => {
    setApiKey(key);
    if (key.trim()) {
      localStorage.setItem('samarth_key', key.trim());
      setDemoMode(false);
    } else {
      localStorage.removeItem('samarth_key');
      setDemoMode(true);
    }
  }, []);

  const toggleDemoMode = useCallback(() => {
    setDemoMode(d => !d);
  }, []);

  // Initialize Desktop Voice Wake Assistant
  const { wakeState, isMicReady, startListening } = useVoiceWakeAssistant({
    onNavigate: nav,
    currentLanguage: language,
    onLanguageChange: handleLanguageChange,
    ttsSpeak
  });

  // Welcome greeting
  useEffect(() => {
    const greeting = GREETINGS[language] || GREETINGS['en-IN'];
    const timer = setTimeout(() => ttsSpeak(greeting), 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appState = { language, apiKey, demoMode };

  return (
    <div 
      className="app-root" 
      role="application" 
      aria-label="SAMARTH AI Accessibility Assistant"
      onClick={() => {
        if (!isMicReady) startListening();
      }}
    >
      {/* Desktop Mic Activation & Status Pill */}
      {!isMicReady ? (
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            startListening();
          }}
          style={{
            position: 'fixed',
            top: 14,
            right: 18,
            zIndex: 9999,
            background: 'linear-gradient(135deg, #0284c7, #0d9488)',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 999,
            padding: '7px 16px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span>🎙️ Click to Enable Voice Wake</span>
        </button>
      ) : (
        <div 
          style={{
            position: 'fixed',
            top: 14,
            right: 18,
            zIndex: 9999,
            background: 'rgba(6, 78, 59, 0.85)',
            border: '1px solid #10b981',
            borderRadius: 999,
            padding: '5px 14px',
            color: '#6ee7b7',
            fontSize: '11.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
          <span>Listening for "SAMARTH I need help"</span>
        </div>
      )}

      {/* Floating Active Wake Banner */}
      {wakeState === 'LISTENING_COMMAND' && (
        <div style={{
          position: 'fixed',
          top: 70,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: '#071524',
          border: '1.5px solid #00dbe9',
          boxShadow: '0 0 30px rgba(0, 219, 233, 0.65)',
          borderRadius: 999,
          padding: '10px 24px',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#00dbe9' }} />
          <span>Listening: "Sure, ask anything..."</span>
        </div>
      )}

      <div aria-live="polite" aria-atomic="true" className="sr-only" id="live-region" />

      <Navbar
        onHome={() => nav('home')}
        language={language}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled(v => !v)}
        demoMode={demoMode}
        onToggleDemo={toggleDemoMode}
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
      />

      <main id="main-content" className="main-content" role="main">
        {screen === 'home' && (
          <HomeScreen
            onNavigate={nav}
            onSelectFeature={nav}
            language={language}
            appState={appState}
            ttsSpeak={ttsSpeak}
          />
        )}
        {screen === 'scan' && (
          <ScanSurroundings
            onBack={() => nav('home')}
            appState={appState}
            ttsSpeak={ttsSpeak}
          />
        )}
        {screen === 'read' && (
          <ReadText
            onBack={() => nav('home')}
            appState={appState}
            ttsSpeak={ttsSpeak}
          />
        )}
        {screen === 'voice' && (
          <VoiceAssistant
            onBack={() => nav('home')}
            appState={appState}
            ttsSpeak={ttsSpeak}
            onNavigate={nav}
          />
        )}
        {screen === 'language' && (
          <LanguageSettings
            onBack={() => nav('home')}
            language={language}
            onLanguageChange={handleLanguageChange}
            ttsSpeak={ttsSpeak}
          />
        )}
      </main>
    </div>
  );
}