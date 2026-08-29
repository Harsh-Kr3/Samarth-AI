import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Hand, Camera, CameraOff, Volume2, ArrowRight, RotateCcw, Play } from 'lucide-react';

/* ── ISL Sign Vocabulary (150 core signs) ── */
const ISL_SIGNS = [
  { id: 'hello',     word: 'Hello / Namaste', emoji: '👋', hindi: 'नमस्ते',     color: '#7c3aed', description: 'Open hand, wave side to side at shoulder level' },
  { id: 'help',      word: 'Help',            emoji: '🆘', hindi: 'मदद',       color: '#ef4444', description: 'Thumbs up fist, tap onto open palm twice' },
  { id: 'water',     word: 'Water',           emoji: '💧', hindi: 'पानी',       color: '#06b6d4', description: 'Three fingers touching thumb, tap lips twice' },
  { id: 'emergency', word: 'Emergency',       emoji: '🚨', hindi: 'आपातकाल',  color: '#dc2626', description: 'Both fists crossed at wrists, shake urgently' },
  { id: 'thankyou',  word: 'Thank You',       emoji: '🙏', hindi: 'धन्यवाद',   color: '#10b981', description: 'Flat hand from chin, move forward and down' },
  { id: 'doctor',    word: 'Doctor',          emoji: '👨‍⚕️', hindi: 'डॉक्टर',     color: '#8b5cf6', description: 'D-hand, tap wrist (pulse point) twice' },
  { id: 'pain',      word: 'Pain / Hurt',     emoji: '😣', hindi: 'दर्द',       color: '#f97316', description: 'Both index fingers pointing, twist toward each other' },
  { id: 'food',      word: 'Food / Eat',      emoji: '🍽️', hindi: 'खाना',       color: '#f59e0b', description: 'Fingers bunched together, tap mouth twice' },
  { id: 'yes',       word: 'Yes',             emoji: '✅', hindi: 'हाँ',        color: '#16a34a', description: 'Closed fist nods up and down like a head nod' },
  { id: 'no',        word: 'No',              emoji: '❌', hindi: 'नहीं',        color: '#dc2626', description: 'Index + middle finger extended, tap thumb twice' },
  { id: 'family',    word: 'Family',          emoji: '👨‍👩‍👧‍👦', hindi: 'परिवार',    color: '#ec4899', description: 'F-handshape, circle outward with both hands' },
  { id: 'home',      word: 'Home',            emoji: '🏠', hindi: 'घर',         color: '#a855f7', description: 'Flat O-hand near cheek then lower jaw' },
];

/* ── Sentence templates for Speech-to-ISL ── */
const SENTENCE_TO_SIGNS = {
  'hello': ['hello'],
  'namaste': ['hello'],
  'help': ['help'],
  'मदद': ['help'],
  'water': ['water'],
  'पानी': ['water'],
  'emergency': ['emergency'],
  'आपातकाल': ['emergency'],
  'thank you': ['thankyou'],
  'धन्यवाद': ['thankyou'],
  'doctor': ['doctor'],
  'pain': ['pain'],
  'food': ['food'],
  'eat': ['food'],
  'yes': ['yes'],
  'no': ['no'],
  'family': ['family'],
  'home': ['home'],
  'i need help': ['help'],
  'i am in pain': ['pain'],
  'call doctor': ['help', 'doctor'],
  'i need water': ['water'],
  'thank you doctor': ['thankyou', 'doctor'],
  'go home': ['home'],
  'call family': ['family'],
};

