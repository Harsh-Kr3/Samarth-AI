import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, RotateCcw, Send, AlertCircle, CheckCircle, Zap } from 'lucide-react';

/* ── Language Options ── */
const LANGUAGES = [
  { code: 'hi-IN', label: '🇮🇳 Hindi', name: 'Hindi', ttsLang: 'hi-IN' },
  { code: 'en-IN', label: '🇬🇧 English (India)', name: 'English', ttsLang: 'en-IN' },
  { code: 'bn-IN', label: '🌿 Bengali', name: 'Bengali', ttsLang: 'bn-IN' },
  { code: 'ta-IN', label: '🌊 Tamil', name: 'Tamil', ttsLang: 'ta-IN' },
  { code: 'te-IN', label: '☀️ Telugu', name: 'Telugu', ttsLang: 'te-IN' },
  { code: 'mr-IN', label: '🌺 Marathi', name: 'Marathi', ttsLang: 'mr-IN' },
];

/* ── Dysarthric Phrase Corrections ── */
const DYSARTHRIC_CORRECTIONS = {
  'hep me': 'help me',
  'wata': 'water',
  'payn': 'pain',
  'docta': 'doctor',
  'hosp': 'hospital',
  'emajency': 'emergency',
  'medsin': 'medicine',
  'am hungree': 'I am hungry',
  'am thrstee': 'I am thirsty',
  'am n pain': 'I am in pain',
  'go home': 'go home',
  'cal famy': 'call family',
};

/* ── Preset Phrases by Category ── */
const QUICK_PHRASES = {
  'Emergencies': ['Help me!', 'Call an ambulance', 'I am in pain', 'Emergency! Call 112', 'Contact my family'],
  'Basic Needs':  ['I am hungry', 'I need water', 'I need to use the restroom', 'I am tired', 'I feel cold'],
  'Medical':      ['I need medicine', 'Call a doctor', 'Take me to hospital', 'My medicine is at home', 'I am diabetic'],
  'Navigation':   ['I need help crossing', 'Where is the exit?', 'Call a taxi', 'Take me home', 'I am lost'],
};

/* ── Speech Wave Visual ── */
function SpeechWave({ active }) {
  return (
    <div className="speech-wave" aria-hidden="true" style={{ opacity: active ? 1 : 0.3, transition: 'opacity 0.3s' }}>
      {[...Array(7)].map((_, i) => (
        <span key={i} style={{ animationPlayState: active ? 'running' : 'paused' }} />
      ))}
    </div>
  );
}

/* ── TTS Rate/Pitch Slider ── */
function Slider({ label, id, min, max, step, value, onChange, formatValue }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <label htmlFor={id} className="form-label" style={{ margin: 0 }}>{label}</label>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary-light)', fontWeight: 700 }}>
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%', height: 6,
          accentColor: 'var(--color-primary)',
          cursor: 'pointer',
        }}
        aria-label={`${label}: ${value}`}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   VOICE ASSISTANT MODULE
   ══════════════════════════════════════════════════════════════ */
