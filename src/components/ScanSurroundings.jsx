import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Camera, Volume2, RotateCcw, Upload } from 'lucide-react';
import { analyzeSurroundings, getDemoScanResponse } from '../services/gemini';
import { imageToBase64, getMimeType, resizeImageToBase64 } from '../utils/imageUtils';

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

  // Robust universal camera startup
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
        videoRef.current.muted = true;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        await videoRef.current.play().catch((e) => console.warn('Play interrupted:', e));
      }
      setCameraActive(true);
      if (ttsSpeak) {
        ttsSpeak('Camera is ready. Press the capture button to scan your surroundings.');
      }
    } catch (err) {
      console.error('Camera startup error:', err);
      setCameraError('Camera access denied or not available. Please allow camera access or upload an image.');
      if (ttsSpeak) {
        ttsSpeak('Camera not available. You can upload an image instead.');
      }
    }
  }, [ttsSpeak]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

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

  // Capture photo from video feed
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

  // Upload image handler
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

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

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
          gridTemplateColumns: capturedImage ? '1fr 1fr' : '1fr',
          gap: 24,
        }}
      >
        {/* Camera / Captured image */}
        <div>
          <div className="camera-wrap">
            {/* Live camera */}
            {cameraActive && !capturedImage && (
              <>
                <video
                  ref={videoRef}
                  className="camera-video"
                  autoPlay
                  playsInline
                  muted
                  aria-label="Live camera feed"
                />
                {isAnalyzing && <div className="scan-line" aria-hidden="true" />}
                <div className="camera-reticle aria-hidden" />
              </>
            )}

            {/* Captured image preview */}
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured scene for analysis"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}

            {/* No camera / error state */}
            {!cameraActive && !capturedImage && (
              <div className="camera-overlay" aria-live="polite">
                {cameraError ? (
                  <>
                    <span style={{ fontSize: 48 }}>📷</span>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-2)' }}>{cameraError}</p>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 48 }}>📷</span>
                    <p style={{ color: 'var(--color-text-3)' }}>Camera loading...</p>
                  </>
                )}
              </div>
            )}

            {/* Analyzing overlay */}
            {isAnalyzing && capturedImage && (
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
                aria-live="polite"
              >
                <div className="scan-line" aria-hidden="true" />
                <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                <p style={{ color: 'var(--color-accent)', fontWeight: 600 }}>AI Analyzing Scene...</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                  Detecting objects, distances & directions
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="capture-controls">
            {/* Upload button */}
            <button
              className="btn btn-ghost btn-icon-only"
              onClick={() => fileRef.current?.click()}
              aria-label="Upload an image file"
              title="Upload image"
            >
              <Upload size={18} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleUpload}
              aria-hidden="true"
            />

            {/* Main capture button */}
            {cameraActive && !capturedImage ? (
              <button
                className="capture-btn"
                onClick={capture}
                disabled={isAnalyzing}
                aria-label="Capture photo and analyze surroundings"
              >
                <Camera size={30} aria-hidden="true" />
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
                aria-label="Scan again - open camera"
                style={{ background: 'linear-gradient(135deg, #6366F1, #22D3EE)' }}
              >
                <RotateCcw size={28} aria-hidden="true" />
              </button>
            )}

            {/* Retake / speech repeat */}
            {result && (
              <button
                className="btn btn-ghost btn-icon-only"
                onClick={() => result && ttsSpeak && ttsSpeak(result.description)}
                aria-label="Read result aloud again"
                title="Read aloud"
              >
                <Volume2 size={18} />
              </button>
            )}

            {!result && !cameraActive && (
              <button
                className="btn btn-ghost btn-icon-only"
                onClick={startCamera}
                aria-label="Retry camera"
                title="Retry camera"
              >
                <RotateCcw size={18} />
              </button>
            )}
          </div>

          {/* Hidden Canvas */}
          <canvas ref={canvasRef} className="camera-canvas" aria-hidden="true" style={{ display: 'none' }} />
        </div>

        {/* Results Panel */}
        {(result || error || isAnalyzing) && (
          <div>
            {error && (
              <div className="alert alert-danger" role="alert">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {isAnalyzing && !result && (
              <div className="result-card" style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner" style={{ margin: '0 auto 16px', width: 32, height: 32 }} />
                <p style={{ color: 'var(--color-text-2)' }}>Analyzing scene with Gemini Vision...</p>
              </div>
            )}

            {result && !isAnalyzing && (
              <>
                {/* Description */}
                <div className="result-card" style={{ marginBottom: 16 }}>
                  <div className="result-header">
                    <div className="result-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
                      🔊
                    </div>
                    <div>
                      <div className="result-title">Scene Description</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                        Spoken aloud automatically
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm btn-icon-only"
                      onClick={() => ttsSpeak && ttsSpeak(result.description)}
                      aria-label="Read description aloud"
                      style={{ marginLeft: 'auto' }}
                    >
                      <Volume2 size={14} />
                    </button>
                  </div>
                  <p className="result-body" aria-live="polite">
                    {result.description}
                  </p>
                </div>

                {/* Detected Objects */}
                {result.objects && result.objects.length > 0 && (
                  <div className="result-card">
                    <div className="result-header" style={{ marginBottom: 12 }}>
                      <div className="result-icon" style={{ background: 'rgba(34,211,238,0.12)' }}>
                        📍
                      </div>
                      <div className="result-title">Detected Objects</div>
                    </div>
                    <div className="detection-list" role="list" aria-label="Detected objects with directions and distances">
                      {result.objects.map((obj, i) => (
                        <div
                          key={i}
                          className="detection-item"
                          role="listitem"
                          style={{ animationDelay: `${i * 0.08}s` }}
                          aria-label={`${obj.name}, ${dirLabel(obj.direction || obj.position)}, ${obj.distance || 'nearby'}`}
                        >
                          <span style={{ fontSize: 20 }} aria-hidden="true">
                            {obj.name.toLowerCase().includes('person') ? '👤' : '📍'}
                          </span>
                          <span className="detection-name">{obj.name}</span>
                          <span className={`dir-badge ${dirClass(obj.direction || obj.position)}`}>
                            {dirLabel(obj.direction || obj.position)}
                          </span>
                          <span className={`dist-badge ${distClass(obj.distance)}`}>
                            {obj.distance || 'close'}
                          </span>
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