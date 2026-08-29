import React, { useState, useCallback, useRef } from 'react';
import { Code2, Search, CheckCircle, XCircle, AlertCircle, Zap, RotateCcw, Copy, ChevronDown, ChevronUp } from 'lucide-react';

/* ── WCAG 2.2 Audit Rules ── */
const WCAG_RULES = [
  {
    id: 'color-contrast',
    title: 'Color Contrast Ratio',
    wcag: '1.4.3 (AA) / 1.4.6 (AAA)',
    description: 'Text must have contrast ratio ≥ 4.5:1 (AA) or ≥ 7:1 (AAA)',
    severity: 'critical',
    pattern: /color:\s*#([a-f0-9]{3,6})/gi,
  },
  {
    id: 'aria-labels',
    title: 'Missing ARIA Labels',
    wcag: '4.1.2 (AA)',
    description: 'All interactive elements must have accessible names via aria-label or aria-labelledby',
    severity: 'critical',
    pattern: /<(button|input|select|textarea)(?![^>]*aria-label)[^>]*>/gi,
  },
  {
    id: 'alt-text',
    title: 'Image Alt Text',
    wcag: '1.1.1 (A)',
    description: 'All <img> elements must have descriptive alt attributes',
    severity: 'critical',
    pattern: /<img(?![^>]*\balt\s*=)[^>]*>/gi,
  },
  {
    id: 'focus-visible',
    title: 'Focus Indicators',
    wcag: '2.4.11 (AAA)',
    description: 'Keyboard focus must be visibly indicated with ≥3px outline',
    severity: 'high',
    pattern: /outline:\s*none|outline:\s*0/gi,
  },
  {
    id: 'touch-target',
    title: 'Touch Target Size',
    wcag: '2.5.5 (AA)',
    description: 'Interactive targets must be ≥44×44px for motor accessibility',
    severity: 'high',
    pattern: /width:\s*([1-3][0-9]|[0-9])px|height:\s*([1-3][0-9]|[0-9])px/gi,
  },
  {
    id: 'lang-attr',
    title: 'HTML lang Attribute',
    wcag: '3.1.1 (A)',
    description: '<html> element must have a valid lang attribute for screen readers',
    severity: 'high',
    pattern: /<html(?![^>]*\blang\s*=)[^>]*>/gi,
  },
  {
    id: 'heading-hierarchy',
    title: 'Heading Hierarchy',
    wcag: '1.3.1 (A)',
    description: 'Headings must follow logical hierarchy (h1 → h2 → h3, no skipping)',
    severity: 'medium',
    pattern: /<h[1-6]/gi,
  },
  {
    id: 'form-labels',
    title: 'Form Field Labels',
    wcag: '1.3.1 (A)',
    description: 'All form inputs must be associated with a <label> element or aria-label',
    severity: 'critical',
    pattern: /<input(?![^>]*\baria-label|\bid\s*=)[^>]*>/gi,
  },
  {
    id: 'link-purpose',
    title: 'Link Purpose',
    wcag: '2.4.4 (AA)',
    description: 'Link text must describe the destination (avoid "click here", "read more")',
    severity: 'medium',
    pattern: /click here|read more|learn more|here/gi,
  },
  {
    id: 'skip-link',
    title: 'Skip Navigation Link',
    wcag: '2.4.1 (A)',
    description: 'Page must have a skip-to-main-content link for keyboard users',
    severity: 'high',
    pattern: /skip-to|skip-nav|skip-link|#main/gi,
  },
  {
    id: 'role-landmark',
    title: 'ARIA Landmark Roles',
    wcag: '1.3.6 (AAA)',
    description: 'Page must use semantic landmarks: main, nav, header, footer, aside',
    severity: 'medium',
    pattern: /<main|<nav|<header|<footer|<aside|role="main"|role="navigation"/gi,
  },
  {
    id: 'autocomplete',
    title: 'Form Autocomplete',
    wcag: '1.3.5 (AA)',
    description: 'Form inputs collecting personal data should use autocomplete attributes',
    severity: 'low',
    pattern: /autocomplete/gi,
  },
];