export default function VoiceAssistantModule({ speak, addToast }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalText, setFinalText] = useState('');
  const [dysarthricMode, setDysarthricMode] = useState(false);
  const [selectedLang, setSelectedLang] = useState('hi-IN');
  const [ttsText, setTtsText] = useState('');
  const [ttsRate, setTtsRate] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activePhraseCat, setActivePhraseCat] = useState('Emergencies');
  const [history, setHistory] = useState([]);
  const recognitionRef = useRef(null);

  /* Init Speech Recognition */
  const initRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = selectedLang;

    r.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          let corrected = t.trim().toLowerCase();
          if (dysarthricMode) {
            Object.entries(DYSARTHRIC_CORRECTIONS).forEach(([wrong, right]) => {
              corrected = corrected.replace(new RegExp(wrong, 'gi'), right);
            });
          }
          final += corrected + ' ';
        } else {
          interim += t;
        }
      }
      if (final) {
        setFinalText(prev => {
          const newText = prev + final;
          setHistory(h => [{ text: newText.trim(), lang: selectedLang, time: new Date().toLocaleTimeString() }, ...h.slice(0, 9)]);
          return newText;
        });
      }
      setTranscript(interim);
    };

    r.onerror = (e) => {
      if (e.error !== 'aborted') addToast(`Speech error: ${e.error}`, 'error');
      setIsListening(false);
    };
    r.onend = () => setIsListening(false);
    return r;
  }, [selectedLang, dysarthricMode, addToast]);

  const toggleListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      addToast('Speech recognition not supported in this browser', 'error');
      // Simulate for demo
      setIsListening(true);
      setTimeout(() => {
        const demo = dysarthricMode ? 'hep me — corrected to: help me' : 'Namaste! मुझे पानी चाहिए। (I need water.)';
        setFinalText(demo);
        setHistory(h => [{ text: demo, lang: selectedLang, time: new Date().toLocaleTimeString() }, ...h.slice(0,9)]);
        setIsListening(false);
      }, 2500);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      addToast('Listening stopped', 'info');
    } else {
      recognitionRef.current = initRecognition();
      recognitionRef.current?.start();
      setIsListening(true);
      setTranscript('');
      addToast(`Listening in ${LANGUAGES.find(l => l.code === selectedLang)?.name}...`, 'info');
    }
  }, [isListening, initRecognition, dysarthricMode, selectedLang, addToast]);

  /* TTS Speak */
  const speakTTS = useCallback(() => {
    if (!ttsText.trim()) { addToast('Enter text to speak', 'error'); return; }
    if (!window.speechSynthesis) { addToast('Text-to-speech not supported', 'error'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(ttsText);
    u.rate = ttsRate; u.pitch = ttsPitch; u.volume = ttsVolume;
    u.lang = selectedLang;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
    addToast('Speaking...', 'info');
  }, [ttsText, ttsRate, ttsPitch, ttsVolume, selectedLang, addToast]);

  const stopTTS = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  /* Quick phrase select */
  const usePhrase = useCallback((phrase) => {
    setTtsText(phrase);
    addToast(`Phrase loaded: "${phrase}"`, 'success');
  }, [addToast]);

  const hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div>
      {/* Hero */}
      <div className="module-hero">
        <div
          className="module-hero-icon"
          style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(8,145,178,0.2))', color: 'var(--color-accent)' }}
          aria-hidden="true"
        >
          🎙️
        </div>
        <h1>Multimodal Voice & Speech AI</h1>
        <p>Multilingual speech recognition, dysarthric voice support, and natural text-to-speech across 6 Indian languages</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <span className="badge badge-accent">≥95% Regional Accuracy</span>
          <span className="badge badge-warning">≥88% Dysarthric ASR</span>
          <span className="badge badge-success">6 Indian Languages</span>
        </div>
      </div>

      {!hasSR && (
        <div className="alert alert-warning" style={{ marginBottom: 24 }} role="alert">
          <AlertCircle size={18} /> 
          <span>Your browser doesn't support Speech Recognition (use Chrome/Edge). Demo simulation mode is active.</span>
        </div>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* ── STT Panel ── */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-icon" style={{ background: 'rgba(6,182,212,0.2)' }} aria-hidden="true">🎤</div>
              <div>
                <div className="card-title">Speech to Text</div>
                <div className="card-subtitle">Real-time multilingual transcription</div>
              </div>
            </div>

            {/* Language selector */}
            <div className="form-group">
              <label className="form-label" htmlFor="stt-lang">Input Language</label>
              <select
                id="stt-lang"
                className="form-select"
                value={selectedLang}
                onChange={e => setSelectedLang(e.target.value)}
                disabled={isListening}
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Dysarthric mode toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px',
              background: dysarthricMode ? 'rgba(124,58,237,0.1)' : 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${dysarthricMode ? 'rgba(124,58,237,0.3)' : 'var(--bg-glass-border)'}`,
              marginBottom: 16,
              cursor: 'pointer',
              transition: 'all 0.25s ease',
            }} onClick={() => { setDysarthricMode(d => !d); addToast(dysarthricMode ? 'Standard mode' : 'Dysarthric mode active', 'info'); }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>🧠 Dysarthric Speech Mode</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  Phonetic error tolerance + adaptive phrase matching
                </div>
              </div>
              <div className={`toggle ${dysarthricMode ? 'on' : ''}`} role="switch" aria-checked={dysarthricMode} aria-label="Dysarthric speech mode">
                <div className="toggle-thumb" />
              </div>
            </div>

            {/* Record button */}
            <button
              className={`btn ${isListening ? 'btn-danger' : 'btn-accent'} w-full`}
              onClick={toggleListening}
              aria-label={isListening ? 'Stop recording speech' : 'Start recording speech'}
              aria-pressed={isListening}
              style={{ marginBottom: 16, fontSize: 'var(--font-size-lg)' }}
            >
              {isListening ? (
                <><MicOff size={20} /> Stop Listening</>
              ) : (
                <><Mic size={20} /> Start Listening</>
              )}
            </button>

            {/* Waveform */}
            {isListening && (
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <SpeechWave active={isListening} />
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)', marginTop: 8, fontWeight: 600 }}>
                  🔴 Recording...
                </p>
              </div>
            )}

            {/* Transcript */}
            <div
              style={{
                minHeight: 80,
                background: 'var(--bg-input)',
                border: `1.5px solid ${isListening ? 'var(--color-accent)' : 'var(--bg-glass-border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: 14,
                fontSize: 'var(--font-size-sm)',
                lineHeight: 1.7,
                color: 'var(--text-primary)',
                transition: 'border-color 0.3s',
              }}
              role="log"
              aria-live="polite"
              aria-label="Speech recognition transcript"
            >
              {finalText && <span>{finalText}</span>}
              {transcript && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{transcript}</span>}
              {!finalText && !transcript && (
                <span style={{ color: 'var(--text-muted)' }}>Your speech will appear here...</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setFinalText(''); setTranscript(''); }} aria-label="Clear transcript">
                <RotateCcw size={14} /> Clear
              </button>
              <button
                className="btn btn-accent btn-sm"
                onClick={() => { setTtsText(finalText); addToast('Text sent to TTS', 'success'); }}
                disabled={!finalText}
                aria-label="Send transcript to text-to-speech"
                style={{ flex: 1 }}
              >
                <Send size={14} /> Send to TTS
              </button>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="card">
              <div className="card-header" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 18 }} aria-hidden="true">📜</div>
                <div className="card-title" style={{ fontSize: 'var(--font-size-base)' }}>Recognition History</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} role="list">
                {history.slice(0, 4).map((h, i) => (
                  <div
                    key={i}
                    role="listitem"
                    style={{
                      background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      fontSize: 'var(--font-size-xs)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{h.text.slice(0, 60)}{h.text.length > 60 ? '...' : ''}</span>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{h.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── TTS Panel ── */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-icon" style={{ background: 'rgba(124,58,237,0.2)' }} aria-hidden="true">🔊</div>
              <div>
                <div className="card-title">Text to Speech</div>
                <div className="card-subtitle">Natural voice output with full control</div>
              </div>
            </div>

            {/* TTS Text */}
            <div className="form-group">
              <label className="form-label" htmlFor="tts-input">Text to Speak</label>
              <textarea
                id="tts-input"
                className="form-textarea"
                value={ttsText}
                onChange={e => setTtsText(e.target.value)}
                placeholder="Type text here, or select a quick phrase below..."
                rows={4}
                aria-label="Enter text for speech synthesis"
              />
            </div>

            {/* Controls */}
            <Slider id="tts-rate"   label="⚡ Speed"  min={0.5} max={2.0} step={0.1} value={ttsRate}   onChange={setTtsRate}   formatValue={v => `${v.toFixed(1)}x`} />
            <Slider id="tts-pitch"  label="🎵 Pitch"  min={0.5} max={2.0} step={0.1} value={ttsPitch}  onChange={setTtsPitch}  formatValue={v => `${v.toFixed(1)}`} />
            <Slider id="tts-volume" label="🔊 Volume" min={0.1} max={1.0} step={0.1} value={ttsVolume} onChange={setTtsVolume} formatValue={v => `${Math.round(v * 100)}%`} />

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`btn ${isSpeaking ? 'btn-warning' : 'btn-primary'}`}
                onClick={isSpeaking ? stopTTS : speakTTS}
                disabled={!ttsText.trim() && !isSpeaking}
                aria-label={isSpeaking ? 'Stop speaking' : 'Speak the text'}
                style={{ flex: 1 }}
              >
                {isSpeaking ? (
                  <><VolumeX size={16} /> Stop</>
                ) : (
                  <><Volume2 size={16} /> Speak</>
                )}
              </button>
            </div>

            {isSpeaking && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <SpeechWave active={true} />
              </div>
            )}
          </div>

          {/* Quick Phrases */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 12 }}>
              <div className="card-icon" style={{ background: 'rgba(16,185,129,0.2)' }} aria-hidden="true">⚡</div>
              <div>
                <div className="card-title">Quick Phrases</div>
                <div className="card-subtitle">One-tap preset phrases for common needs</div>
              </div>
            </div>

            {/* Category selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {Object.keys(QUICK_PHRASES).map(cat => (
                <button
                  key={cat}
                  className={`btn btn-sm ${activePhraseCat === cat ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActivePhraseCat(cat)}
                  aria-label={`${cat} phrases`}
                  aria-pressed={activePhraseCat === cat}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} role="list" aria-label="Quick phrase buttons">
              {QUICK_PHRASES[activePhraseCat].map(phrase => (
                <button
                  key={phrase}
                  role="listitem"
                  className="btn btn-ghost"
                  onClick={() => { usePhrase(phrase); speakTTS(); }}
                  style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '10px 14px', fontWeight: 500 }}
                  aria-label={`Say: ${phrase}`}
                  onMouseEnter={() => setTtsText(phrase)}
                >
                  <Zap size={14} style={{ color: 'var(--color-warning)', flexShrink: 0 }} aria-hidden="true" />
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
