import React, { useState, useCallback } from 'react';
import { MessageSquare, Volume2, RotateCcw, ZoomIn, BookOpen, Trash2, CheckCircle } from 'lucide-react';

/* ── AAC Board Categories & Symbols ── */
const AAC_CATEGORIES = {
  'Basic Needs': {
    color: '#06b6d4',
    icon: '💧',
    phrases: [
      { emoji: '💧', label: 'Water', phrase: 'I need water please' },
      { emoji: '🍽️', label: 'Food', phrase: 'I am hungry. I need food' },
      { emoji: '🛏️', label: 'Rest', phrase: 'I need to rest' },
      { emoji: '🚽', label: 'Toilet', phrase: 'I need to use the restroom' },
      { emoji: '💊', label: 'Medicine', phrase: 'I need my medicine' },
      { emoji: '❄️', label: 'Cold', phrase: 'I feel cold' },
      { emoji: '🌡️', label: 'Hot', phrase: 'I feel hot / have fever' },
      { emoji: '😴', label: 'Tired', phrase: 'I am very tired' },
    ],
  },
  'Pain & Symptoms': {
    color: '#ef4444',
    icon: '😣',
    phrases: [
      { emoji: '😣', label: 'Pain', phrase: 'I am in pain' },
      { emoji: '🤕', label: 'Head Pain', phrase: 'I have a headache' },
      { emoji: '💔', label: 'Chest Pain', phrase: 'I have chest pain. Call a doctor' },
      { emoji: '🤢', label: 'Nauseous', phrase: 'I feel nauseous' },
      { emoji: '😵', label: 'Dizzy', phrase: 'I feel dizzy' },
      { emoji: '🩸', label: 'Bleeding', phrase: 'I am bleeding. Need help' },
      { emoji: '🦴', label: 'Bone Pain', phrase: 'My bones are aching' },
      { emoji: '😷', label: 'Sick', phrase: 'I am feeling very sick' },
    ],
  },
  'Feelings': {
    color: '#f59e0b',
    icon: '😊',
    phrases: [
      { emoji: '😊', label: 'Happy', phrase: 'I am feeling happy' },
      { emoji: '😢', label: 'Sad', phrase: 'I am feeling sad' },
      { emoji: '😰', label: 'Anxious', phrase: 'I am feeling anxious' },
      { emoji: '😡', label: 'Frustrated', phrase: 'I am frustrated' },
      { emoji: '😌', label: 'Okay', phrase: 'I am feeling okay now' },
      { emoji: '🥺', label: 'Scared', phrase: 'I am scared' },
      { emoji: '😤', label: 'Uncomfortable', phrase: 'I am uncomfortable' },
      { emoji: '🤗', label: 'Grateful', phrase: 'Thank you, I am grateful' },
    ],
  },
  'Navigation': {
    color: '#10b981',
    icon: '📍',
    phrases: [
      { emoji: '🏠', label: 'Home', phrase: 'I want to go home' },
      { emoji: '🚑', label: 'Ambulance', phrase: 'Call an ambulance now' },
      { emoji: '🏥', label: 'Hospital', phrase: 'Take me to the hospital' },
      { emoji: '🚕', label: 'Taxi', phrase: 'I need a taxi' },
      { emoji: '📍', label: 'Lost', phrase: 'I am lost. Please help me' },
      { emoji: '🚶', label: 'Walk', phrase: 'I want to walk' },
      { emoji: '🅿️', label: 'Stop', phrase: 'Please stop here' },
      { emoji: '↩️', label: 'Turn Back', phrase: 'Turn back. Wrong direction' },
    ],
  },
  'Quick Responses': {
    color: '#a855f7',
    icon: '⚡',
    phrases: [
      { emoji: '✅', label: 'Yes', phrase: 'Yes' },
      { emoji: '❌', label: 'No', phrase: 'No' },
      { emoji: '🙏', label: 'Please', phrase: 'Please' },
      { emoji: '😊', label: 'Thank You', phrase: 'Thank you' },
      { emoji: '🤝', label: 'Help', phrase: 'Help me please' },
      { emoji: '⏱️', label: 'Wait', phrase: 'Please wait a moment' },
      { emoji: '🔁', label: 'Repeat', phrase: 'Could you please repeat that?' },
      { emoji: '📞', label: 'Call Family', phrase: 'Please call my family' },
    ],
  },
};

