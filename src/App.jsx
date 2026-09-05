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
  const [screenProps, setScreenProps] = useState({});
  const [language, setLanguage] = useState(() => localStorage.getItem('samarth_lang') || 'en-IN');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('samarth_key') || '');
  const [demoMode, setDemoMode] = useState(() => !localStorage.getItem('samarth_key'));
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const nav = useCallback((s, props = {}) => {
    setScreen(s);
    setScreenProps(props);
  }, []);

  const ttsSpeak = useCallback((text, langOverride) => {
    if (!voiceEnabled) return;
    const speechFriendlyText = (text || '')
      .replace(/SAMARTH AI/gi, 'Samarth AI')
      .replace(/SAMARTH/gi, 'Samarth');
    speak(speechFriendlyText, { lang: langOverride || language });
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

  // Voice Assistant Hook
  const { isMicReady, isListeningForCommand, startListening, heardText } = useVoiceWakeAssistant({
    onNavigate: nav,
    currentLanguage: language,
    onLanguageChange: handleLanguageChange,
    ttsSpeak
  });

  // Play Greeting first, then start listening EXACTLY when greeting ends
  useEffect(() => {
    const greetingText = GREETINGS[language] || GREETINGS['en-IN'];

    const triggerGreetingAndListen = () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(greetingText);
        utterance.lang = language?.startsWith('hi') ? 'hi-IN' : 'en-IN';
        utterance.rate = 1.0;

        // Exact handoff: Start listening the instant speech finishes
        utterance.onend = () => {
          console.log('[Samarth AI] Greeting finished. Ear activated.');
          startListening();
        };
        utterance.onerror = () => {
          startListening();
        };

        window.speechSynthesis.speak(utterance);
      } else {
        ttsSpeak(greetingText);
        setTimeout(() => startListening(), 3500);
      }
    };

    // User gesture listener for browser auto-play unlock
    const handleFirstGesture = () => {
      triggerGreetingAndListen();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    // Attempt automatic playback
    const autoTimer = setTimeout(() => {
      triggerGreetingAndListen();
    }, 600);

    window.addEventListener('click', handleFirstGesture);
    window.addEventListener('touchstart', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);

    return () => {
      clearTimeout(autoTimer);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, [language, startListening, ttsSpeak]);

  const appState = { language, apiKey, demoMode };

  return (
    <div 
      className="app-root" 
      role="application" 
      aria-label="Samarth AI Accessibility Assistant"
    >
      {/* Visual Status Indicator */}
      <div 
        style={{
          position: 'fixed',
          top: 14,
          right: 18,
          zIndex: 9999,
          background: isMicReady ? 'rgba(6, 78, 59, 0.95)' : 'rgba(30, 41, 59, 0.9)',
          border: `1px solid ${isMicReady ? '#10b981' : 'rgba(255,255,255,0.2)'}`,
          borderRadius: 999,
          padding: '6px 16px',
          color: isMicReady ? '#6ee7b7' : '#94a3b8',
          fontSize: '12px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
          cursor: isMicReady ? 'default' : 'pointer'
        }}
        onClick={() => !isMicReady && startListening()}
      >
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isMicReady ? '#34d399' : '#f59e0b',
          boxShadow: isMicReady ? '0 0 8px #47dfa7' : 'none'
        }} />
        <span>{isMicReady ? 'Listening for commands...' : ' Voice Enabled'}</span>
      </div>

      {heardText && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(0, 219, 233, 0.4)',
          borderRadius: 999,
          padding: '6px 18px',
          fontSize: '12px',
          color: '#38bdf8'
        }}>
          Heard: "{heardText}"
        </div>
      )}

      <div aria-live="polite" aria-atomic="true" className="sr-only" id="live-region" />

      {screen !== 'home' && (
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
      )}

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
            autoCapture={Boolean(screenProps.autoCapture)}
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