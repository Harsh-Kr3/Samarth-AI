import { useRef, useState, useCallback } from 'react';

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

  // Audio output
  const respond = useCallback((text) => {
    console.log('[SAMARTH AI Speaks]:', text);
    if (ttsSpeak) {
      ttsSpeak(text, currentLanguage);
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  }, [ttsSpeak, currentLanguage]);

  // Execute recognized actions
  const executeCommand = useCallback((phrase) => {
    const text = phrase.toLowerCase().trim();
    console.log('[Command Detected]:', text);

    // 1. Language switching
    if (text.includes('english')) {
      onLanguageChange('en');
      respond('Language changed to English');
      return true;
    }
    if (text.includes('hindi') || text.includes('हिंदी')) {
      onLanguageChange('hi');
      respond('भाषा बदलकर हिंदी कर दी गई है');
      return true;
    }
    if (text.includes('marathi') || text.includes('मराठी')) {
      onLanguageChange('mr');
      respond('भाषा मराठी केली आहे');
      return true;
    }
    if (text.includes('telugu') || text.includes('తెలుగు')) {
      onLanguageChange('te');
      respond('భాష తెలుగులోకి మార్చబడింది');
      return true;
    }
    if (text.includes('bengali') || text.includes('bangla') || text.includes('বাংলা')) {
      onLanguageChange('bn');
      respond('ভাষা বাংলায় পরিবর্তন করা হয়েছে');
      return true;
    }
    if (text.includes('tamil') || text.includes('தமிழ்')) {
      onLanguageChange('ta');
      respond('மொழி தமிழாக மாற்றப்பட்டது');
      return true;
    }

    // 2. Navigation Actions
    if (text.includes('scan') || text.includes('surrounding') || text.includes('camera')) {
      respond(currentLanguage === 'hi' ? 'स्कैन शुरू कर रहे हैं' : 'Opening Scan Surroundings');
      onNavigate('scan');
      return true;
    }
    if (text.includes('read') || text.includes('text') || text.includes('document') || text.includes('book')) {
      respond(currentLanguage === 'hi' ? 'टेक्स्ट रीडर खोला जा रहा है' : 'Opening Read Text');
      onNavigate('read');
      return true;
    }
    if (text.includes('voice') || text.includes('assistant') || text.includes('talk')) {
      respond('Opening Voice Assistant');
      onNavigate('voice');
      return true;
    }
    if (text.includes('language') || text.includes('setting')) {
      respond('Opening Language Settings');
      onNavigate('language');
      return true;
    }
    if (text.includes('home') || text.includes('back')) {
      respond('Going back to Home');
      onNavigate('home');
      return true;
    }

    return false;
  }, [onNavigate, onLanguageChange, respond, currentLanguage]);

  // Wake word checker
  const matchesWakeWord = (str) => {
    const s = str.toLowerCase();
    return (
      s.includes('samarth i need help') ||
      s.includes('samarth help') ||
      s.includes('samarth') ||
      s.includes('samart') ||
      s.includes('smart i need help') ||
      s.includes('summer i need help') ||
      s.includes('hey samarth')
    );
  };

  const startListening = useCallback(async () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Please test in Google Chrome or Microsoft Edge for Speech Recognition support.');
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      console.warn('Microphone permission request:', err);
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }

    const recog = new SpeechRec();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';

    recog.onstart = () => {
      setIsMicReady(true);
      console.log('[SAMARTH AI] Mic is ACTIVE & Listening...');
    };

    recog.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }

      const heard = (final || interim).toLowerCase().trim();
      if (!heard) return;

      setHeardText(heard);
      console.log('[Heard]:', heard);

      if (!isCommandModeRef.current) {
        if (matchesWakeWord(heard)) {
          const clean = heard
            .replace(/samarth i need help|smart i need help|summer i need help|samarth help|hey samarth|samarth|samart/gi, '')
            .trim();

          if (clean.length > 2 && executeCommand(clean)) {
            setWakeState('IDLE');
            return;
          }

          isCommandModeRef.current = true;
          setWakeState('LISTENING_COMMAND');
          respond('Sure, ask anything');

          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            isCommandModeRef.current = false;
            setWakeState('IDLE');
          }, 8000);
        }
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
        isCommandModeRef.current = false;
        setWakeState('IDLE');
        const handled = executeCommand(heard);
        if (!handled) {
          respond("I didn't catch that. You can say scan surroundings, read text, or change language.");
        }
      }
    };

    recog.onerror = (e) => {
      console.warn('[Speech Error]:', e.error);
      if (e.error === 'not-allowed') {
        setIsMicReady(false);
      }
    };

    recog.onend = () => {
      setTimeout(() => {
        try { recog.start(); } catch (_) {}
      }, 400);
    };

    try {
      recog.start();
      recognitionRef.current = recog;
      setIsMicReady(true);
    } catch (_) {}
  }, [currentLanguage, executeCommand, respond]);

  return { wakeState, isMicReady, startListening, heardText };
}