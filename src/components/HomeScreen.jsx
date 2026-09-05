import React, { useState, useEffect } from 'react';
import { ArrowRight, Mic } from 'lucide-react';
import { GREETINGS } from '../utils/constants';

const FEATURES = [
  {
    id: 'scan',
    icon: '🔍',
    title: 'Scan Surroundings',
    desc: 'Point your camera — AI describes the scene, objects, distances and directions around you.',
    color: '#6366F1',
    glow: 'rgba(99,102,241,0.5)',
    iconBg: 'rgba(99,102,241,0.15)',
    iconBorder: 'rgba(99,102,241,0.3)',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(99,102,241,0.02))',
  },
  {
    id: 'read',
    icon: '📄',
    title: 'Read Text',
    desc: 'Capture a sign, book, label or document — AI extracts all text and reads it aloud.',
    color: '#22D3EE',
    glow: 'rgba(34,211,238,0.4)',
    iconBg: 'rgba(34,211,238,0.12)',
    iconBorder: 'rgba(34,211,238,0.25)',
    gradient: 'linear-gradient(135deg, rgba(34,211,238,0.06), rgba(34,211,238,0.02))',
  },
  {
    id: 'voice',
    icon: '🎙️',
    title: 'Voice Assistant',
    desc: 'Talk naturally in your language — ask questions, give commands, get spoken answers.',
    color: '#10B981',
    glow: 'rgba(16,185,129,0.4)',
    iconBg: 'rgba(16,185,129,0.12)',
    iconBorder: 'rgba(16,185,129,0.25)',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.02))',
  },
  {
    id: 'language',
    icon: '🌐',
    title: 'Language Settings',
    desc: 'Switch between English, Hindi, Bengali, Tamil, Telugu, Marathi and more Indian languages.',
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.4)',
    iconBg: 'rgba(245,158,11,0.12)',
    iconBorder: 'rgba(245,158,11,0.25)',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02))',
  },
];

export default function HomeScreen({ onNavigate, language, ttsSpeak }) {
  const [listening, setListening] = useState(false);

  const handleVoiceCommand = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      ttsSpeak('Voice commands require Chrome or Edge browser.');
      return;
    }

    setListening(true);
    ttsSpeak('Listening. Say scan surroundings, read text, or voice assistant.');

    const recognition = new SR();
    recognition.lang = language;
    recognition.onresult = (e) => {
      const cmd = e.results[0][0].transcript.toLowerCase();
      setListening(false);
      if (cmd.includes('scan') || cmd.includes('surround') || cmd.includes('स्कैन') || cmd.includes('देखो')) {
        onNavigate('scan');
      } else if (cmd.includes('read') || cmd.includes('text') || cmd.includes('पढ़') || cmd.includes('ocr')) {
        onNavigate('read');
      } else if (cmd.includes('voice') || cmd.includes('assist') || cmd.includes('chat') || cmd.includes('बात')) {
        onNavigate('voice');
      } else if (cmd.includes('language') || cmd.includes('भाषा')) {
        onNavigate('language');
      } else {
        ttsSpeak('Command not recognised. Please try again.');
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  return (
    <div className="screen">
      {/* Hero */}
      <div className="home-hero">
        <div className="home-badge">
          <span>🧑🏼‍🦯</span>
          <span>SAMARTH AI — Your Intelligent Visual Bridge</span>
        </div>

        <h1 className="home-title">
          See the World <br />
          <span className="gradient-text">Through AI's Eyes</span>
        </h1>

        <p className="home-subtitle">
          SAMARTH AI converts what you cannot see into spoken words — scan surroundings,
          read text, and talk naturally in your language.
        </p>

        {/* Feature cards */}
        <div className="feature-grid" role="list" aria-label="Main features">
          {FEATURES.map((f) => (
            <button
              key={f.id}
              className="feature-card"
              role="listitem"
              style={{
                '--card-color': f.color,
                '--card-glow': f.glow,
                '--card-gradient': f.gradient,
                '--card-icon-bg': f.iconBg,
                '--card-icon-border': f.iconBorder,
              }}
              onClick={() => {
                ttsSpeak(`Opening ${f.title}`);
                onNavigate(f.id);
              }}
              aria-label={`${f.title}: ${f.desc}`}
            >
              <div className="feature-card-glow" aria-hidden="true" />
              <div className="feature-icon" aria-hidden="true">{f.icon}</div>
              <div className="feature-card-title">{f.title}</div>
              <div className="feature-card-desc">{f.desc}</div>
              <div className="feature-card-arrow" aria-hidden="true">
                <ArrowRight size={14} />
              </div>
            </button>
          ))}
        </div>

        {/* Global Voice Command Orb */}
        <div className="voice-orb-wrap">
          <p className="voice-orb-label">
            {listening ? '🔴 Listening for your command...' : 'Or speak a command'}
          </p>
          <button
            className={`voice-orb ${listening ? 'listening' : ''}`}
            onClick={handleVoiceCommand}
            aria-label={listening ? 'Listening for voice command' : 'Activate voice command'}
            aria-pressed={listening}
          >
            <Mic size={28} aria-hidden="true" />
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: 12 }}>
            Say: "Scan surroundings" · "Read text" · "Voice assistant"
          </p>
        </div>
      </div>
    </div>
  );
}
