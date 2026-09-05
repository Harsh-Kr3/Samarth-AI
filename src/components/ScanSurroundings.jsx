import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  ArrowLeft, 
  AlertCircle, 
  Zap, 
  ZapOff,
  RotateCcw,
  Layers,
  Compass
} from 'lucide-react';
import { AnalyzeSurroundings as analyzeScene } from '../services/gemini';

export default function ScanSurroundings({ onBack, appState = {}, ttsSpeak, autoCapture = false }) {
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null); // { description: '', objects: [] }
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [countdown, setCountdown] = useState(autoCapture ? 2.5 : null);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const hasTriggeredAutoCapture = useRef(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setError(null);

    const constraints = {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch((e) => console.warn('Video play warning:', e));
        };
      }

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      setHasTorch(Boolean(capabilities.torch));
    } catch (err) {
      console.warn('Primary camera stream failed, trying fallback...', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch((e) => console.warn('Fallback play warning:', e));
        }
      } catch (fallbackErr) {
        console.error('Camera permission denied:', fallbackErr);
        setError('Camera blocked or unavailable. Please check browser permissions.');
      }
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [startCamera, stopCamera]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle error:', e);
      }
    }
  };

  const toggleCameraFacing = () => {
    setTorchOn(false);
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Full spatial audio narrator
  const handleSpeakData = useCallback((data) => {
    if (!data) return;

    let fullSpeech = '';
    if (typeof data === 'string') {
      fullSpeech = data;
    } else {
      fullSpeech = data.description || '';
      if (Array.isArray(data.objects) && data.objects.length > 0) {
        const objectReadouts = data.objects.map((obj) => {
          const pos = obj.position ? `at your ${obj.position.toLowerCase()}` : '';
          const dist = obj.distance ? `about ${obj.distance}` : '';
          return `${obj.name},${pos} ${dist}.${obj.details || ''}`.trim();
        });
        fullSpeech += `. Detected items: ${objectReadouts.join('. ')}`;
      }
    }

    setIsPlayingAudio(true);

    if (ttsSpeak) {
      ttsSpeak(fullSpeech, appState.language);
      const words = fullSpeech.split(/\s+/).filter(Boolean).length;
      setTimeout(() => setIsPlayingAudio(false), Math.max(3000, words * 380));
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(fullSpeech);
      utterance.lang = appState.language?.startsWith('hi') ? 'hi-IN' : 'en-US';
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  }, [appState.language, ttsSpeak]);

  const stopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  // Capture Image & Query Vision AI
  const handleCapture = useCallback(async () => {
    if (!videoRef.current || loading) return;

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      console.warn('Video not ready yet');
      return;
    }

    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 200);

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

    setLoading(true);
    setError(null);

    try {
      const response = await analyzeScene(
        base64Image,
        appState.language || 'en-IN',
        appState.apiKey || ''
      );

      let parsed = { description: '', objects: [] };

      if (typeof response === 'string') {
        try {
          parsed = JSON.parse(response);
        } catch (_) {
          parsed = { description: response, objects: [] };
        }
      } else if (response && typeof response === 'object') {
        parsed = {
          description: response.description || response.summary || 'Scene analyzed.',
          objects: Array.isArray(response.objects) ? response.objects : []
        };
      }

      setAnalysisData(parsed);
      handleSpeakData(parsed);
    } catch (err) {
      console.error('Vision analysis error:', err);
      const errPrompt = appState.language?.startsWith('hi')
        ? 'दृश्य का विश्लेषण करने में असमर्थ। कृपया पुनः प्रयास करें।'
        : 'Failed to analyze surroundings. Please try again.';
      setError(errPrompt);
      if (ttsSpeak) ttsSpeak(errPrompt, appState.language);
    } finally {
      setLoading(false);
    }
  }, [loading, appState.language, appState.apiKey, handleSpeakData, ttsSpeak]);

  // 2.5-Second Auto-Capture
  useEffect(() => {
    if (!autoCapture || hasTriggeredAutoCapture.current) return;
    hasTriggeredAutoCapture.current = true;

    if (ttsSpeak) {
      ttsSpeak(
        appState.language?.startsWith('hi') 
          ? 'कैमरा तैयार हो रहा है, ढाई सेकंड में फोटो ली जाएगी' 
          : 'Camera ready. Capturing automatically in 2.5 seconds.',
        appState.language
      );
    }

    const interval = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0.5 ? Number((prev - 0.5).toFixed(1)) : 0));
    }, 500);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setCountdown(null);
      handleCapture();
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [autoCapture, handleCapture, ttsSpeak, appState.language]);

  const handleResetScan = () => {
    setAnalysisData(null);
    setError(null);
    stopAudio();
    startCamera();
  };

  const getPositionColor = (pos) => {
    const p = (pos || '').toUpperCase();
    if (p === 'LEFT') return '#38bdf8';
    if (p === 'RIGHT') return '#a855f7';
    return '#10b981'; // CENTER
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '480px',
      height: '100dvh',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      backgroundColor: '#040711',
      color: '#ffffff',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Top Bar */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        padding: '14px 18px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <button
          type="button"
          onClick={() => {
            stopAudio();
            onBack();
          }}
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer'
          }}
          aria-label="Go Back"
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
            Spatial Vision & Distance
          </h1>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {loading ? 'Measuring Distances...' : 'Live Object Mapping'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              style={{
                background: torchOn ? 'rgba(234, 179, 8, 0.25)' : 'rgba(15, 23, 42, 0.85)',
                border: `1px solid ${torchOn ? '#eab308' : 'rgba(255, 255, 255, 0.12)'}`,
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: torchOn ? '#fde047' : '#ffffff',
                cursor: 'pointer'
              }}
              aria-label="Toggle Torch"
            >
              {torchOn ? <Zap size={17} /> : <ZapOff size={17} />}
            </button>
          )}

          <button
            type="button"
            onClick={toggleCameraFacing}
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            }}
            aria-label="Flip Camera"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* Camera Live Stream Port */}
      <main style={{
        position: 'relative',
        flex: 1,
        margin: '6px 14px',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {shutterFlash && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: '#ffffff',
            zIndex: 40
          }} />
        )}

        {!loading && !analysisData && (
          <div style={{
            position: 'absolute',
            width: '220px',
            height: '220px',
            border: '2px dashed rgba(0, 219, 233, 0.45)',
            borderRadius: '24px',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Compass size={32} color="rgba(0, 219, 233, 0.6)" />
          </div>
        )}

        {countdown !== null && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(4, 7, 17, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            zIndex: 30
          }}>
            <div style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              border: '3px solid #00dbe9',
              boxShadow: '0 0 35px rgba(0, 219, 233, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 800,
              color: '#ffffff'
            }}>
              {countdown}s
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
              Auto-capturing photo...
            </span>
          </div>
        )}

        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(4, 7, 17, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            zIndex: 35
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: '3px solid rgba(0, 219, 233, 0.2)',
              borderTopColor: '#00dbe9',
              animation: 'spin 0.85s linear infinite'
            }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
              Measuring objects and distances...
            </span>
          </div>
        )}

        {error && (
          <div style={{
            position: 'absolute',
            inset: '20px',
            background: 'rgba(185, 28, 28, 0.95)',
            borderRadius: '20px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 12,
            zIndex: 45
          }}>
            <AlertCircle size={32} />
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.4, fontWeight: 500 }}>{error}</p>
            <button
              type="button"
              onClick={startCamera}
              style={{
                background: '#ffffff',
                border: 'none',
                color: '#991b1b',
                fontWeight: 700,
                fontSize: '12px',
                padding: '8px 18px',
                borderRadius: '999px',
                cursor: 'pointer'
              }}
            >
              Retry Camera
            </button>
          </div>
        )}
      </main>

      {/* Bottom Panel with Object Badges */}
      <footer style={{
        position: 'relative',
        zIndex: 20,
        padding: '8px 14px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
        {analysisData && (
          <div style={{
            background: 'rgba(11, 19, 38, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 219, 233, 0.4)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
            borderRadius: '20px',
            padding: '14px',
            maxHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={16} color="#00dbe9" />
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#00dbe9', fontWeight: 800 }}>
                  Environment & Object Distances
                </span>
              </div>

              <button
                type="button"
                onClick={() => (isPlayingAudio ? stopAudio() : handleSpeakData(analysisData))}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '4px 10px',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer'
                }}
              >
                {isPlayingAudio ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{isPlayingAudio ? 'Pause' : 'Replay'}</span>
              </button>
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: '4px' }}>
              <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.4, color: '#f8fafc' }}>
                {analysisData.description}
              </p>

              {Array.isArray(analysisData.objects) && analysisData.objects.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                    Detected Objects ({analysisData.objects.length})
                  </span>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                    gap: '6px'
                  }}>
                    {analysisData.objects.map((obj, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'rgba(15, 23, 42, 0.85)',
                          border: `1px solid ${getPositionColor(obj.position)}55`,
                          borderLeft: `3px solid ${getPositionColor(obj.position)}`,
                          borderRadius: '10px',
                          padding: '7px 9px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 3
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                            {obj.name}
                          </span>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            color: '#00dbe9',
                            background: 'rgba(0, 219, 233, 0.18)',
                            padding: '1px 6px',
                            borderRadius: '4px'
                          }}>
                            {obj.distance || '~1m'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#94a3b8' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85px' }}>
                            {obj.details || 'Detected'}
                          </span>
                          <span style={{ fontWeight: 700, color: getPositionColor(obj.position) }}>
                            {obj.position || 'CENTER'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shutter & Rescan Dock */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          {analysisData && (
            <button
              type="button"
              onClick={handleResetScan}
              style={{
                position: 'absolute',
                left: 10,
                background: 'rgba(30, 41, 59, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '999px',
                padding: '9px 16px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={14} />
              <span>Scan Again</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCapture}
            disabled={loading}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: loading ? '#334155' : 'linear-gradient(135deg, #00dbe9, #0284c7)',
              border: '2px solid rgba(255, 255, 255, 0.85)',
              boxShadow: '0 0 24px rgba(0, 219, 233, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            aria-label="Capture Surroundings"
          >
            <Camera size={26} />
          </button>
        </div>
      </footer>
    </div>
  );
}