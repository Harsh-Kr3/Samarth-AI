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
  const timerRef = useRef(null);
  const lastProcessedTextRef = useRef('');

  // Phonetic sanitizer: ensures browser voices pronounce "Samarth" smoothly
  const speakNatural = useCallback((text) => {
    // Replace all uppercase SAMARTH with spoken title-case Samarth
    const smoothed = text.replace(/SAMARTH AI/gi, 'Samarth AI').replace(/SAMARTH/gi, 'Samarth');
    console.log('[Samarth AI Output]:', smoothed);

    if (ttsSpeak) {
      ttsSpeak(smoothed, currentLanguage);
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(smoothed);
      utterance.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, [ttsSpeak, currentLanguage]);

  // Execute Action Commands
  const executeCommand = useCallback((rawPhrase) => {
    const text = rawPhrase.toLowerCase().trim();
    console.log('[Samarth Parsing Command]:', text);

    // 1. Language Switching
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

    // 2. Navigation Actions
    // Scan Surroundings + 2.5s Auto-Capture
    if (text.includes('scan') || text.includes('surrounding') || text.includes('surroundings') || text.includes('camera') || text.includes('capture')) {
      speakNatural(currentLanguage === 'hi' 
        ? 'स्कैन शुरू कर रहे हैं, ढाई सेकंड में फोटो खींची जाएगी' 
        : 'Opening Scan Surroundings. Capturing automatically in 2.5 seconds.');
      onNavigate('scan', { autoCapture: true });
      return true;
    }

    // Read Text / Document OCR
    if (text.includes('read') || text.includes('text') || text.includes('document') || text.includes('book') || text.includes('paper')) {
      speakNatural(currentLanguage === 'hi' ? 'टेक्स्ट रीडर खोला जा रहा है' : 'Opening Read Text');
      onNavigate('read');
      return true;
    }

    // Voice Assistant Screen
    if (text.includes('voice') || text.includes('assistant') || text.includes('talk') || text.includes('chat') || text.includes('ask')) {
      speakNatural('Opening Voice Assistant');
      onNavigate('voice');
      return true;
    }

    // Language Settings Screen
    if (text.includes('language') || text.includes('setting') || text.includes('settings')) {
      speakNatural('Opening Language Settings');
      onNavigate('language');
      return true;
    }

    // Home / Back
    if (text.includes('home') || text.includes('back') || text.includes('main screen') || text.includes('dashboard')) {
      speakNatural('Going back to Home');
      onNavigate('home');
      return true;
    }

    return false;
  }, [onNavigate, onLanguageChange, speakNatural, currentLanguage]);

  // Wake word detector (accommodating Indian speech accents and system phonetics)
  const containsWakeWord = (str) => {
    const s = str.toLowerCase();
    return (
      s.includes('samarth i need help') ||
      s.includes('samarth help') ||
      s.includes('hey samarth') ||
      s.includes('ok samarth') ||
      s.includes('samarth ai') ||
      s.includes('samarth') ||
      s.includes('samart') ||
      s.includes('smart i need help') ||
      s.includes('summer i need help') ||
      s.includes('समर्थ')
    );
  };

  const stripWakeWords = (str) => {
    return str
      .replace(/samarth i need help|smart i need help|summer i need help|samarth help|hey samarth|ok samarth|samarth ai|samarth|samart|समर्थ/gi, '')
      .replace(/please|can you|could you|i want to/gi, '')
      .trim();
  };

  const startListening = useCallback(async () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Your browser does not support Speech Recognition. Please run on Google Chrome or Microsoft Edge.');
      return;
    }

    // Grant audio stream permission explicitly
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      console.warn('Microphone permission query:', e);
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }

    const recog = new SpeechRec();
    recog.continuous = true;
    recog.interimResults = true;
    recog.maxAlternatives = 3;
    recog.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';

    recog.onstart = () => {
      setIsMicReady(true);
      console.log('[Samarth AI] Active Microphone Engine Ready.');
    };

    recog.onresult = (event) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }

      const heard = currentTranscript.toLowerCase().trim();
      if (!heard || heard === lastProcessedTextRef.current) return;

      setHeardText(heard);

      // 1. Check if user is triggering the wake phrase
      if (!isCommandModeRef.current) {
        if (containsWakeWord(heard)) {
          lastProcessedTextRef.current = heard;
          const remainingCommand = stripWakeWords(heard);

          // If the user spoke wake word + command in one sentence:
          // e.g. "Samarth I need help scan surroundings"
          if (remainingCommand.length > 2 && executeCommand(remainingCommand)) {
            setWakeState('IDLE');
            return;
          }

          // Otherwise, enter active command mode and reply "Sure, ask anything"
          isCommandModeRef.current = true;
          setWakeState('LISTENING_COMMAND');
          speakNatural('Sure, ask anything');

          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            isCommandModeRef.current = false;
            setWakeState('IDLE');
          }, 8000);
        }
      } else {
        // 2. In active listening mode: parse user command instantly
        const cleanCommand = stripWakeWords(heard);
        if (cleanCommand.length > 2) {
          lastProcessedTextRef.current = heard;
          if (timerRef.current) clearTimeout(timerRef.current);
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
      console.warn('[Speech Recognition Event]:', e.error);
      if (e.error === 'not-allowed') {
        setIsMicReady(false);
      }
    };

    recog.onend = () => {
      // Loop recognition so it never sleeps
      setTimeout(() => {
        try { recog.start(); } catch (_) {}
      }, 300);
    };

    try {
      recog.start();
      recognitionRef.current = recog;
      setIsMicReady(true);
    } catch (_) {}
  }, [currentLanguage, executeCommand, speakNatural]);

  return { wakeState, isMicReady, startListening, heardText };
}