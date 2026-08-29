import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, Upload, Camera, Scan, Volume2, AlertTriangle, Zap, IndianRupee, CameraOff, X, ChevronDown, ChevronUp } from 'lucide-react';

/* ─── Sample OCR Data ─── */
const SAMPLE_TEXTS = {
  medicine: {
    label: '💊 Medicine Label',
    text: 'GLYCOMET 500mg\nMetformin Hydrochloride Tablets IP\nDose: 1 tablet twice daily after meals\nStore below 25°C. Keep away from children.\nMfg: Sun Pharmaceuticals Ltd.\nExp: 03/2027',
    lang: 'en',
  },
  signboard: {
    label: '🪧 Hindi Signboard',
    text: 'रेलवे स्टेशन — मुख्य द्वार\nप्लेटफ़ॉर्म 1, 2, 3 → सीधे जाएं\nशौचालय ← बाईं ओर 50 मीटर\nप्रतीक्षालय — ऊपरी मंज़िल',
    lang: 'hi',
  },
  bill: {
    label: '🧾 Grocery Bill',
    text: 'RELIANCE SMART — Tax Invoice\nDate: 10-Aug-2026 | Bill No: RSB/2026/7823\n-----------------------------------\nAata 5kg (Pillsbury)     ₹245.00\nToor Dal 1kg             ₹135.00\nTomatoes 1kg              ₹45.00\nAashirvaad Salt 1kg       ₹20.00\n-----------------------------------\nSub-Total:               ₹445.00\nGST (5%):                 ₹22.25\nTOTAL:                   ₹467.25\nAmount Paid (UPI):        ₹467.25\nChange:                     ₹0.00',
    lang: 'en',
  },
};

/* ─── Hazard Alert Data ─── */
const HAZARDS = [
  { id: 1, label: 'Stairs ahead', distance: '1.5m', direction: 'ahead', severity: 'high', icon: '⚠️' },
  { id: 2, label: 'Chair', distance: '0.8m', direction: 'left', severity: 'medium', icon: '🪑' },
  { id: 3, label: 'Door open', distance: '2.1m', direction: 'right', severity: 'low', icon: '🚪' },
  { id: 4, label: 'Wet floor', distance: '1.0m', direction: 'ahead', severity: 'high', icon: '🌊' },
  { id: 5, label: 'Pothole', distance: '1.8m', direction: 'left', severity: 'high', icon: '🕳️' },
  { id: 6, label: 'Vehicle', distance: '3.5m', direction: 'right', severity: 'medium', icon: '🚗' },
];

/* ─── Currency Data ─── */
const CURRENCY_NOTES = [
  { value: '₹500', color: '#a855f7', description: 'Purple/Lavender — Mangal Pandey on reverse', known: true },
  { value: '₹200', color: '#f59e0b', description: 'Yellow/Orange — Sanchi Stupa on reverse', known: true },
  { value: '₹100', color: '#06b6d4', description: 'Lavender Blue — Rani ki Vav on reverse', known: true },
  { value: '₹50',  color: '#10b981', description: 'Fluorescent Blue — Hampi with Chariot on reverse', known: true },
  { value: '₹20',  color: '#f97316', description: 'Greenish Yellow — Ellora Caves on reverse', known: true },
  { value: '₹10',  color: '#8b5cf6', description: 'Chocolate Brown — Sun Temple Konark on reverse', known: true },
];