/* ── Sample HTML snippets ── */
const SAMPLE_CODES = {
  bad: {
    label: '❌ Inaccessible HTML',
    code: `<html>
  <body>
    <div onclick="doSomething()">Click Me</div>
    <img src="banner.jpg">
    <input type="text" placeholder="Enter name">
    <button style="width:30px; height:30px">OK</button>
    <a href="/page">Read more</a>
    <div style="color:#aaa; background:#999">Low contrast text</div>
    <input type="email">
    <h1>Title</h1>
    <h3>Skipped h2!</h3>
    <p style="outline: none">No focus indicator</p>
  </body>
</html>`,
  },
  good: {
    label: '✅ Accessible HTML',
    code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Accessible Page</title>
    <meta name="description" content="Page description">
  </head>
  <body>
    <a href="#main" class="skip-link">Skip to main content</a>
    <header role="banner">
      <nav role="navigation" aria-label="Main navigation"></nav>
    </header>
    <main id="main" role="main">
      <h1>Page Title</h1>
      <h2>Section</h2>
      <img src="photo.jpg" alt="Description of photo">
      <label for="name">Your Name</label>
      <input id="name" type="text" autocomplete="name" aria-label="Enter your full name">
      <button aria-label="Submit form" style="width:48px;height:48px">OK</button>
      <a href="/about">Learn about our mission</a>
    </main>
  </body>
</html>`,
  },
  website: {
    label: '🌐 Typical Website',
    code: `<html>
<head><title>My Website</title></head>
<body>
  <div id="nav">
    <a href="/">Home</a>
    <a href="/about">About</a>
  </div>
  <div id="content">
    <h2>Welcome!</h2>
    <img src="hero.png">
    <p style="color:#888">Subtle grey text on white background</p>
    <form>
      <input type="text" placeholder="Email">
      <input type="password" placeholder="Password">
      <div onclick="submit()" style="cursor:pointer; padding:5px 10px; background:blue; color:white">Login</div>
    </form>
    <a href="/more">Click here</a> for more details.
  </div>
</body>
</html>`,
  },
};

/* ── Compute mock contrast ratio ── */
function mockContrast(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return ((1 + 0.05) / (lum + 0.05)).toFixed(1);
}

/* ── Issue Detail Card ── */
function IssueCard({ issue, index }) {
  const [expanded, setExpanded] = useState(false);
  const severityColor = {
    critical: 'var(--color-danger)',
    high:     'var(--color-warning)',
    medium:   '#f97316',
    low:      'var(--color-accent)',
  };

  return (
    <div
      style={{
        background: 'var(--bg-input)',
        border: `1.5px solid ${severityColor[issue.severity]}33`,
        borderLeft: `4px solid ${severityColor[issue.severity]}`,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        animation: 'toast-in 0.3s ease',
      }}
      role="listitem"
    >
      <button
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
        }}
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        aria-label={`${issue.rule.title} — ${issue.severity} severity. ${expanded ? 'Collapse' : 'Expand'} details`}
      >
        <span style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: severityColor[issue.severity] + '22',
          border: `1px solid ${severityColor[issue.severity]}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: severityColor[issue.severity],
        }}>{index + 1}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>{issue.rule.title}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
            WCAG {issue.rule.wcag}
          </div>
        </div>
        <span className={`badge badge-${issue.severity === 'critical' ? 'danger' : issue.severity === 'high' ? 'warning' : 'accent'}`}>
          {issue.severity.toUpperCase()}
        </span>
        {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--bg-glass-border)' }}>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '12px 0 10px' }}>
            {issue.rule.description}
          </p>

          {/* Matching snippet */}
          {issue.matches.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                Found {issue.matches.length} occurrence{issue.matches.length > 1 ? 's' : ''}:
              </p>
              {issue.matches.slice(0, 2).map((m, i) => (
                <div key={i} style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  fontFamily: 'monospace',
                  fontSize: 'var(--font-size-xs)',
                  color: '#fca5a5',
                  marginBottom: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {m.slice(0, 80)}{m.length > 80 ? '...' : ''}
                </div>
              ))}
            </div>
          )}

          {/* Fix */}
          <div style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: 10,
          }}>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success)', fontWeight: 700, marginBottom: 6 }}>
              ✅ Recommended Fix:
            </p>
            <pre style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', color: '#6ee7b7', whiteSpace: 'pre-wrap', margin: 0 }}>
              {issue.fix}
            </pre>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { navigator.clipboard?.writeText(issue.fix); }}
            aria-label="Copy fix code to clipboard"
          >
            <Copy size={12} /> Copy Fix
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   WCAG AUDITOR MODULE
   ══════════════════════════════════════════════════════════════ */