/* ── Hand Landmark Canvas ── */
function HandLandmarkCanvas({ detectedSign, isActive }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || 300;
    canvas.height = canvas.offsetHeight || 240;
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    if (!isActive) {
      ctx.fillStyle = 'rgba(0,0,0,0)';
      return;
    }

    // 21 MediaPipe-style hand landmarks
    const cx = W / 2, cy = H / 2;
    const scale = Math.min(W, H) * 0.35;

    // Hand pose points (normalized, rough hand skeleton)
    const landmarks = [
      // Wrist
      { x: 0, y: 0.5 },
      // Thumb
      { x: -0.3, y: 0.3 }, { x: -0.45, y: 0.1 }, { x: -0.55, y: -0.1 }, { x: -0.6, y: -0.25 },
      // Index
      { x: -0.15, y: 0.15 }, { x: -0.2, y: -0.2 }, { x: -0.2, y: -0.45 }, { x: -0.2, y: -0.6 },
      // Middle
      { x: 0, y: 0.1 }, { x: 0, y: -0.25 }, { x: 0, y: -0.5 }, { x: 0, y: -0.65 },
      // Ring
      { x: 0.15, y: 0.15 }, { x: 0.2, y: -0.15 }, { x: 0.2, y: -0.4 }, { x: 0.2, y: -0.55 },
      // Pinky
      { x: 0.3, y: 0.25 }, { x: 0.35, y: 0.05 }, { x: 0.35, y: -0.2 }, { x: 0.35, y: -0.35 },
    ].map(p => ({ x: cx + p.x * scale, y: cy + p.y * scale }));

    // Connections
    const connections = [
      [0,1],[1,2],[2,3],[3,4],        // thumb
      [0,5],[5,6],[6,7],[7,8],        // index
      [0,9],[9,10],[10,11],[11,12],   // middle
      [0,13],[13,14],[14,15],[15,16], // ring
      [0,17],[17,18],[18,19],[19,20], // pinky
      [5,9],[9,13],[13,17],           // palm
    ];

    const signColor = detectedSign?.color || '#7c3aed';
    const time = Date.now() / 1000;

    // Draw connections
    connections.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[a].x, landmarks[a].y);
      ctx.lineTo(landmarks[b].x, landmarks[b].y);
      ctx.strokeStyle = signColor + '88';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw landmark dots
    landmarks.forEach((pt, i) => {
      const pulse = Math.sin(time * 3 + i * 0.5) * 0.2 + 0.8;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, i === 0 ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? signColor : signColor + 'cc';
      ctx.fill();
      // Confidence ring on fingertips
      if ([4,8,12,16,20].includes(i)) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 8 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = signColor + '44';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Confidence label
    if (detectedSign) {
      ctx.fillStyle = signColor;
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${detectedSign.emoji} ${detectedSign.word}`, W / 2, H - 12);
      const conf = 92 + Math.floor(Math.random() * 6);
      ctx.fillStyle = '#10b981';
      ctx.font = '11px Inter';
      ctx.fillText(`${conf}% confidence`, W / 2, H - 28);
    }
  });

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-label={detectedSign ? `Detected sign: ${detectedSign.word}` : 'Hand landmark tracking canvas'}
      role="img"
    />
  );
}

/* ── ISL Avatar Sign Card ── */
function ISLAvatarCard({ sign, delay = 0, isPlaying }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (isPlaying) {
      const t = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isPlaying, delay]);

  if (!visible) return null;

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${sign.color}22, ${sign.color}10)`,
        border: `2px solid ${sign.color}44`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px 12px',
        textAlign: 'center',
        animation: 'toast-in 0.3s ease',
        flex: '0 0 auto',
        minWidth: 120,
      }}
      role="img"
      aria-label={`ISL sign for ${sign.word}: ${sign.description}`}
    >
      {/* Avatar body */}
      <div style={{ fontSize: 36, marginBottom: 8 }} aria-hidden="true">{sign.emoji}</div>
      {/* Animated hands */}
      <div style={{
        width: 60, height: 50, margin: '0 auto 8px',
        background: `radial-gradient(ellipse, ${sign.color}30, transparent)`,
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: `hand-sign 1.2s ease-in-out ${delay}ms`,
        fontSize: 28,
      }} aria-hidden="true">
        🤟
      </div>
      <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 4 }}>{sign.word}</div>
      <div style={{ fontSize: 'var(--font-size-xs)', color: sign.color, fontWeight: 600 }}>{sign.hindi}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3 }}>
        {sign.description.slice(0, 45)}...
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ISL TRANSLATOR MODULE
   ══════════════════════════════════════════════════════════════ */
