import { useEffect, useRef, useState, useCallback } from 'react';

export function useVoiceWakeAssistant({ 
  onNavigate, 
  currentLanguage = 'en-IN', 
  onLanguageChange, 
  ttsSpeak 
}) {
  const [isMicReady, setIsMicReady] = useState(false);
  const [isListeningForCommand, setIsListeningForCommand] = useState(false);
  const [heardText, setHeardText] = useState('');

  const recognitionRef = useRef(null);
  const isManuallyStoppedRef = useRef(false);
  const isStartingRef = useRef(false);
  const restartTimerRef = useRef(null);
  const lastProcessedRef = useRef('');

  // Audio helper that speaks and automatically turns mic back on when done speaking
  const speakWithResume = useCallback((text, onComplete) => {
    console.log('[Samarth AI Output]:', text);

    // Temporarily pause recognition so Samarth doesn't listen to its own voice
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }

    if (ttsSpeak) {
      ttsSpeak(text, currentLanguage);
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      setTimeout(() => {
        if (onComplete) onComplete();
        resumeListening();
      }, Math.max(1800, wordCount * 360));
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLanguage?.startsWith('hi') ? 'hi-IN' : 'en-IN';
      utterance.onend = () => {
        if (onComplete) onComplete();
        resumeListening();
      };
      utterance.onerror = () => {
        if (onComplete) onComplete();
        resumeListening();
      };
      window.speechSynthesis.speak(utterance);
    }
  }, [ttsSpeak, currentLanguage]);

  // Command Parser & Execution
  const parseAndExecute = useCallback((rawPhrase) => {
    const text = rawPhrase.toLowerCase().trim();
    console.log('[Samarth Heard User Command]:', text);

    // 1. Language Commands
    if (text.includes('english')) {
      onLanguageChange?.('en-IN');
      speakWithResume('Language switched to English');
      return true;
    }
    if (text.includes('hindi') || text.includes('हिंदी')) {
      onLanguageChange?.('hi-IN');
      speakWithResume('भाषा बदलकर हिंदी कर दी गई है');
      return true;
    }
    if (text.includes('marathi') || text.includes('मराठी')) {
      onLanguageChange?.('mr-IN');
      speakWithResume('भाषा मराठी केली आहे');
      return true;
    }
    if (text.includes('telugu') || text.includes('తెలుగు')) {
      onLanguageChange?.('te-IN');
      speakWithResume('భాష తెలుగులోకి మార్చబడింది');
      return true;
    }
    if (text.includes('bengali') || text.includes('বাংলা')) {
      onLanguageChange?.('bn-IN');
      speakWithResume('भाषा বাংলায় পরিবর্তন করা হয়েছে');
      return true;
    }
    if (text.includes('tamil') || text.includes('தமிழ்')) {
      onLanguageChange?.('ta-IN');
      speakWithResume('மொழி தமிழாக மாற்றப்பட்டது');
      return true;
    }

    // 2. Scan Surroundings (includes phonetic catchers)
    if (
      text.includes('scan') ||
      text.includes('surrounding') ||
      text.includes('surroundings') ||
      text.includes('cancer round') ||
      text.includes('can surround') ||
      text.includes('camera') ||
      text.includes('capture') ||
      text.includes('look')
    ) {
      speakWithResume(
        currentLanguage?.startsWith('hi')
          ? 'परिवेश का स्कैन शुरू कर रहे हैं'
          : 'Opening Scan Surroundings and capturing automatically',
        () => onNavigate?.('scan', { autoCapture: true })
      );
      return true;
    }

    // 3. Read Text
    if (
      text.includes('read') ||
      text.includes('text') ||
      text.includes('document') ||
      text.includes('paper') ||
      text.includes('book') ||
      text.includes('ocr')
    ) {
      speakWithResume(
        currentLanguage?.startsWith('hi') ? 'टेक्स्ट रीडर खोला जा रहा है' : 'Opening Read Text',
        () => onNavigate?.('read')
      );
      return true;
    }

    // 4. Voice Assistant
    if (text.includes('voice') || text.includes('assistant') || text.includes('talk') || text.includes('chat')) {
      speakWithResume('Opening Voice Assistant', () => onNavigate?.('voice'));
      return true;
    }

    // 5. Language Settings
    if (text.includes('setting') || text.includes('settings')) {
      speakWithResume('Opening Language Settings', () => onNavigate?.('language'));
      return true;
    }

    // 6. Home / Back
    if (text.includes('home') || text.includes('back') || text.includes('main')) {
      speakWithResume('Going back to Home', () => onNavigate?.('home'));
      return true;
    }

    return false;
  }, [onNavigate, onLanguageChange, speakWithResume, currentLanguage]);

  // Resumes listening reliably
  const resumeListening = () => {
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
    }, 400);
  };

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
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      console.warn('Mic permission check:', e);
    }

    const recog = new SpeechRec();
    recog.continuous = true;
    recog.interimResults = false; // Capture clear complete sentences
    recog.maxAlternatives = 3;
    recog.lang = currentLanguage?.startsWith('hi') ? 'hi-IN' : 'en-IN';

    recog.onstart = () => {
      isStartingRef.current = false;
      setIsMicReady(true);
      setIsListeningForCommand(true);
      console.log('[Samarth AI] Live listening for commands active.');
    };

    recog.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      if (!result.isFinal) return;

      const heard = result[0].transcript.toLowerCase().trim();
      if (!heard || heard === lastProcessedRef.current) return;
      lastProcessedRef.current = heard;
      setHeardText(heard);

      // Strip wake phrases if user said "Samarth scan surroundings" or "I need help read text"
      const cleanText = heard
        .replace(/samarth i need help|i need help|samarth help|hey samarth|samarth/gi, '')
        .trim();

      const phraseToTest = cleanText.length > 0 ? cleanText : heard;

      // Check if command is recognized
      const recognized = parseAndExecute(phraseToTest);

      if (!recognized) {
        // If user spoke but command was unclear/unrecognized
        const retryPhrase = currentLanguage?.startsWith('hi') 
          ? 'माफ़ कीजिए, दोबारा बोलिए' 
          : 'Sorry, repeat again';
        speakWithResume(retryPhrase);
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
      if (!isManuallyStoppedRef.current) {
        resumeListening();
      }
    };

    try {
      isStartingRef.current = true;
      recog.start();
      recognitionRef.current = recog;
      setIsMicReady(true);
    } catch (_) {
      isStartingRef.current = false;
    }
  }, [currentLanguage, parseAndExecute, speakWithResume]);

  useEffect(() => {
    return () => {
      isManuallyStoppedRef.current = true;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
    };
  }, []);

  return { isMicReady, isListeningForCommand, startListening, heardText };
}