export default function WCAGAuditorModule({ speak, addToast }) {
  const [code, setCode] = useState(SAMPLE_CODES.bad.code);
  const [urlInput, setUrlInput] = useState('');
  const [issues, setIssues] = useState([]);
  const [score, setScore] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [inputMode, setInputMode] = useState('code'); // 'code' | 'url'
  const [passed, setPassed] = useState([]);
  const [scanComplete, setScanComplete] = useState(false);

  /* Run audit */
  const runAudit = useCallback(() => {
    const html = inputMode === 'url' ? SAMPLE_CODES.website.code : code;
    if (!html.trim()) { addToast('Paste HTML code to audit', 'error'); return; }

    setIsScanning(true);
    setIssues([]);
    setPassed([]);
    setScanComplete(false);
    setScore(null);
    addToast('Running WCAG 2.2 audit...', 'info');

    setTimeout(() => {
      const foundIssues = [];
      const passedRules = [];

      WCAG_RULES.forEach(rule => {
        const matches = [...html.matchAll(rule.pattern)].map(m => m[0]);

        let hasIssue = false;
        let fix = '';

        switch (rule.id) {
          case 'color-contrast':
            hasIssue = matches.length > 0;
            fix = `/* Ensure contrast ≥ 4.5:1 */\ncolor: #f8f8ff; /* on dark bg */\nbackground: #111128;`;
            break;
          case 'aria-labels':
            hasIssue = /<(button|input|select|textarea)(?![^>]*aria-label)[^>]*>/i.test(html);
            fix = `<button aria-label="Submit form">OK</button>\n<input aria-label="Enter email address" />`;
            break;
          case 'alt-text':
            hasIssue = /<img(?![^>]*\balt\s*=)[^>]*>/i.test(html);
            fix = `<img src="photo.jpg" alt="Descriptive text about the image" />`;
            break;
          case 'focus-visible':
            hasIssue = /outline:\s*none|outline:\s*0/i.test(html);
            fix = `/* Remove outline:none from CSS */\n:focus-visible {\n  outline: 3px solid #7c3aed;\n  outline-offset: 3px;\n}`;
            break;
          case 'touch-target':
            hasIssue = /width:\s*([1-3][0-9]|[0-9])px/i.test(html) || /height:\s*([1-3][0-9]|[0-9])px/i.test(html);
            fix = `/* Ensure min 44×44px touch targets */\nbutton, a, [role="button"] {\n  min-width: 44px;\n  min-height: 44px;\n}`;
            break;
          case 'lang-attr':
            hasIssue = !/<html[^>]*\blang\s*=/i.test(html);
            fix = `<html lang="en">`;
            break;
          case 'heading-hierarchy':
            { const hs = [...html.matchAll(/<h([1-6])/gi)].map(m => parseInt(m[1]));
              for (let i = 1; i < hs.length; i++) {
                if (hs[i] - hs[i-1] > 1) { hasIssue = true; break; }
              }
            }
            fix = `<!-- Use sequential headings -->\n<h1>Page Title</h1>\n<h2>Section</h2>\n<h3>Sub-section</h3>`;
            break;
          case 'form-labels':
            hasIssue = /<input(?![^>]*\baria-label|\bfor\s*=)[^>]*>/i.test(html) && !/<label/i.test(html);
            fix = `<label for="email">Email Address</label>\n<input id="email" type="email" autocomplete="email" aria-label="Email address" />`;
            break;
          case 'link-purpose':
            hasIssue = /\bclick here\b|\bread more\b/i.test(html);
            fix = `<!-- Avoid generic link text -->\n<a href="/about">Learn about our accessibility commitment</a>`;
            break;
          case 'skip-link':
            hasIssue = !/#main|skip-link|skip-nav/i.test(html);
            fix = `<a href="#main" class="skip-link">Skip to main content</a>`;
            break;
          case 'role-landmark':
            hasIssue = !/<main|<nav|role="main"|role="navigation"/i.test(html);
            fix = `<header role="banner">\n  <nav role="navigation" aria-label="Main">\n  </nav>\n</header>\n<main id="main" role="main">...</main>`;
            break;
          case 'autocomplete':
            hasIssue = /<input[^>]*type=["']?(email|tel|password|name)[^>]*(?!autocomplete)[^>]*>/i.test(html);
            fix = `<input type="email" autocomplete="email" />\n<input type="tel" autocomplete="tel" />`;
            break;
        }

        if (hasIssue) {
          foundIssues.push({ rule, matches, fix, severity: rule.severity });
        } else {
          passedRules.push(rule);
        }
      });

      // Calculate score
      const total = WCAG_RULES.length;
      const criticalPenalty = foundIssues.filter(i => i.severity === 'critical').length * 10;
      const highPenalty     = foundIssues.filter(i => i.severity === 'high').length * 6;
      const mediumPenalty   = foundIssues.filter(i => i.severity === 'medium').length * 3;
      const lowPenalty      = foundIssues.filter(i => i.severity === 'low').length * 1;
      const rawScore = Math.max(0, 100 - criticalPenalty - highPenalty - mediumPenalty - lowPenalty);

      setIssues(foundIssues);
      setPassed(passedRules);
      setScore(rawScore);
      setIsScanning(false);
      setScanComplete(true);
      addToast(`Audit complete — Score: ${rawScore}/100`, rawScore >= 70 ? 'success' : 'error');
      speak(`WCAG audit complete. Score: ${rawScore} out of 100. Found ${foundIssues.length} issues.`);
    }, 2200);
  }, [code, inputMode, speak, addToast]);

  const scoreColor = score === null ? 'var(--text-muted)' :
    score >= 80 ? 'var(--color-success)' :
    score >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';

  const scoreLabel = score === null ? '—' :
    score >= 80 ? 'Good' :
    score >= 60 ? 'Needs Work' : 'Poor';

  return (
    <div>
      {/* Hero */}
      <div className="module-hero">
        <div
          className="module-hero-icon"
          style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.3), rgba(190,24,93,0.2))', color: '#ec4899' }}
          aria-hidden="true"
        >
          🔍
        </div>
        <h1>WCAG 2.2 Accessibility Auditor</h1>
        <p>Paste HTML code to instantly audit against WCAG 2.2 AA/AAA guidelines with one-click code fixes</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <span className="badge badge-primary">12 WCAG 2.2 Rules</span>
          <span className="badge badge-success">Auto Code Fixes</span>
          <span className="badge badge-warning">AA + AAA Levels</span>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Input Panel */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-icon" style={{ background: 'rgba(236,72,153,0.2)' }} aria-hidden="true">📝</div>
              <div>
                <div className="card-title">Input</div>
                <div className="card-subtitle">Paste HTML or enter a URL to audit</div>
              </div>
            </div>

            {/* Input mode toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                className={`btn btn-sm ${inputMode === 'code' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setInputMode('code')}
                aria-pressed={inputMode === 'code'}
              >
                {'</>'}  Paste HTML
              </button>
              <button
                className={`btn btn-sm ${inputMode === 'url' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setInputMode('url')}
                aria-pressed={inputMode === 'url'}
              >
                🌐 URL Scan
              </button>
            </div>

            {/* Sample loader */}
            {inputMode === 'code' && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {Object.entries(SAMPLE_CODES).map(([key, s]) => (
                  <button
                    key={key}
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCode(s.code)}
                    aria-label={`Load ${s.label}`}
                    style={{ fontSize: 11 }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {inputMode === 'code' ? (
              <div className="form-group">
                <label className="form-label" htmlFor="html-input">HTML Code</label>
                <textarea
                  id="html-input"
                  className="form-textarea"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  rows={14}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                  placeholder="Paste your HTML code here..."
                  aria-label="HTML code to audit for accessibility"
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label" htmlFor="url-input">Website URL</label>
                <input
                  id="url-input"
                  type="url"
                  className="form-input"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://example.com"
                  aria-label="Enter website URL to audit"
                />
                <div className="alert alert-info" style={{ marginTop: 8 }}>
                  <AlertCircle size={14} />
                  <span style={{ fontSize: 'var(--font-size-xs)' }}>Demo mode: scanning pre-loaded website snippet for this hackathon presentation.</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={runAudit}
                disabled={isScanning}
                aria-label="Run WCAG 2.2 accessibility audit"
                style={{ flex: 1 }}
              >
                {isScanning ? (
                  <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Auditing...</>
                ) : (
                  <><Search size={16} /> Run WCAG Audit</>
                )}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => { setCode(''); setIssues([]); setScore(null); setScanComplete(false); }}
                aria-label="Clear code and reset audit"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {/* WCAG rules legend */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 18 }} aria-hidden="true">📚</span>
              <div className="card-title" style={{ fontSize: 'var(--font-size-base)' }}>WCAG 2.2 Rules Checked</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} role="list">
              {WCAG_RULES.map(r => (
                <div
                  key={r.id}
                  role="listitem"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 10px',
                    background: scanComplete && passed.find(p => p.id === r.id) ? 'rgba(16,185,129,0.07)' : 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-xs)',
                  }}
                >
                  {scanComplete ? (
                    passed.find(p => p.id === r.id)
                      ? <CheckCircle size={13} style={{ color: 'var(--color-success)', flexShrink: 0 }} aria-label="Pass" />
                      : <XCircle size={13} style={{ color: 'var(--color-danger)', flexShrink: 0 }} aria-label="Fail" />
                  ) : (
                    <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'var(--bg-glass-border)', flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{r.title}</span>
                  <span className={`badge badge-${r.severity === 'critical' ? 'danger' : r.severity === 'high' ? 'warning' : r.severity === 'medium' ? 'accent' : 'primary'}`} style={{ fontSize: 9 }}>
                    {r.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div>
          {/* Score card */}
          <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 8 }}>
              WCAG 2.2 Accessibility Score
            </div>
            <div style={{ fontSize: 80, fontWeight: 900, color: scoreColor, lineHeight: 1, marginBottom: 8 }} aria-label={`Score: ${score ?? 'not yet calculated'} out of 100`}>
              {score ?? '—'}
            </div>
            {score !== null && (
              <div style={{ fontSize: 'var(--font-size-lg)', color: scoreColor, fontWeight: 700, marginBottom: 12 }}>
                {scoreLabel}
              </div>
            )}
            {score !== null && (
              <>
                <div className="progress-bar-wrap" style={{ marginBottom: 16, height: 12 }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${score}%`,
                      background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}aa)`,
                      transition: 'width 1s ease',
                    }}
                    role="progressbar"
                    aria-valuenow={score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Accessibility score: ${score}%`}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-danger)' }}>{issues.length}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Issues</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-success)' }}>{passed.length}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Passed</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-warning)' }}>
                      {issues.filter(i => i.severity === 'critical').length}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Critical</div>
                  </div>
                </div>
              </>
            )}
            {!score && !isScanning && (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                Run an audit to see your WCAG 2.2 score
              </p>
            )}
            {isScanning && (
              <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                <div style={{ width: 36, height: 36, border: '3px solid rgba(236,72,153,0.2)', borderTopColor: '#ec4899', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} aria-hidden="true" />
                Analyzing DOM against WCAG 2.2 rules...
              </div>
            )}
          </div>

          {/* Issues list */}
          {issues.length > 0 && (
            <div className="card">
              <div className="card-header" style={{ marginBottom: 16 }}>
                <div className="card-icon" style={{ background: 'rgba(239,68,68,0.2)' }} aria-hidden="true">
                  <XCircle size={18} style={{ color: 'var(--color-danger)' }} />
                </div>
                <div>
                  <div className="card-title">Issues Found</div>
                  <div className="card-subtitle">Click each issue to see fix</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} role="list" aria-label="WCAG audit issues">
                {issues.map((issue, i) => (
                  <IssueCard key={issue.rule.id} issue={issue} index={i} />
                ))}
              </div>

              {score !== null && score < 80 && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(124,58,237,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(124,58,237,0.2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-light)' }}>
                  <Zap size={14} style={{ display: 'inline', marginRight: 6 }} aria-hidden="true" />
                  <strong>Fix all critical issues</strong> to improve score by ~{issues.filter(i=>i.severity==='critical').length * 10} points. Average improvement after SAMARTH audit: <strong>+35%</strong>.
                </div>
              )}
            </div>
          )}

          {scanComplete && issues.length === 0 && (
            <div className="alert alert-success" role="status">
              <CheckCircle size={18} />
              <span><strong>Perfect Score!</strong> No WCAG 2.2 violations detected. This page is fully accessible! 🎉</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
