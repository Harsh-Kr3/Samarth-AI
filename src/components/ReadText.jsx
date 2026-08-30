import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Camera, Volume2, RotateCcw, Upload, Copy, Check } from 'lucide-react';
import { extractText, getDemoOCRResponse } from '../services/gemini';
import { imageToBase64, getMimeType, resizeImageToBase64 } from '../utils/imageUtils';

export default function ReadText({ onBack, appState, ttsSpeak }) {
  const { language, apiKey, demoMode } = appState;
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

  const startCamera = useCallback(async () => {
    setError(null);
    setCameraError(null);
    setCapturedImage(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      ttsSpeak('Camera ready. Point at text and press capture to read it.');
    } catch {
      setCameraError('Camera not accessible. Use the upload button to load an image.');
      ttsSpeak('Camera not available. You can upload an image instead.');
    }
  }, [ttsSpeak]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
    stopCamera();
    await extractFromImage(dataUrl);
  }, [stopCamera]);

  const extractFromImage = useCallback(async (dataUrl) => {
    setIsExtracting(true);
    setError(null);
    setResult(null);
    ttsSpeak('Extracting text from image. Please wait...');

    try {
      let ocrResult;

      if (demoMode || !apiKey) {
        await new Promise(r => setTimeout(r, 2000));
        ocrResult = getDemoOCRResponse(language);
      } else {
        const resized = await resizeImageToBase64(dataUrl, 1600, 1600, 0.9);
        const base64 = imageToBase64(resized);
        const mime = getMimeType(resized);
        ocrResult = await extractText(apiKey, base64, mime, language);
      }

      setResult(ocrResult);
      setIsExtracting(false);

      if (ocrResult.isEmpty) {
        ttsSpeak('No readable text was found in this image. Please try with a clearer image.');
      } else {
        ttsSpeak(ocrResult.text);
      }
    } catch (err) {
      setIsExtracting(false);
      const msg = err instanceof Error ? err.message : 'Text extraction failed. Please try again.';
      setError(msg);
      ttsSpeak('Text extraction failed. Please try again.');
    }
  }, [demoMode, apiKey, language, ttsSpeak]);

  const handleUpload = useCallback(async (e) => {
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
  }, [extractFromImage, stopCamera]);

  const copyText = useCallback(async () => {
    if (!result?.text) return;
    await navigator.clipboard?.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div className="screen">
      {/* Header */}
      <div className="screen-header">
        <button className="back-btn" onClick={() => { stopCamera(); onBack(); }} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="screen-title">📄 Read Text</div>
          <div className="screen-subtitle">Point at any text — signs, books, labels — and hear it spoken</div>
        </div>
      </div>

      

      <div style={{ display: 'grid', gridTemplateColumns: capturedImage ? '1fr 1fr' : '1fr', gap: 24, alignItems: 'start' }}>
        {/* Camera */}
        <div>
          <div className="camera-wrap">
            {cameraActive && !capturedImage && (
              <>
                <video
                  ref={videoRef}
                  className="camera-video"
                  autoPlay
                  playsInline
                  muted
                  aria-label="Camera for text capture"
                />
                {/* Document frame guide */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '10%', bottom: '10%',
                    left: '5%', right: '5%',
                    border: '2px dashed rgba(34,211,238,0.5)',
                    borderRadius: 8,
                    pointerEvents: 'none',
                  }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    bottom: '12%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'var(--color-accent)',
                    fontSize: '0.75rem',
                    padding: '4px 12px',
                    borderRadius: 99,
                    fontWeight: 600,
                    pointerEvents: 'none',
                  }}
                >
                  Keep text within the frame
                </div>
              </>
            )}

            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured text image"
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block' }}
              />
            )}

            {!cameraActive && !capturedImage && (
              <div className="camera-overlay">
                <span style={{ fontSize: 48 }}>📄</span>
                <p style={{ color: 'var(--color-text-3)', fontSize: 'var(--text-sm)' }}>
                  {cameraError || 'Camera loading...'}
                </p>
              </div>
            )}

            {/* Scan overlay while extracting */}
            {isExtracting && capturedImage && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(9,13,26,0.85)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 16,
              }} aria-live="polite">
                <div className="scan-line" aria-hidden="true" />
                <div className="spinner" aria-hidden="true" style={{ width: 40, height: 40, borderWidth: 3 }} />
                <p style={{ color: 'var(--color-accent)', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                  Reading Text...
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                  OCR via Gemini Vision
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="capture-controls">
            <button
              className="btn btn-ghost btn-icon-only"
              onClick={() => fileRef.current?.click()}
              aria-label="Upload image file"
            >
              <Upload size={18} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} aria-hidden="true" />

            {cameraActive && !capturedImage ? (
              <button
                className="capture-btn"
                onClick={capture}
                disabled={isExtracting}
                aria-label="Capture image for text extraction"
                style={{ background: 'linear-gradient(135deg, #22D3EE, #0EA5E9)' }}
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
                aria-label="Capture new image"
                style={{ background: 'linear-gradient(135deg, #22D3EE, #6366F1)' }}
              >
                <RotateCcw size={28} aria-hidden="true" />
              </button>
            )}

            {result?.text && (
              <button
                className="btn btn-ghost btn-icon-only"
                onClick={() => ttsSpeak(result.text)}
                aria-label="Read extracted text aloud again"
              >
                <Volume2 size={18} />
              </button>
            )}
          </div>

          <canvas ref={canvasRef} className="camera-canvas" aria-hidden="true" />
        </div>

        {/* Result panel */}
        {(result || error || isExtracting) && (
          <div>
            {error && (
              <div className="alert alert-danger" role="alert">
                <span>⚠️</span><span>{error}</span>
              </div>
            )}

            {isExtracting && !result && (
              <div className="result-card" style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner" style={{ margin: '0 auto 16px', width: 32, height: 32, borderWidth: 3 }} />
                <p style={{ color: 'var(--color-text-2)' }}>Extracting text from image...</p>
              </div>
            )}

            {result && !isExtracting && (
              <div className="result-card">
                <div className="result-header">
                  <div className="result-icon" style={{ background: 'rgba(34,211,238,0.12)' }}>📝</div>
                  <div>
                    <div className="result-title">
                      {result.isEmpty ? 'No Text Found' : 'Extracted Text'}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-3)' }}>
                      {result.isEmpty ? 'Try with a clearer image' : 'Read aloud automatically'}
                    </div>
                  </div>
                </div>

                {result.isEmpty ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-3)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                    <p>No readable text was found in this image.</p>
                    <p style={{ fontSize: 'var(--text-sm)', marginTop: 8 }}>
                      Try again with better lighting or a clearer image.
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      className="result-text-large"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px 20px',
                        maxHeight: 340,
                        overflowY: 'auto',
                        marginBottom: 16,
                      }}
                      aria-live="polite"
                      aria-label="Extracted text content"
                    >
                      {result.text}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className="btn btn-accent"
                        onClick={() => ttsSpeak(result.text)}
                        aria-label="Read extracted text aloud"
                        style={{ flex: 1 }}
                      >
                        <Volume2 size={16} aria-hidden="true" />
                        Read Aloud
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={copyText}
                        aria-label="Copy text to clipboard"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied!' : 'Copy'}
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
