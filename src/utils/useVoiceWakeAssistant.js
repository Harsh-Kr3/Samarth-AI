import { useEffect, useRef, useState, useCallback } from 'react';

export function useVoiceWakeAssistant({ 
  onNavigate, 
  currentLanguage = 'en-IN', 
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

  // Audio response wrapper with natural pronunciation
  const speakNatural = useCallback((text) => {
    const smoothed = text
      .replace(/SAMARTH AI/gi, 'Samarth AI')
      .replace(/SAMARTH/gi, 'Samarth');
    console.log('[Samarth Voice Prompt]:', smoothed);

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

  // Command Parser & Router
  const executeCommand = useCallback((rawPhrase) => {
    const text = rawPhrase.toLowerCase().trim();
    console.log('[Samarth Processing User Command]:', text);

    // 1. Language Controls
    if (text.includes('english')) {
      onLanguageChange?.('en-IN');
      speakNatural('Language switched to English');
      return true;
    }
    if (text.includes('hindi') || text.includes('हिंदी')) {
      onLanguageChange?.('hi-IN');
      speakNatural('भाषा बदलकर हिंदी कर दी गई है');
      return true;
    }
    if (text.includes('marathi') || text.includes('मराठी')) {
      onLanguageChange?.('mr-IN');
      speakNatural('भाषा मराठी केली आहे');
      return true;
    }
    if (text.includes('telugu') || text.includes('తెలుగు')) {
      onLanguageChange?.('te-IN');
      speakNatural('భాష తెలుగులోకి మార్చబడింది');
      return true;
    }
    if (text.includes('bengali') || text.includes('bangla') || text.includes('বাংলা')) {
      onLanguageChange?.('bn-IN');
      speakNatural('भाषा বাংলায় পরিবর্তন করা হয়েছে');
      return true;
    }
    if (text.includes('tamil') || text.includes('தமிழ்')) {
      onLanguageChange?.('ta-IN');
      speakNatural('மொழி தமிழாக மாற்றப்பட்டது');
      return true;
    }

    // 2. Scan Surroundings (including phonetic variations)
    if (
      text.includes('scan') ||
      text.includes('surrounding') ||
      text.includes('surroundings') ||
      text.includes('cancer round') ||
      text.includes('cancer rounding') ||
      text.includes('can surround') ||
      text.includes('camera') ||
      text.includes('capture') ||
      text.includes('look around') ||
      text.includes('dekho') ||
      text.includes('आसपास')
    ) {
      speakNatural(currentLanguage?.startsWith('hi') 
        ? 'परिवेश का स्कैन शुरू हो रहा है, ढाई सेकंड में फोटो खींची जाएगी' 
        : 'Opening Scan Surroundings. Capturing automatically in 2.5 seconds.');
      onNavigate?.('scan', { autoCapture: true });
      return true;
    }

    // 3. Read Text / Document OCR
    if (
      text.includes('read') ||
      text.includes('text') ||
      text.includes('document') ||
      text.includes('paper') ||
      text.includes('book') ||
      text.includes('ocr') ||
      text.includes('padho') ||
      text.includes('पढ़ो')
    ) {
      speakNatural(currentLanguage?.startsWith('hi') ? 'टेक्स्ट रीडर खोला जा रहा है' : 'Opening Read Text');
      onNavigate?.('read');
      return true;
    }

    // 4. Voice Assistant Screen
    if (
      text.includes('voice') ||
      text.includes('assistant') ||
      text.includes('talk') ||
      text.includes('chat') ||
      text.includes('baat') ||
      text.includes('बात')
    ) {
      speakNatural('Opening Voice Assistant');
      onNavigate?.('voice');
      return true;
    }

    // 5. Language Settings
    if (text.includes('language') || text.includes('setting') || text.includes('settings')) {
      speakNatural('Opening Language Settings');
      onNavigate?.('language');
      return true;
    }

    // 6. Navigation: Home / Back
    if (text.includes('home') || text.includes('back') || text.includes('main') || text.includes('wapas')) {
      speakNatural('Going back to Home');
      onNavigate?.('home');
      return true;
    }

    return false;
  }, [onNavigate, onLanguageChange, speakNatural, currentLanguage]);

  // Wake Detection matching "i need help" OR "samarth i need help"
  const isWakePhrase = (str) => {
    const s = str.toLowerCase();
    return (
      s.includes('i need help') ||
      s.includes('need help') ||
      s.includes('samarth i need help') ||
      s.includes('samarth help') ||
      s.includes('hey samarth') ||
      s.includes('ok samarth') ||
      s.includes('samarth') ||
      s.includes('samart') ||
      s.includes('smart i need help') ||
      s.includes('summer i need help') ||
      s.includes('मदद चाहिए') ||
      s.includes('समर्थ')
    );
  };

  const stripWakeWords = (str) => {
    return str
      .replace(/samarth i need help|smart i need help|summer i need help|samarth help|i need help|need help|hey samarth|ok samarth|samarth|samart|समर्थ|मदद चाहिए/gi, '')
      .replace(/please|can you|could you|want to/gi, '')
      .trim();
  };

  // Safe Debounced Reconnector
  const scheduleRestart = useCallback(() => {
    if (isManuallyStoppedRef.current) return;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);

    restartTimerRef.current = setTimeout(() => {
      if (recognitionRef.current && !isManuallyStoppedRef.current && !isStartingRef.current) {
        try {
          isStartingRef.current = true;
          recognitionRef.current.start();
        } catch (_) {
          isStartingRef.current = false;
        }
      }
    }, 500);
  }, []);

  // Main listener starter
  const startListening = useCallback(async () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('Speech Recognition not supported in this browser.');
      return;
    }

    isManuallyStoppedRef.current = false;

    if (recognitionRef.current) {
      try {
        isStartingRef.current = true;
        recognitionRef.current.start();
      } catch (_) {
        isStartingRef.current = false;
      }
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (e) {
      console.warn('Microphone permission state:', e);
    }

    const recog = new SpeechRec();
    recog.continuous = true;
    recog.interimResults = true;
    recog.maxAlternatives = 3;
    recog.lang = currentLanguage?.startsWith('hi') ? 'hi-IN' : 'en-IN';

    recog.onstart = () => {
      isStartingRef.current = false;
      setIsMicReady(true);
      console.log('[Samarth AI] Always-On Voice Ear Activated.');
    };

    recog.onresult = (event) => {
      let fullTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
      }

      const heard = fullTranscript.toLowerCase().trim();
      if (!heard || heard === lastProcessedRef.current) return;

      console.log('[Voice Heard]:', heard);
      setHeardText(heard);

      // 1. Not in command mode -> test for wake word
      if (!isCommandModeRef.current) {
        if (isWakePhrase(heard)) {
          lastProcessedRef.current = heard;
          const directCommand = stripWakeWords(heard);

          // If spoken all-in-one: "I need help scan surroundings"
          if (directCommand.length > 2 && executeCommand(directCommand)) {
            setWakeState('IDLE');
            return;
          }

          // Otherwise, awaken the assistant and prompt user
          isCommandModeRef.current = true;
          setWakeState('LISTENING_COMMAND');
          speakNatural('Sure, ask anything');

          if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
          commandTimeoutRef.current = setTimeout(() => {
            isCommandModeRef.current = false;
            setWakeState('IDLE');
          }, 9000); // 9-second window for the user to speak their command
        }
      } else {
        // 2. Already awakened -> process command immediately
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

  // Teardown
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