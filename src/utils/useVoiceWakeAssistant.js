import { useEffect, useRef, useState, useCallback } from 'react';

export function useVoiceWakeAssistant({ 
  currentScreen, 
  onNavigate, 
  currentLanguage, 
  onLanguageChange, 
  ttsSpeak 
}) {
  const [wakeState, setWakeState] = useState('IDLE'); // 'IDLE' | 'LISTENING_COMMAND'
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const isCommandModeRef = useRef(false);
  const commandTimeoutRef = useRef(null);

  // Helper to speak feedback
  const respond = useCallback((text) => {
    if (ttsSpeak) {
      ttsSpeak(text, currentLanguage);
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  }, [ttsSpeak, currentLanguage]);

  // Execute commands parsed from user voice
  const handleCommand = useCallback((commandText) => {
    const text = commandText.toLowerCase().trim();

    // 1. Language Changing Commands
    if (text.includes('english')) {
      onLanguageChange('en');
      respond('Language changed to English');
      return;
    }
    if (text.includes('hindi') || text.includes('हिंदी')) {
      onLanguageChange('hi');
      respond('भाषा बदलकर हिंदी कर दी गई है');
      return;
    }
    if (text.includes('marathi') || text.includes('मराठी')) {
      onLanguageChange('mr');
      respond('भाषा मराठी केली आहे');
      return;
    }
    if (text.includes('telugu') || text.includes('తెలుగు')) {
      onLanguageChange('te');
      respond('భాష తెలుగులోకి మార్చబడింది');
      return;
    }
    if (text.includes('bengali') || text.includes('bangla') || text.includes('বাংলা')) {
      onLanguageChange('bn');
      respond('ভাষা বাংলায় পরিবর্তন করা হয়েছে');
      return;
    }
    if (text.includes('tamil') || text.includes('தமிழ்')) {
      onLanguageChange('ta');
      respond('மொழி தமிழாக மாற்றப்பட்டது');
      return;
    }

    // 2. Navigation Actions
    if (text.includes('scan') || text.includes('surrounding') || text.includes('surroundings')) {
      respond(currentLanguage === 'hi' ? 'स्कैन शुरू कर रहे हैं' : 'Opening Scan Surroundings');
      onNavigate('scan');
      return;
    }

    if (text.includes('read') || text.includes('text') || text.includes('document') || text.includes('book')) {
      respond(currentLanguage === 'hi' ? 'टेक्स्ट रीडर खोला जा रहा है' : 'Opening Read Text');
      onNavigate('read');
      return;
    }

    if (text.includes('language') || text.includes('settings')) {
      respond('Opening Language Settings');
      onNavigate('language');
      return;
    }

    if (text.includes('voice') || text.includes('assistant') || text.includes('talk')) {
      respond('Opening Voice Assistant');
      onNavigate('voice');
      return;
    }

    if (text.includes('home') || text.includes('back') || text.includes('main')) {
      respond('Going back to Home');
      onNavigate('home');
      return;
    }

    // Fallback if command unrecognized
    respond("I didn't catch that. You can say scan surroundings, read text, or change language.");
  }, [onNavigate, onLanguageChange, respond, currentLanguage]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported on this browser.');
      return;
    }

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';

    recog.onresult = (event) => {
      let finalStr = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalStr += event.results[i][0].transcript;
        }
      }

      const heard = finalStr.toLowerCase().trim();
      if (!heard) return;

      setTranscript(heard);

      // Check if we are waiting for Wake Word
      if (!isCommandModeRef.current) {
        if (heard.includes('samarth i need help') || heard.includes('samarth help') || heard.includes('hey samarth') || heard.includes('samarth')) {
          // Wake Word Triggered!
          isCommandModeRef.current = true;
          setWakeState('LISTENING_COMMAND');
          
          respond('Sure, ask anything');

          // Give user 8 seconds to deliver the action command
          if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
          commandTimeoutRef.current = setTimeout(() => {
            isCommandModeRef.current = false;
            setWakeState('IDLE');
          }, 8000);
        }
      } else {
        // We are in Command Mode, execute user intent
        clearTimeout(commandTimeoutRef.current);
        isCommandModeRef.current = false;
        setWakeState('IDLE');
        handleCommand(heard);
      }
    };

    recog.onerror = (e) => {
      // Automatic restart on network or silent timeouts
      if (e.error !== 'not-allowed') {
        try { recog.start(); } catch (_) {}
      }
    };

    recog.onend = () => {
      // Keep recognition persistent across the app
      try { recog.start(); } catch (_) {}
    };

    try {
      recog.start();
    } catch (_) {}

    recognitionRef.current = recog;

    return () => {
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch (_) {}
      }
    };
  }, [currentLanguage, handleCommand, respond]);

  return { wakeState, transcript };
}