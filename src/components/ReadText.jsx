import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Camera, Volume2, RotateCcw, Upload, Copy, Check } from 'lucide-react';
import { extractText, getDemoOCRResponse } from '../services/gemini';
import { imageToBase64, resizeImageToBase64 } from '../utils/imageUtils';

export default function ReadText({ onBack, appState, ttsSpeak }) {
  const { language = 'en', apiKey = '', demoMode } = appState || {};
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Camera initializer identical to ScanSurroundings
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
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn('Auto-play caught:', e);
        }
      }
      setCameraActive(true);
      if (ttsSpeak) {
        ttsSpeak(
          language === 'hi'
            ? 'कैमरा तैयार है। टेक्स्ट की ओर करें और कैप्चर दबाएं।'
            : 'Camera ready. Point at text and press capture.',
          language
        );
      }
    } catch (err) {
      console.error('Camera startup error:', err);
      setCameraError('Camera access denied or device unavailable.');
      if (ttsSpeak) {
        ttsSpeak('Camera not available. You can upload an image instead.', language);
      }
    }
  }, [language, ttsSpeak]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const extractFromImage = useCallback(
    async (dataUrl) => {
      setIsExtracting(true);
      setError(null);
      setResult(null);

      if (ttsSpeak) {
        ttsSpeak(
          language === 'hi' ? 'टेक्स्ट पढ़ा जा रहा है, प्रतीक्षा करें...' : 'Reading text, please wait...',
          language
        );
      }

      try {
        let textContent = '';

        if (demoMode && !apiKey && !import.meta.env.VITE_GEMINI_API_KEY) {
          await new Promise((r) => setTimeout(r, 1200));
          const demo = getDemoOCRResponse(language);
          textContent = typeof demo === 'object' ? (demo.text || '') : demo;
        } else {
          const resized = await resizeImageToBase64(dataUrl, 1024, 1024, 0.85);
          const base64 = imageToBase64(resized);
          const response = await extractText(base64, language, apiKey);
          textContent = typeof response === 'object' ? (response.text || '') : response;
        }

        const trimmed = (textContent || '').trim();
        const isEmpty = !trimmed || trimmed.toLowerCase().includes('no readable text');

        const finalData = { text: trimmed, isEmpty };
        setResult(finalData);
        setIsExtracting(false);

        if (isEmpty) {
          if (ttsSpeak) {
            ttsSpeak(
              language === 'hi'
                ? 'कोई लिखा हुआ टेक्स्ट नहीं मिला।'
                : 'No readable text was found in this image.',
              language
            );
          }
        } else {
          if (ttsSpeak) {
            ttsSpeak(trimmed, language);
          }
        }
      } catch (err) {
        setIsExtracting(false);
        const msg = err instanceof Error ? err.message : 'Text extraction failed.';
        setError(msg);
        if (ttsSpeak) {
          ttsSpeak('Text extraction failed. Please try again.', language);
        }
      }
    },
    [demoMode, apiKey, language, ttsSpeak]
  );

  const capture = useCallback(async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
    await extractFromImage(dataUrl);
  }, [stopCamera, extractFromImage]);

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
          await extractFromImage(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    },
    [extractFromImage, stopCamera]
  );

  const copyText = useCallback(async () => {
    if (!result?.text) return;
    await navigator.clipboard?.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

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
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="screen-title">📄 Read Text</div>
          <div className="screen-subtitle">Point at any text — signs, books, labels — and hear it spoken</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: capturedImage || result ? '1fr 1fr' : '1fr', gap: 24, alignItems: 'start' }}>
        {/* Camera Container */}
        <div>
          <div className="camera-wrap" style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, minHeight: 360, background: '#000' }}>
            {/* Always rendered in DOM so ref is never null */}
            <video
              ref={videoRef}
              className="camera-video"
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: capturedImage ? 'none' : 'block',
              }}
              aria-label="Camera for text capture"
            />

            {cameraActive && !capturedImage && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '12%',
                  bottom: '12%',
                  left: '8%',
                  right: '8%',
                  border: '2px dashed rgba(34,211,238,0.6)',
                  borderRadius: 8,
                  pointerEvents: 'none',
                }}
              />
            )}

            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured text"
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block' }}
              />
            )}

            {!cameraActive && !capturedImage && (
              <div className="camera-overlay" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 44 }}>📄</span>
                <p style={{ color: 'var(--color-text-3)', fontSize: '0.85rem', marginTop: 8 }}>
                  {cameraError || 'Starting camera...'}
                </p>
              </div>
            )}

            {isExtracting && (
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
                <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                <p style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Reading Text via Gemini...</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="capture-controls" style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
            <button
              className="btn btn-ghost btn-icon-only"
              onClick={() => fileRef.current?.click()}
              aria-label="Upload image"
            >
              <Upload size={18} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />

            {!capturedImage ? (
              <button
                className="capture-btn"
                onClick={capture}
                disabled={isExtracting}
                aria-label="Capture text"
                style={{ background: 'linear-gradient(135deg, #22D3EE, #0EA5E9)' }}
              >
                <Camera size={28} />
              </button>
            ) : (
              <button
                className="capture-btn"
                onClick={() => startCamera()}
                aria-label="Scan again"
                style={{ background: 'linear-gradient(135deg, #22D3EE, #6366F1)' }}
              >
                <RotateCcw size={26} />
              </button>
            )}

            {result?.text && (
              <button
                className="btn btn-ghost btn-icon-only"
                onClick={() => ttsSpeak && ttsSpeak(result.text, language)}
                aria-label="Read text aloud"
              >
                <Volume2 size={18} />
              </button>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Result Area */}
        {(result || error || isExtracting) && (
          <div>
            {error && (
              <div className="alert alert-danger" role="alert" style={{ marginBottom: 16 }}>
                <span>⚠️</span><span>{error}</span>
              </div>
            )}

            {result && !isExtracting && (
              <div className="result-card">
                <div className="result-header" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div className="result-icon" style={{ background: 'rgba(34,211,238,0.12)', padding: 8, borderRadius: 8 }}>📝</div>
                  <div>
                    <div className="result-title" style={{ fontWeight: 600 }}>
                      {result.isEmpty ? 'No Text Detected' : 'Extracted Text'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>
                      {result.isEmpty ? 'Try with better lighting' : 'Read aloud automatically'}
                    </div>
                  </div>
                </div>

                {!result.isEmpty && (
                  <>
                    <div
                      className="result-text-large"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        padding: '14px 18px',
                        maxHeight: 280,
                        overflowY: 'auto',
                        marginBottom: 14,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {result.text}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className="btn btn-accent"
                        onClick={() => ttsSpeak && ttsSpeak(result.text, language)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      >
                        <Volume2 size={16} />
                        Read Aloud
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={copyText}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}