/* ── Visual Explainer Data ── */
const EXPLAINER_SAMPLES = {
  medicine: {
    title: '💊 How to Take Your Medicine',
    steps: [
      { emoji: '🕖', text: 'Morning — Take 1 tablet after breakfast', detail: '8:00 AM' },
      { emoji: '🥗', text: 'Always eat food first before medicine', detail: 'Do not take on empty stomach' },
      { emoji: '💧', text: 'Drink a full glass of water with tablet', detail: '200ml minimum' },
      { emoji: '🕐', text: 'Evening — Take 1 tablet after dinner', detail: '8:00 PM' },
      { emoji: '🚫', text: 'Do NOT skip doses', detail: 'Set reminder if needed' },
      { emoji: '📱', text: 'Call doctor if you feel unwell', detail: 'Emergency: 104' },
    ],
    color: '#7c3aed',
  },
  navigation: {
    title: '🚶 How to Use the Subway',
    steps: [
      { emoji: '🎫', text: 'Buy token or use Metro Card at counter', detail: 'Token: ₹25 | Card: ₹100 deposit' },
      { emoji: '🚪', text: 'Tap card or insert token at gate', detail: 'Green light = enter' },
      { emoji: '📍', text: 'Check the route map for your station', detail: 'Platform direction shown on board' },
      { emoji: '🚇', text: 'Board the correct line train', detail: 'Wait behind yellow line' },
      { emoji: '📢', text: 'Listen for station announcements', detail: 'Announcements in 3 languages' },
      { emoji: '🚪', text: 'Exit at your destination and tap out', detail: 'Follow EXIT signs' },
    ],
    color: '#06b6d4',
  },
  government: {
    title: '📋 How to Apply for Disability Certificate',
    steps: [
      { emoji: '📋', text: 'Collect the UDID application form online or at CMO office', detail: 'udid.gov.in' },
      { emoji: '📸', text: 'Get a passport-sized photo and ID proof ready', detail: 'Aadhaar card recommended' },
      { emoji: '🏥', text: 'Visit government hospital for medical assessment', detail: 'Bring all documents' },
      { emoji: '👨‍⚕️', text: 'Doctor evaluates your disability type and percentage', detail: 'Assessment is free' },
      { emoji: '📩', text: 'Receive UDID card by mail within 45 days', detail: 'Track at udid.gov.in' },
      { emoji: '🎫', text: 'Use UDID card for all government benefits', detail: 'Railway concession, bus pass, schemes' },
    ],
    color: '#f59e0b',
  },
};