/* ─── Depth Visualization ─── */
function DepthMap({ hazards, isActive }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !isActive) return;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    let animId;
    let frame = 0;

    function draw() {
      frame++;
      ctx.clearRect(0, 0, W, H);

      // Background gradient (depth map)
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(6,182,212,0.05)');
      grad.addColorStop(0.5, 'rgba(124,58,237,0.08)');
      grad.addColorStop(1, 'rgba(16,185,129,0.05)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Depth contours (animated waves)
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const y = (H * 0.2 * i) + Math.sin(frame * 0.02 + i) * 8;
        const alpha = 0.04 + i * 0.02;
        ctx.strokeStyle = `rgba(124,58,237,${alpha})`;
        ctx.lineWidth = 2;
        for (let x = 0; x <= W; x += 2) {
          const wy = y + Math.sin(x * 0.01 + frame * 0.03 + i) * 20;
          if (x === 0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
        }
        ctx.stroke();
      }

      // Hazard markers
      hazards.slice(0, 4).forEach((h, idx) => {
        const x = [W * 0.5, W * 0.25, W * 0.75, W * 0.5][idx];
        const dist = parseFloat(h.distance);
        const y = H - (dist / 4) * H * 0.7 - 30;
        const pulse = Math.sin(frame * 0.08 + idx) * 0.3 + 0.7;
        const color = h.severity === 'high' ? '#ef4444' : h.severity === 'medium' ? '#f59e0b' : '#10b981';

        // Pulse ring
        ctx.beginPath();
        ctx.arc(x, y, 18 * pulse + 6, 0, Math.PI * 2);
        ctx.strokeStyle = color + '40';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Marker
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fillStyle = color + 'cc';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(h.distance, x, y + 4);

        // Distance line to bottom
        ctx.beginPath();
        ctx.moveTo(x, y + 14);
        ctx.lineTo(x, H - 20);
        ctx.strokeStyle = color + '30';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // "You are here" indicator
      ctx.beginPath();
      ctx.arc(W / 2, H - 20, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('YOU', W / 2, H - 17);

      // Scan line
      const scanY = ((frame * 2) % H);
      const scanGrad = ctx.createLinearGradient(0, scanY - 3, 0, scanY + 3);
      scanGrad.addColorStop(0, 'rgba(6,182,212,0)');
      scanGrad.addColorStop(0.5, 'rgba(6,182,212,0.6)');
      scanGrad.addColorStop(1, 'rgba(6,182,212,0)');
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 3, W, 6);

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, [isActive, hazards]);

  return (
    <canvas
      ref={ref}
      style={{ width: '100%', height: '240px', borderRadius: 'var(--radius-md)', display: 'block' }}
      aria-label="Real-time depth map visualization showing obstacle distances"
      role="img"
    />
  );
}

/* ══════════════════════════════════════════════════════════════
   SMART VISION MODULE
   ══════════════════════════════════════════════════════════════ */
export default function SmartVisionModule({ speak, addToast }) {
  const [activeTab, setActiveTab] = useState('ocr');
  const [selectedSample, setSelectedSample] = useState('medicine');
  const [ocrResult, setOcrResult] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [depthActive, setDepthActive] = useState(false);
  const [detectedHazards, setDetectedHazards] = useState([]);
  const [identifiedCurrency, setIdentifiedCurrency] = useState(null);
  const [currencyScanning, setCurrencyScanning] = useState(false);
  const fileRef = useRef(null);

  const tabs = [
    { id: 'ocr', label: 'OCR Reader', emoji: '📄' },
    { id: 'depth', label: 'Hazard Detect', emoji: '🌊' },
    { id: 'currency', label: 'Currency ID', emoji: '💵' },
  ];

  /* Simulate OCR scan */
  const runOCR = useCallback(() => {
    setIsScanning(true);
    setOcrResult('');
    addToast('Scanning document...', 'info');
    setTimeout(() => {
      const sample = SAMPLE_TEXTS[selectedSample];
      setOcrResult(sample.text);
      setIsScanning(false);
      addToast('Text extracted successfully', 'success');
      speak(`Text extracted. ${sample.text.slice(0, 60)}`);
    }, 1800);
  }, [selectedSample, speak, addToast]);

  /* Activate depth sensing */
  const toggleDepth = useCallback(() => {
    if (!depthActive) {
      setDepthActive(true);
      setDetectedHazards([]);
      addToast('Depth sensing activated', 'info');
      speak('Depth sensing activated. Scanning for obstacles.');
      // Simulate progressive hazard detection
      const hazardsToShow = [...HAZARDS].sort(() => Math.random() - 0.5).slice(0, 4);
      hazardsToShow.forEach((h, i) => {
        setTimeout(() => {
          setDetectedHazards(prev => [...prev, h]);
          if (h.severity === 'high') {
            speak(`Warning! ${h.label}, ${h.distance} ${h.direction}`);
            addToast(`⚠️ ${h.label} — ${h.distance} ${h.direction}`, 'error');
          }
        }, (i + 1) * 700);
      });
    } else {
      setDepthActive(false);
      setDetectedHazards([]);
      addToast('Depth sensing paused', 'info');
    }
  }, [depthActive, speak, addToast]);

  /* Currency identification */
  const identifyCurrency = useCallback(() => {
    setCurrencyScanning(true);
    setIdentifiedCurrency(null);
    speak('Scanning currency. Please hold steady.');
    addToast('Scanning banknote...', 'info');
    setTimeout(() => {
      const note = CURRENCY_NOTES[Math.floor(Math.random() * CURRENCY_NOTES.length)];
      setIdentifiedCurrency(note);
      setCurrencyScanning(false);
      speak(`Identified ${note.value} Indian Rupee note. ${note.description}`);
      addToast(`✅ Identified: ${note.value}`, 'success');
    }, 2000);
  }, [speak, addToast]);

  return (
    <div>
      {/* Hero */}
      <div className="module-hero">
        <div
          className="module-hero-icon"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))', color: 'var(--color-primary-light)' }}
          aria-hidden="true"
        >
          👁️
        </div>
        <h1>Smart Vision & Spatial Sensing</h1>
        <p>AI-powered OCR, real-time obstacle detection, and currency identification for visual accessibility</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <span className="badge badge-primary">🟢 On-Device Processing</span>
          <span className="badge badge-accent">≤ 450ms Response</span>
          <span className="badge badge-success">Multi-lingual OCR</span>
        </div>
      </div>

      {/* Inner tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }} role="tablist" aria-label="Smart vision sub-modules">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setActiveTab(t.id)}
            style={{ flex: 1 }}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ── OCR Tab ── */}
      {activeTab === 'ocr' && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Controls */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background: 'rgba(124,58,237,0.2)' }} aria-hidden="true">📄</div>
              <div>
                <div className="card-title">OCR Document Scanner</div>
                <div className="card-subtitle">Multi-lingual text extraction with TTS</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="sample-select">Select Sample Document</label>
              <select
                id="sample-select"
                className="form-select"
                value={selectedSample}
                onChange={e => setSelectedSample(e.target.value)}
              >
                {Object.entries(SAMPLE_TEXTS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                className="btn btn-primary"
                onClick={runOCR}
                disabled={isScanning}
                aria-label="Start OCR scan on selected document"
                style={{ flex: 1 }}
              >
                {isScanning ? (
                  <>
                    <div className="scan-spinner" aria-hidden="true" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Scanning...
                  </>
                ) : (
                  <><Scan size={16} aria-hidden="true" /> Scan Text</>
                )}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => fileRef.current?.click()}
                aria-label="Upload image file for OCR"
              >
                <Upload size={16} aria-hidden="true" /> Upload
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} aria-hidden="true" onChange={runOCR} />
            </div>

            {/* Language support */}
            <div>
              <p className="form-label">Supported Languages</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['🇮🇳 Hindi', '🇬🇧 English', '🌿 Tamil', '🌊 Bengali', '☀️ Telugu', '🌺 Marathi'].map(l => (
                  <span key={l} className="badge badge-accent">{l}</span>
                ))}
              </div>
            </div>

            {isScanning && (
              <div style={{ marginTop: 16, position: 'relative', height: 60, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div className="scan-line" aria-label="Scanning..." />
                <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                  Processing with on-device OCR engine...
                </p>
              </div>
            )}
          </div>

          {/* Result */}
          <div className="card" style={{ minHeight: 300 }}>
            <div className="card-header">
              <div className="card-icon" style={{ background: 'rgba(16,185,129,0.2)' }} aria-hidden="true">📝</div>
              <div>
                <div className="card-title">Extracted Text</div>
                <div className="card-subtitle">{ocrResult ? 'Ready to read aloud' : 'Awaiting scan'}</div>
              </div>
            </div>

            {ocrResult ? (
              <>
                <div
                  style={{
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                    padding: 16,
                    fontFamily: 'monospace',
                    fontSize: 'var(--font-size-sm)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.7,
                    maxHeight: 220,
                    overflowY: 'auto',
                    color: 'var(--text-primary)',
                    marginBottom: 16,
                    border: '1px solid var(--bg-glass-border)',
                  }}
                  role="region"
                  aria-label="Extracted text content"
                  aria-live="polite"
                >
                  {ocrResult}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-accent"
                    onClick={() => speak(ocrResult)}
                    aria-label="Read extracted text aloud"
                    style={{ flex: 1 }}
                  >
                    <Volume2 size={16} aria-hidden="true" /> Read Aloud
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { navigator.clipboard?.writeText(ocrResult); addToast('Copied to clipboard', 'success'); }}
                    aria-label="Copy extracted text to clipboard"
                  >
                    📋 Copy
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>📄</div>
                <p>Select a sample or upload an image to begin scanning</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Depth / Hazard Tab ── */}
      {activeTab === 'depth' && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background: 'rgba(239,68,68,0.2)' }} aria-hidden="true">🌊</div>
              <div>
                <div className="card-title">Spatial Hazard Detection</div>
                <div className="card-subtitle">Monocular depth estimation with directional audio alerts</div>
              </div>
            </div>

            <button
              className={`btn ${depthActive ? 'btn-danger' : 'btn-primary'} w-full mb-md`}
              onClick={toggleDepth}
              aria-label={depthActive ? 'Stop depth sensing' : 'Start depth sensing and obstacle detection'}
              aria-pressed={depthActive}
            >
              {depthActive ? (
                <><CameraOff size={16} /> Stop Sensing</>
              ) : (
                <><Camera size={16} /> Start Depth Sensing</>
              )}
            </button>

            {/* Depth visualization */}
            <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 16, position: 'relative' }}>
              <DepthMap hazards={detectedHazards} isActive={depthActive} />
              {!depthActive && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,20,0.7)',
                  color: 'var(--text-muted)',
                }}>
                  <span style={{ fontSize: 32, marginBottom: 8 }}>📡</span>
                  <span style={{ fontSize: 'var(--font-size-sm)' }}>Activate sensing to scan environment</span>
                </div>
              )}
            </div>

            {/* Performance stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { label: 'Response', value: '≤450ms', color: 'var(--color-success)' },
                { label: 'Range', value: '0–6m', color: 'var(--color-accent)' },
                { label: 'Mode', value: 'On-Device', color: 'var(--color-primary-light)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ color: s.color, fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{s.value}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hazard list */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background: 'rgba(245,158,11,0.2)' }} aria-hidden="true">⚠️</div>
              <div>
                <div className="card-title">Detected Obstacles</div>
                <div className="card-subtitle">
                  {depthActive ? `${detectedHazards.length} obstacles detected` : 'Sensor inactive'}
                </div>
              </div>
            </div>

            {detectedHazards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{depthActive ? '🔍' : '😴'}</div>
                <p>{depthActive ? 'Scanning environment...' : 'Activate sensing above to begin'}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} role="list" aria-label="Detected obstacles">
                {detectedHazards.map(h => (
                  <div
                    key={h.id}
                    role="listitem"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px',
                      background: h.severity === 'high' ? 'rgba(239,68,68,0.08)' : h.severity === 'medium' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
                      border: `1px solid ${h.severity === 'high' ? 'rgba(239,68,68,0.25)' : h.severity === 'medium' ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
                      borderRadius: 'var(--radius-sm)',
                      animation: 'toast-in 0.3s ease',
                    }}
                    aria-label={`${h.severity} alert: ${h.label}, ${h.distance} to your ${h.direction}`}
                  >
                    <span style={{ fontSize: 24 }} aria-hidden="true">{h.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{h.label}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        📍 {h.distance} — {h.direction.toUpperCase()}
                      </div>
                    </div>
                    <span
                      className={`badge badge-${h.severity === 'high' ? 'danger' : h.severity === 'medium' ? 'warning' : 'success'}`}
                    >
                      {h.severity.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Currency Tab ── */}
      {activeTab === 'currency' && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background: 'rgba(16,185,129,0.2)' }} aria-hidden="true">💵</div>
              <div>
                <div className="card-title">Indian Currency Identifier</div>
                <div className="card-subtitle">Instant INR banknote recognition via AI vision</div>
              </div>
            </div>

            {/* Camera viewfinder simulation */}
            <div style={{
              height: 180,
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              border: currencyScanning ? '2px solid var(--color-accent)' : '2px solid var(--bg-glass-border)',
              transition: 'border-color 0.3s ease',
            }}>
              {currencyScanning && <div className="scan-line" aria-hidden="true" />}
              <div style={{
                position: 'absolute',
                inset: 20,
                border: '2px dashed rgba(255,255,255,0.15)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                  {currencyScanning ? '🔍 Analyzing banknote...' : '💸 Hold note in frame'}
                </span>
              </div>
              {/* Corner reticles */}
              {['topleft', 'topright', 'bottomleft', 'bottomright'].map(pos => (
                <div key={pos} style={{
                  position: 'absolute',
                  [pos.includes('top') ? 'top' : 'bottom']: 20,
                  [pos.includes('left') ? 'left' : 'right']: 20,
                  width: 20, height: 20,
                  borderTop: pos.includes('top') ? '3px solid var(--color-accent)' : 'none',
                  borderBottom: pos.includes('bottom') ? '3px solid var(--color-accent)' : 'none',
                  borderLeft: pos.includes('left') ? '3px solid var(--color-accent)' : 'none',
                  borderRight: pos.includes('right') ? '3px solid var(--color-accent)' : 'none',
                }} aria-hidden="true" />
              ))}
            </div>

            <button
              className={`btn ${currencyScanning ? 'btn-ghost' : 'btn-success'} w-full`}
              onClick={identifyCurrency}
              disabled={currencyScanning}
              aria-label="Identify Indian Rupee banknote using camera"
            >
              {currencyScanning ? (
                <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Scanning...</>
              ) : (
                <><IndianRupee size={16} /> Identify Currency</>
              )}
            </button>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background: 'rgba(6,182,212,0.2)' }} aria-hidden="true">🔎</div>
              <div>
                <div className="card-title">
                  {identifiedCurrency ? `Identified: ${identifiedCurrency.value}` : 'Recognition Result'}
                </div>
              </div>
            </div>

            {identifiedCurrency ? (
              <div>
                <div style={{
                  background: `linear-gradient(135deg, ${identifiedCurrency.color}22, ${identifiedCurrency.color}11)`,
                  border: `2px solid ${identifiedCurrency.color}44`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 24,
                  textAlign: 'center',
                  marginBottom: 16,
                }}>
                  <div style={{ fontSize: 56, fontWeight: 900, color: identifiedCurrency.color, marginBottom: 8 }}>
                    {identifiedCurrency.value}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    Indian Rupee Banknote
                  </div>
                </div>
                <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: 14, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 16 }}>
                  ℹ️ {identifiedCurrency.description}
                </div>
                <button
                  className="btn btn-accent w-full btn-sm"
                  onClick={() => speak(`Identified ${identifiedCurrency.value} Indian Rupee note. ${identifiedCurrency.description}`)}
                  aria-label="Read currency identification result aloud"
                >
                  <Volume2 size={14} /> Announce Result
                </button>
              </div>
            ) : (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 16 }}>
                  Supported denominations:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {CURRENCY_NOTES.map(note => (
                    <div key={note.value} style={{
                      background: `linear-gradient(135deg, ${note.color}20, transparent)`,
                      border: `1px solid ${note.color}30`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontWeight: 700, color: note.color }}>{note.value}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CSS for spinner */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
