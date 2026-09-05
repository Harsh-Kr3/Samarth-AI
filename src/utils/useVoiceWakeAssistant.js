import { useEffect, useRef, useState, useCallback } from 'react';

export function useVoiceWakeAssistant({ 
  onNavigate, 
  currentLanguage, 
  onLanguageChange, 
  ttsSpeak 
}) {
  const [wakeState, setWakeState] = useState('IDLE'); // 'IDLE' | 'LISTENING_COMMAND'
  const [isMicReady, setIsMicReady] = useState(false);
  const [heardText, setHeardText] = useState('');

  const recognitionRef = useRef(null);
  const isCommandModeRef = useRef(false);
  const isManuallyStoppedRef = useRef(false);
  const isStartingRef = useRef(false);
  const restartTimerRef = useRef(null);
  const commandTimeoutRef = useRef(null);
  const lastProcessedRef = useRef('');

  // Audio feedback helper with phonetic normalization
  const speakNatural = useCallback((text) => {
    const smoothed = text
      .replace(/SAMARTH AI/gi, 'Samarth AI')
      .replace(/SAMARTH/gi, 'Samarth');
    console.log('[Samarth AI Speaks]:', smoothed);

    if (ttsSpeak) {
      ttsSpeak(smoothed, currentLanguage);
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(smoothed);
      utterance.lang = currentLanguage?.startsWith('hi') ? 'hi-IN' : 'en-IN';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, [ttsSpeak, currentLanguage]);

  // Execute recognized actions
  const executeCommand = useCallback((rawPhrase) => {
    const text = rawPhrase.toLowerCase().trim();
    console.log('[Samarth Executing Action]:', text);

    // 1. Language commands
    if (text.includes('english')) {
      onLanguageChange('en-IN');
      speakNatural('Language switched to English');
      return true;
    }
    if (text.includes('hindi') || text.includes('हिंदी')) {
      onLanguageChange('hi');
      speakNatural('भाषा बदलकर हिंदी कर दी गई है');
      return true;
    }
    if (text.includes('marathi') || text.includes('मराठी')) {
      onLanguageChange('mr');
      speakNatural('भाषा मराठी केली आहे');
      return true;
    }
    if (text.includes('telugu') || text.includes('తెలుగు')) {
      onLanguageChange('te');
      speakNatural('భాష తెలుగులోకి మార్చబడింది');
      return true;
    }
    if (text.includes('bengali') || text.includes('bangla') || text.includes('বাংলা')) {
      onLanguageChange('bn');
      speakNatural('भाषा বাংলায় পরিবর্তন করা হয়েছে');
      return true;
    }
    if (text.includes('tamil') || text.includes('தமிழ்')) {
      onLanguageChange('ta');
      speakNatural('மொழி தமிழாக மாற்றப்பட்டது');
      return true;
    }

    // 2. Navigation & Feature actions
    if (text.includes('scan') || text.includes('surrounding') || text.includes('camera') || text.includes('capture')) {
      speakNatural(currentLanguage?.startsWith('hi') 
        ? 'स्कैन शुरू कर रहे हैं, ढाई सेकंड में फोटो खींची जाएगी' 
        : 'Opening Scan Surroundings. Capturing automatically in 2.5 seconds.');
      onNavigate('scan', { autoCapture: true });
      return true;
    }

    if (text.includes('read') || text.includes('text') || text.includes('document') || text.includes('book') || text.includes('ocr')) {
      speakNatural(currentLanguage?.startsWith('hi') ? 'टेक्स्ट रीडर खोला जा रहा है' : 'Opening Read Text');
      onNavigate('read');
      return true;
    }

    if (text.includes('voice') || text.includes('assistant') || text.includes('talk') || text.includes('chat')) {
      speakNatural('Opening Voice Assistant');
      onNavigate('voice');
      return true;
    }

    if (text.includes('language') || text.includes('setting')) {
      speakNatural('Opening Language Settings');
      onNavigate('language');
      return true;
    }

    if (text.includes('home') || text.includes('back') || text.includes('main')) {
      speakNatural('Going back to Home');
      onNavigate('home');
      return true;
    }

    return false;
  }, [onNavigate, onLanguageChange, speakNatural, currentLanguage]);

  // Phonetic wake-phrase evaluation
  const isWakePhrase = (str) => {
    const s = str.toLowerCase();
    return (
      s.includes('samarth i need help') ||
      s.includes('samarth help') ||
      s.includes('samarth') ||
      s.includes('samart') ||
      s.includes('smart i need help') ||
      s.includes('summer i need help') ||
      s.includes('hey samarth') ||
      s.includes('ok samarth') ||
      s.includes('समर्थ')
    );
  };

  const stripWakeWords = (str) => {
    return str
      .replace(/samarth i need help|smart i need help|summer i need help|samarth help|hey samarth|ok samarth|samarth|samart|समर्थ/gi, '')
      .replace(/please|can you|could you/gi, '')
      .trim();
  };

  // Safe restart scheduler that prevents loop thrashing
  const scheduleRestart = useCallback(() => {
    if (isManuallyStoppedRef.current) return;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);

    restartTimerRef.current = setTimeout(() => {
      if (recognitionRef.current && !isManuallyStoppedRef.current && !isStartingRef.current) {
        try {
          isStartingRef.current = true;
          recognitionRef.current.start();
        } catch (e) {
          isStartingRef.current = false;
        }
      }
    }, 600); // Debounce to allow engine cleanup
  }, []);

  const startListening = useCallback(async () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Your browser does not support Speech Recognition. Please run on Google Chrome or Microsoft Edge.');
      return;
    }

    isManuallyStoppedRef.current = false;

    // If an instance already exists, do not re-instantiate
    if (recognitionRef.current) {
      try {
        isStartingRef.current = true;
        recognitionRef.current.start();
      } catch (_) {
        isStartingRef.current = false;
      }
      return;
    }

    // Request desktop mic stream explicitly
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      console.warn('Microphone permission check:', e);
    }

    const recog = new SpeechRec();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = currentLanguage?.startsWith('hi') ? 'hi-IN' : 'en-IN';

    recog.onstart = () => {
      isStartingRef.current = false;
      setIsMicReady(true);
      console.log('[Samarth AI] Steady Microphone Listener Ready.');
    };

    recog.onresult = (event) => {
      let fullTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
      }

      const heard = fullTranscript.toLowerCase().trim();
      if (!heard || heard === lastProcessedRef.current) return;

      console.log('[User Spoke]:', heard);
      setHeardText(heard);

      if (!isCommandModeRef.current) {
        if (isWakePhrase(heard)) {
          lastProcessedRef.current = heard;
          const directCommand = stripWakeWords(heard);

          // Combined sentence check: "Samarth I need help scan surroundings"
          if (directCommand.length > 2 && executeCommand(directCommand)) {
            setWakeState('IDLE');
            return;
          }

          // Otherwise activate command mode and reply
          isCommandModeRef.current = true;
          setWakeState('LISTENING_COMMAND');
          speakNatural('Sure, ask anything');

          if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
          commandTimeoutRef.current = setTimeout(() => {
            isCommandModeRef.current = false;
            setWakeState('IDLE');
          }, 8000);
        }
      } else {
        // In active command mode
        const cleanCommand = stripWakeWords(heard);
        if (cleanCommand.length > 2) {
          lastProcessedRef.current = heard;
          if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
          isCommandModeRef.current = false;
          setWakeState('IDLE');

          const executed = executeCommand(cleanCommand);
          if (!executed) {
            speakNatural("I didn't catch that. Say scan surroundings, read text, or change language.");
          }
        }
      }
    };

    recog.onerror = (e) => {
      isStartingRef.current = false;
      // Filter out benign browser events (aborted, no-speech) to avoid error loop logging
      if (e.error === 'not-allowed') {
        setIsMicReady(false);
        isManuallyStoppedRef.current = true;
      }
    };

    recog.onend = () => {
      isStartingRef.current = false;
      scheduleRestart();
    };

    try {
      isStartingRef.current = true;
      recog.start();
      recognitionRef.current = recog;
      setIsMicReady(true);
    } catch (_) {
      isStartingRef.current = false;
    }
  }, [currentLanguage, executeCommand, scheduleRestart, speakNatural]);

  // Teardown cleanup
  useEffect(() => {
    return () => {
      isManuallyStoppedRef.current = true;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
    };
  }, []);

  return { wakeState, isMicReady, startListening, heardText };
}