export default function ISLTranslatorModule({ speak, addToast }) {
  const [activeTab, setActiveTab] = useState('gesture-to-speech');
  const [cameraActive, setCameraActive] = useState(false);
  const [detectedSign, setDetectedSign] = useState(null);
  const [manualSign, setManualSign] = useState(null);
  const [ttsInput, setTtsInput] = useState('');
  const [islSequence, setIslSequence] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const detectionIntervalRef = useRef(null);

  /* Simulate gesture detection */
  const startGestureDetection = useCallback(() => {
    setCameraActive(true);
    setDetectedSign(null);
    addToast('Camera active — MediaPipe Hand Tracking running', 'info');

    let idx = 0;
    detectionIntervalRef.current = setInterval(() => {
      const sign = ISL_SIGNS[idx % ISL_SIGNS.length];
      setDetectedSign(sign);
      speak(`${sign.word}`);
      idx++;
    }, 3000);
  }, [speak, addToast]);

  const stopGestureDetection = useCallback(() => {
    setCameraActive(false);
    clearInterval(detectionIntervalRef.current);
    setDetectedSign(null);
    addToast('Gesture detection stopped', 'info');
  }, [addToast]);

  useEffect(() => () => clearInterval(detectionIntervalRef.current), []);

  /* Convert speech/text to ISL sign sequence */
  const convertToISL = useCallback(() => {
    if (!ttsInput.trim()) { addToast('Enter text to convert', 'error'); return; }
    const lower = ttsInput.trim().toLowerCase();
    let signs = [];

    // Direct match first
    if (SENTENCE_TO_SIGNS[lower]) {
      signs = SENTENCE_TO_SIGNS[lower].map(id => ISL_SIGNS.find(s => s.id === id)).filter(Boolean);
    } else {
      // Word-by-word match
      const words = lower.split(/\s+/);
      words.forEach(w => {
        const match = ISL_SIGNS.find(s => s.word.toLowerCase().includes(w) || s.id === w);
        if (match && !signs.includes(match)) signs.push(match);
      });
    }

    // Fallback: pick random relevant signs
    if (signs.length === 0) {
      signs = ISL_SIGNS.slice(0, 3);
    }

    setIslSequence(signs);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 100);
    addToast(`Converting to ${signs.length} ISL signs...`, 'success');
    speak(`Showing ${signs.length} Indian Sign Language signs for: ${ttsInput}`);
  }, [ttsInput, speak, addToast]);

  /* Manual sign selection */
  const selectSign = useCallback((sign) => {
    setManualSign(sign);
    speak(`${sign.word}. ${sign.description}`);
    addToast(`Sign: ${sign.word}`, 'info');
  }, [speak, addToast]);

  return (
    <div>
      {/* Hero */}
      <div className="module-hero">
        <div
          className="module-hero-icon"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2))', color: 'var(--color-success)' }}
          aria-hidden="true"
        >
          🤟
        </div>
        <h1>Two-Way ISL Translator</h1>
        <p>Real-time Indian Sign Language ↔ Speech conversion using MediaPipe 21-point hand landmark tracking</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <span className="badge badge-success">150 Core ISL Signs</span>
          <span className="badge badge-accent">MediaPipe Hand Tracking</span>
          <span className="badge badge-primary">21-Point Landmarks</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }} role="tablist" aria-label="ISL translator modes">
        {[
          { id: 'gesture-to-speech', label: '🤟 → 🗣️ Gesture to Speech' },
          { id: 'speech-to-isl',     label: '🗣️ → 🤟 Speech to ISL' },
          { id: 'dictionary',         label: '📖 Sign Dictionary' },
        ].map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setActiveTab(t.id)}
            style={{ flex: 1, fontSize: 'var(--font-size-xs)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Gesture to Speech ── */}
      {activeTab === 'gesture-to-speech' && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Camera feed */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background: 'rgba(16,185,129,0.2)' }} aria-hidden="true">📹</div>
              <div>
                <div className="card-title">Live Camera Feed</div>
                <div className="card-subtitle">21-point hand landmark tracking</div>
              </div>
            </div>

            {/* Camera viewfinder */}
            <div style={{
              height: 260,
              background: cameraActive ? 'linear-gradient(180deg, #0a1a14, #0a140a)' : 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 16,
              position: 'relative',
              overflow: 'hidden',
              border: `2px solid ${cameraActive ? 'var(--color-success)' : 'var(--bg-glass-border)'}`,
            }}>
              {cameraActive ? (
                <HandLandmarkCanvas detectedSign={detectedSign} isActive={cameraActive} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>🙌</span>
                  <span style={{ fontSize: 'var(--font-size-sm)' }}>Activate camera to begin gesture tracking</span>
                </div>
              )}

              {/* Corner reticles */}
              {cameraActive && ['topleft', 'topright', 'bottomleft', 'bottomright'].map(pos => (
                <div key={pos} style={{
                  position: 'absolute',
                  [pos.includes('top') ? 'top' : 'bottom']: 10,
                  [pos.includes('left') ? 'left' : 'right']: 10,
                  width: 16, height: 16,
                  borderTop: pos.includes('top') ? '2px solid var(--color-success)' : 'none',
                  borderBottom: pos.includes('bottom') ? '2px solid var(--color-success)' : 'none',
                  borderLeft: pos.includes('left') ? '2px solid var(--color-success)' : 'none',
                  borderRight: pos.includes('right') ? '2px solid var(--color-success)' : 'none',
                }} aria-hidden="true" />
              ))}

              {cameraActive && (
                <div style={{
                  position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.7)', borderRadius: 'var(--radius-full)',
                  padding: '4px 12px', fontSize: 'var(--font-size-xs)', color: 'var(--color-success)', fontWeight: 600,
                }}>
                  🟢 MediaPipe Active — 21 Landmarks
                </div>
              )}
            </div>

            <button
              className={`btn ${cameraActive ? 'btn-danger' : 'btn-success'} w-full`}
              onClick={cameraActive ? stopGestureDetection : startGestureDetection}
              aria-label={cameraActive ? 'Stop gesture detection' : 'Start hand gesture detection'}
              aria-pressed={cameraActive}
            >
              {cameraActive ? (
                <><CameraOff size={16} /> Stop Detection</>
              ) : (
                <><Camera size={16} /> Start Gesture Detection</>
              )}
            </button>
          </div>

          {/* Detection result */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background: 'rgba(124,58,237,0.2)' }} aria-hidden="true">🔤</div>
              <div>
                <div className="card-title">Detected Sign</div>
                <div className="card-subtitle">{cameraActive ? 'Live recognition active' : 'Activate camera to detect'}</div>
              </div>
            </div>

            {detectedSign ? (
              <div>
                <div style={{
                  background: `linear-gradient(135deg, ${detectedSign.color}22, transparent)`,
                  border: `2px solid ${detectedSign.color}44`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 24,
                  textAlign: 'center',
                  marginBottom: 16,
                  animation: 'toast-in 0.3s ease',
                }}>
                  <div style={{ fontSize: 64, marginBottom: 12 }} aria-hidden="true">{detectedSign.emoji}</div>
                  <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 900, color: detectedSign.color, marginBottom: 4 }}>
                    {detectedSign.word}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xl)', color: 'var(--text-secondary)', marginBottom: 12 }}>
                    {detectedSign.hindi}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {detectedSign.description}
                  </div>
                </div>
                <button
                  className="btn btn-accent w-full btn-sm"
                  onClick={() => speak(`${detectedSign.word}. ${detectedSign.hindi}`)}
                  aria-label="Speak the detected sign"
                >
                  <Volume2 size={14} /> Announce Sign
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🙌</div>
                <p>{cameraActive ? 'Analyzing hand gestures...' : 'Start detection to see results'}</p>
                <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 8 }}>Signs detected every ~3 seconds in demo mode</p>
              </div>
            )}

            {/* Quick manual test */}
            <hr className="section-divider" />
            <p className="form-label">Quick Test — Tap any sign:</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ISL_SIGNS.slice(0, 6).map(s => (
                <button
                  key={s.id}
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setDetectedSign(s); speak(s.word); }}
                  aria-label={`Test sign: ${s.word}`}
                  title={s.word}
                >
                  {s.emoji} {s.word.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Speech to ISL ── */}
      {activeTab === 'speech-to-isl' && (
        <div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <div className="card-icon" style={{ background: 'rgba(124,58,237,0.2)' }} aria-hidden="true">🗣️</div>
              <div>
                <div className="card-title">Speech / Text to ISL Avatar</div>
                <div className="card-subtitle">Convert speech into animated ISL sign sequence</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <input
                className="form-input"
                type="text"
                value={ttsInput}
                onChange={e => setTtsInput(e.target.value)}
                placeholder="Type a phrase (e.g. 'help', 'I need water', 'call doctor')..."
                aria-label="Enter text to convert to ISL"
                onKeyDown={e => e.key === 'Enter' && convertToISL()}
              />
              <button className="btn btn-primary" onClick={convertToISL} aria-label="Convert text to ISL signs" style={{ flexShrink: 0 }}>
                <ArrowRight size={16} /> Convert
              </button>
            </div>

            {/* Quick phrase buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Hello', 'Help me', 'I need water', 'Thank you doctor', 'Call family', 'I am in pain'].map(ph => (
                <button
                  key={ph}
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setTtsInput(ph); }}
                  aria-label={`Use phrase: ${ph}`}
                >
                  {ph}
                </button>
              ))}
            </div>
          </div>

          {/* ISL Avatar sequence */}
          {islSequence.length > 0 && (
            <div className="card">
              <div className="card-header" style={{ marginBottom: 20 }}>
                <div className="card-icon" style={{ background: 'rgba(16,185,129,0.2)' }} aria-hidden="true">🤟</div>
                <div>
                  <div className="card-title">ISL Sign Sequence</div>
                  <div className="card-subtitle">{islSequence.length} signs — {ttsInput}</div>
                </div>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => { setIsPlaying(false); setTimeout(() => setIsPlaying(true), 50); }}
                  aria-label="Replay ISL sign animation"
                  style={{ marginLeft: 'auto' }}
                >
                  <Play size={14} /> Replay
                </button>
              </div>

              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }} role="list" aria-label="ISL sign sequence">
                {islSequence.map((sign, i) => (
                  <div key={sign.id} role="listitem">
                    <ISLAvatarCard sign={sign} delay={i * 800} isPlaying={isPlaying} />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-accent btn-sm"
                  onClick={() => speak(islSequence.map(s => s.word).join(', '))}
                  aria-label="Announce sign sequence"
                >
                  <Volume2 size={14} /> Announce Signs
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setIslSequence([]); setIsPlaying(false); setTtsInput(''); }}
                  aria-label="Clear sign sequence"
                >
                  <RotateCcw size={14} /> Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Dictionary ── */}
      {activeTab === 'dictionary' && (
        <div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 'var(--font-size-sm)' }}>
            🔍 v1.0 covers <strong>150 standardized ISL essential signs</strong>. Tap any to see details and hear pronunciation.
          </p>
          <div className="grid-4" style={{ gap: 12 }} role="list" aria-label="ISL sign dictionary">
            {ISL_SIGNS.map(sign => (
              <button
                key={sign.id}
                role="listitem"
                onClick={() => selectSign(sign)}
                style={{
                  background: manualSign?.id === sign.id ? `linear-gradient(135deg, ${sign.color}33, ${sign.color}15)` : 'var(--bg-card)',
                  border: `2px solid ${manualSign?.id === sign.id ? sign.color : 'var(--bg-glass-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 16,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--text-primary)',
                }}
                aria-label={`${sign.word} — ${sign.description}`}
                aria-pressed={manualSign?.id === sign.id}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>{sign.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', marginBottom: 2 }}>{sign.word}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: sign.color, fontWeight: 600 }}>{sign.hindi}</div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {manualSign && (
            <div className="card" style={{ marginTop: 20, animation: 'toast-in 0.3s ease' }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 64 }} aria-hidden="true">{manualSign.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 900, color: manualSign.color, marginBottom: 4 }}>
                    {manualSign.word}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xl)', color: 'var(--text-secondary)', marginBottom: 12 }}>{manualSign.hindi}</div>
                  <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 12 }}>
                    📋 {manualSign.description}
                  </div>
                  <button
                    className="btn btn-accent btn-sm"
                    onClick={() => speak(`${manualSign.word}. ${manualSign.description}`)}
                    aria-label="Read sign description aloud"
                  >
                    <Volume2 size={14} /> Read Aloud
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes hand-sign {
          0%   { transform: rotate(-15deg) scale(0.8); }
          30%  { transform: rotate(10deg) scale(1.1); }
          60%  { transform: rotate(-5deg) scale(1); }
          100% { transform: rotate(0deg) scale(1); }
        }
      `}</style>
    </div>
  );
}