/* ── AAC Tile ── */
function AACSoundTile({ item, onSelect, isSelected }) {
  return (
    <button
      onClick={() => onSelect(item)}
      style={{
        background: isSelected ? 'rgba(124,58,237,0.25)' : 'var(--bg-card)',
        border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--bg-glass-border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px 12px',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.2s ease',
        transform: isSelected ? 'scale(0.96)' : 'scale(1)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-primary)',
        minHeight: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
      aria-label={`${item.label}: ${item.phrase}`}
      aria-pressed={isSelected}
    >
      <span style={{ fontSize: 32 }} aria-hidden="true">{item.emoji}</span>
      <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, lineHeight: 1.2 }}>{item.label}</span>
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   AAC & VISUAL EXPLAINER MODULE
   ══════════════════════════════════════════════════════════════ */
export default function AACVisualModule({ speak, addToast }) {
  const [activeTab, setActiveTab] = useState('aac');
  const [activeCategory, setActiveCategory] = useState('Basic Needs');
  const [selectedItem, setSelectedItem] = useState(null);
  const [phraseQueue, setPhraseQueue] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [switchScanActive, setSwitchScanActive] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);
  const [explainerSample, setExplainerSample] = useState('medicine');

  const category = AAC_CATEGORIES[activeCategory];
  const items = category.phrases;

  const selectItem = useCallback((item) => {
    setSelectedItem(item);
    setPhraseQueue(q => [...q, item]);
    // Immediately speak
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(item.phrase);
      u.rate = 0.9; u.pitch = 1;
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => { setIsSpeaking(false); setSelectedItem(null); };
      window.speechSynthesis.speak(u);
    }
    addToast(`Speaking: "${item.phrase}"`, 'success');
    speak(item.phrase);
  }, [speak, addToast]);

  const clearQueue = useCallback(() => {
    setPhraseQueue([]);
    setSelectedItem(null);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const speakQueue = useCallback(() => {
    if (phraseQueue.length === 0) return;
    const fullText = phraseQueue.map(p => p.phrase).join('. ');
    speak(fullText);
    addToast('Speaking phrase sequence', 'info');
  }, [phraseQueue, speak, addToast]);

  const explainer = EXPLAINER_SAMPLES[explainerSample];

  return (
    <div>
      {/* Hero */}
      <div className="module-hero">
        <div
          className="module-hero-icon"
          style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(217,119,6,0.2))', color: 'var(--color-warning)' }}
          aria-hidden="true"
        >
          💬
        </div>
        <h1>AAC Board & Visual Explainer</h1>
        <p>Tap-to-speak symbol communication board and visual instruction simplifier for cognitive accessibility</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <span className="badge badge-warning">Tap & Switch Scanning</span>
          <span className="badge badge-success">Contextual Prediction</span>
          <span className="badge badge-primary">Pictorial Guides</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }} role="tablist">
        {[
          { id: 'aac', label: '💬 AAC Board' },
          { id: 'explainer', label: '📋 Visual Explainer' },
        ].map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab(t.id)}
            style={{ flex: 1 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── AAC Board ── */}
      {activeTab === 'aac' && (
        <div>
          {/* Controls bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Category tabs */}
            {Object.entries(AAC_CATEGORIES).map(([cat, data]) => (
              <button
                key={cat}
                className={`btn btn-sm ${activeCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setActiveCategory(cat); setSelectedItem(null); }}
                style={activeCategory === cat ? { borderColor: data.color, boxShadow: `0 0 10px ${data.color}44` } : {}}
                aria-label={`${data.icon} ${cat} category`}
                aria-pressed={activeCategory === cat}
              >
                {data.icon} {cat}
              </button>
            ))}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {/* Switch scan toggle */}
              <button
                className={`btn btn-sm ${switchScanActive ? 'btn-warning' : 'btn-ghost'}`}
                onClick={() => { setSwitchScanActive(s => !s); addToast(switchScanActive ? 'Switch scanning off' : 'Switch scanning on', 'info'); }}
                aria-label={`Switch scanning: ${switchScanActive ? 'On' : 'Off'}`}
                aria-pressed={switchScanActive}
                title="Switch Scanning Mode"
              >
                ⌨️ Scan
              </button>
            </div>
          </div>

          {/* Category header */}
          <div style={{
            padding: '12px 16px',
            background: `linear-gradient(90deg, ${category.color}20, transparent)`,
            borderLeft: `3px solid ${category.color}`,
            borderRadius: '0 var(--radius-md) var(--radius-md) 0',
            marginBottom: 16,
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
          }}>
            <strong style={{ color: category.color }}>{category.icon} {activeCategory}</strong> — Tap any symbol to speak instantly
          </div>

          {/* AAC Grid */}
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}
            role="grid"
            aria-label={`${activeCategory} AAC communication board`}
          >
            {items.map((item, i) => (
              <div role="gridcell" key={item.label}>
                <AACSoundTile
                  item={item}
                  onSelect={selectItem}
                  isSelected={selectedItem?.label === item.label}
                />
              </div>
            ))}
          </div>

          {/* Phrase queue */}
          {phraseQueue.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 18 }} aria-hidden="true">📝</div>
                <div className="card-title" style={{ fontSize: 'var(--font-size-base)' }}>Phrase Queue</div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={speakQueue}
                    aria-label="Speak all queued phrases"
                  >
                    <Volume2 size={14} /> Speak All
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={clearQueue}
                    aria-label="Clear phrase queue"
                  >
                    <Trash2 size={14} /> Clear
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="list" aria-label="Queued phrases">
                {phraseQueue.slice(-8).map((p, i) => (
                  <div
                    key={i}
                    role="listitem"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-full)',
                      padding: '6px 12px',
                      fontSize: 'var(--font-size-xs)',
                      border: '1px solid var(--bg-glass-border)',
                    }}
                  >
                    <span>{p.emoji}</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Currently speaking */}
          {isSpeaking && selectedItem && (
            <div className="alert alert-success" role="status" aria-live="assertive">
              <Volume2 size={18} aria-hidden="true" />
              <span>Speaking: "<strong>{selectedItem.phrase}</strong>"</span>
            </div>
          )}
        </div>
      )}

      {/* ── Visual Explainer ── */}
      {activeTab === 'explainer' && (
        <div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <div className="card-icon" style={{ background: 'rgba(124,58,237,0.2)' }} aria-hidden="true">📋</div>
              <div>
                <div className="card-title">Visual Instruction Simplifier</div>
                <div className="card-subtitle">Complex text converted to step-by-step pictorial guides</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(EXPLAINER_SAMPLES).map(([key, data]) => (
                <button
                  key={key}
                  className={`btn btn-sm ${explainerSample === key ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setExplainerSample(key)}
                  aria-label={`View ${data.title}`}
                  aria-pressed={explainerSample === key}
                  style={{ flex: 1 }}
                >
                  {data.title.split(' ').slice(0, 2).join(' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Step-by-step pictorial guide */}
          <div className="card">
            <div style={{
              background: `linear-gradient(135deg, ${explainer.color}22, transparent)`,
              border: `1px solid ${explainer.color}33`,
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: explainer.color }}>
                {explainer.title}
              </h2>
              <button
                className="btn btn-sm"
                style={{ background: explainer.color + '33', color: explainer.color, border: `1px solid ${explainer.color}55` }}
                onClick={() => speak(explainer.steps.map(s => s.text).join('. '))}
                aria-label="Read all steps aloud"
              >
                <Volume2 size={14} /> Read All
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} role="list" aria-label={`Steps for ${explainer.title}`}>
              {explainer.steps.map((step, i) => (
                <div
                  key={i}
                  role="listitem"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 18px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--bg-glass-border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => speak(`Step ${i + 1}: ${step.text}. ${step.detail}`)}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = explainer.color + '66'; e.currentTarget.style.background = explainer.color + '11'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-glass-border)'; e.currentTarget.style.background = 'var(--bg-input)'; }}
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && speak(`Step ${i + 1}: ${step.text}. ${step.detail}`)}
                  aria-label={`Step ${i + 1}: ${step.text}. ${step.detail}`}
                >
                  {/* Step number badge */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${explainer.color}, ${explainer.color}88)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 'var(--font-size-sm)', color: 'white',
                  }} aria-hidden="true">
                    {i + 1}
                  </div>
                  {/* Icon */}
                  <div style={{ fontSize: 28, flexShrink: 0 }} aria-hidden="true">{step.emoji}</div>
                  {/* Text */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 3 }}>{step.text}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{step.detail}</div>
                  </div>
                  {/* Tap to hear */}
                  <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }} aria-hidden="true">
                    🔊 tap
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-success)' }}>
              <CheckCircle size={14} style={{ display: 'inline', marginRight: 6 }} aria-hidden="true" />
              <strong>Pro tip:</strong> Tap any step to hear it read aloud. Works completely offline.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
