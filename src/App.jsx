import React, { useState, useCallback, useEffect } from 'react';
import HomeScreen from './components/HomeScreen';
import ScanSurroundings from './components/ScanSurroundings';
import ReadText from './components/ReadText';
import VoiceAssistant from './components/VoiceAssistant';
import LanguageSettings from './components/LanguageSettings';
import Navbar from './components/Navbar';
import { speak } from './services/tts';
import { GREETINGS } from './utils/constants';
import './index.css';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [language, setLanguage] = useState(() => localStorage.getItem('samarth_lang') || 'en-IN');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('samarth_key') || '');
  const [demoMode, setDemoMode] = useState(() => !localStorage.getItem('samarth_key'));
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const nav = useCallback((s) => setScreen(s), []);

  const ttsSpeak = useCallback((text) => {
    if (!voiceEnabled) return;
    speak(text, { lang: language });
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

  // Greet on load
  useEffect(() => {
    const greeting = GREETINGS[language] || GREETINGS['en-IN'];
    const timer = setTimeout(() => ttsSpeak(greeting), 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appState = { language, apiKey, demoMode };

  return (
    <div className="app-root" role="application" aria-label="SAMARTH AI Accessibility Assistant">
      {/* ARIA Live region for screen reader announcements */}
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
            language={language}
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
