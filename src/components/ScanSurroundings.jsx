import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Camera, Volume2, RotateCcw, Upload } from 'lucide-react';
import { analyzeSurroundings, getDemoScanResponse } from '../services/gemini';
import { resizeImageToBase64 } from '../utils/imageUtils';

export default function ScanSurroundings({ onBack, appState, ttsSpeak }) {
  const { language = 'en', apiKey = '', demoMode = false } = appState || {};
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setCameraError(null);
    setCapturedImage(null);
    setResult(null);

    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn('Auto play handled:', e);
        }
      }
      setCameraActive(true);
      if (ttsSpeak) {
        ttsSpeak('Camera is ready. Press the capture button to scan your surroundings.');
      }
    } catch (err) {
      console.error('Camera startup error:', err);
      setCameraError('Camera access denied or not available. Please allow camera permissions or upload an image.');
      if (ttsSpeak) {
        ttsSpeak('Camera not available. You can upload an image instead.');
      }
    }
  }, [ttsSpeak]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const analyzeImage = useCallback(
    async (dataUrl) => {
      setIsAnalyzing(true);
      setError(null);
      setResult(null);
      if (ttsSpeak) {
        ttsSpeak('Analyzing your surroundings. Please wait...');
      }

      try {
        let scanResult;
        if (demoMode) {
          await new Promise((r) => setTimeout(r, 1500));
          scanResult = getDemoScanResponse(language);
        } else {
          const resized = await resizeImageToBase64(dataUrl, 1024, 1024, 0.85);
          scanResult = await analyzeSurroundings(resized, language, apiKey);
        }

        setResult(scanResult);
        setIsAnalyzing(false);

        if (scanResult && scanResult.description && ttsSpeak) {
          ttsSpeak(scanResult.description);
        }
      } catch (err) {
        setIsAnalyzing(false);
        const msg = err instanceof Error ? err.message : 'Analysis failed. Please try again.';
        setError(msg);
        if (ttsSpeak) {
          ttsSpeak('Sorry, analysis failed. Please try again.');
        }
      }
    },
    [demoMode, apiKey, language, ttsSpeak]
  );

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
    await analyzeImage(dataUrl);
  }, [stopCamera, analyzeImage]);

  const handleUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result;
        if (typeof dataUrl === 'string') {
          setCapturedImage(dataUrl);
          stopCamera();
          await analyzeImage(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    },
    [analyzeImage, stopCamera]
  );

  const dirLabel = (dir) => {
    const map = {
      left: 'LEFT',
      'slightly-left': 'SLIGHTLY LEFT',
      center: 'CENTER',
      'slightly-right': 'SLIGHTLY RIGHT',
      right: 'RIGHT',
    };
    return map[dir] || (typeof dir === 'string' ? dir.toUpperCase() : 'CENTER');
  };

  const distClass = (dist) => {
    const map = { 'very-close': 'very-close', near: 'near', medium: 'medium', far: 'far' };
    return map[dist] || 'medium';
  };

  const dirClass = (dir) => {
    if (dir === 'left' || dir === 'slightly-left') return 'left';
    if (dir === 'right' || dir === 'slightly-right') return 'right';
    return 'center';
  };

  return (
    <div className="screen">
      {/* Header */}
      <div className="screen-header">
        <button
          className="back-btn"
          onClick={() => {
            stopCamera();
            onBack();
          }}
          aria-label="Go back to home"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="screen-title">🔍 Scan Surroundings</div>
          <div className="screen-subtitle">AI analyzes your environment and describes it aloud</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: capturedImage || result ? '1fr 1fr' : '1fr',
          gap: 24,
        }}
      >
        {/* Camera / Image Container */}
        <div>
          <div className="camera-wrap" style={{ position: 'relative', width: '100%', minHeight: '380px', borderRadius: '16px', overflow: 'hidden', background: '#070b19' }}>
            
            {/* Always mounted video element ensures immediate stream binding */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                minHeight: '380px',
                objectFit: 'cover',
                display: capturedImage ? 'none' : 'block',
              }}
              aria-label="Live camera feed"
            />

            {/* Captured Image Preview */}
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured scene"
                style={{ width: '100%', height: '100%', minHeight: '380px', objectFit: 'cover', display: 'block' }}
              />
            )}

            {/* Error or Loading Overlay */}
            {cameraError && !capturedImage && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(7, 11, 25, 0.95)',
                  padding: 24,
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: 44, marginBottom: 12 }}>📷</span>
                <p style={{ color: '#ef4444', fontSize: '14px', maxWidth: '300px' }}>{cameraError}</p>
              </div>
            )}

            {/* Analyzing Overlay */}
            {isAnalyzing && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(9,13,26,0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                }}
              >
                <div className="spinner" style={{ width: 44, height: 44, borderWidth: 3 }} />
                <p style={{ color: '#38bdf8', fontWeight: 600 }}>AI Analyzing Scene...</p>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Detecting objects, distances & directions</p>
              </div>
            )}
          </div>

          {/* Capture Controls */}
          <div className="capture-controls" style={{ marginTop: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
            {/* Upload */}
            <button
              className="btn btn-ghost btn-icon-only"
              onClick={() => fileRef.current?.click()}
              aria-label="Upload image"
              title="Upload image"
            >
              <Upload size={20} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleUpload}
            />

            {/* Main Action Button */}
            {!capturedImage ? (
              <button
                className="capture-btn"
                onClick={capture}
                disabled={isAnalyzing}
                aria-label="Capture frame"
              >
                <Camera size={30} />
              </button>
            ) : (
              <button
                className="capture-btn"
                onClick={() => {
                  setCapturedImage(null);
                  setResult(null);
                  setError(null);
                  startCamera();
                }}
                aria-label="Scan again"
                style={{ background: 'linear-gradient(135deg, #6366F1, #22D3EE)' }}
              >
                <RotateCcw size={28} />
              </button>
            )}

            {/* Read aloud trigger */}
            {result && (
              <button
                className="btn btn-ghost btn-icon-only"
                onClick={() => result?.description && ttsSpeak && ttsSpeak(result.description)}
                aria-label="Repeat description aloud"
              >
                <Volume2 size={20} />
              </button>
            )}

            {!result && cameraError && (
              <button
                className="btn btn-ghost btn-icon-only"
                onClick={startCamera}
                aria-label="Retry camera"
              >
                <RotateCcw size={20} />
              </button>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Results Panel */}
        {(result || error || isAnalyzing) && (
          <div>
            {error && (
              <div className="alert alert-danger" role="alert" style={{ marginBottom: 16 }}>
                <span>⚠️ {error}</span>
              </div>
            )}

            {isAnalyzing && !result && (
              <div className="result-card" style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner" style={{ margin: '0 auto 16px', width: 32, height: 32 }} />
                <p style={{ color: '#94a3b8' }}>Analyzing scene with Gemini Vision...</p>
              </div>
            )}

            {result && !isAnalyzing && (
              <>
                <div className="result-card" style={{ marginBottom: 16 }}>
                  <div className="result-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="result-icon" style={{ background: 'rgba(99,102,241,0.15)', padding: 8, borderRadius: 8 }}>
                        🔊
                      </div>
                      <div>
                        <div className="result-title" style={{ fontWeight: 600 }}>Scene Description</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Spoken aloud automatically</div>
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm btn-icon-only"
                      onClick={() => ttsSpeak && ttsSpeak(result.description)}
                      aria-label="Read description aloud"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                  <p className="result-body" style={{ lineHeight: 1.6, color: '#e2e8f0' }}>
                    {result.description}
                  </p>
                </div>

                {result.objects && result.objects.length > 0 && (
                  <div className="result-card">
                    <div className="result-header" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="result-icon" style={{ background: 'rgba(34,211,238,0.12)', padding: 8, borderRadius: 8 }}>
                        📍
                      </div>
                      <div className="result-title" style={{ fontWeight: 600 }}>Detected Objects</div>
                    </div>
                    <div className="detection-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {result.objects.map((obj, i) => (
                        <div
                          key={i}
                          className="detection-item"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.06)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 18 }}>
                              {obj.name.toLowerCase().includes('person') ? '👤' : '📍'}
                            </span>
                            <span className="detection-name" style={{ fontWeight: 500 }}>{obj.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <span className={`dir-badge ${dirClass(obj.direction || obj.position)}`}>
                              {dirLabel(obj.direction || obj.position)}
                            </span>
                            <span className={`dist-badge ${distClass(obj.distance)}`}>
                              {obj.distance || 'close'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}