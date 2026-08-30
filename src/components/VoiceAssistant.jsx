import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Mic, MicOff, Send, RotateCcw, Volume2 } from 'lucide-react';
import { chatWithAssistant, getDemoChatResponse } from '../services/gemini';
import { SUPPORTED_LANGUAGES } from '../utils/constants';

const QUICK_COMMANDS = {
  'en-IN': [
    'Scan my surroundings',
    'Read the text',
    'What do you see?',
    'Describe this room',
    'Help me navigate',
    'Change language',
  ],
  'hi-IN': [
    'आसपास स्कैन करें',
    'यह पाठ पढ़ें',
    'क्या है सामने?',
    'इस कमरे का वर्णन करें',
    'भाषा बदलें',
    'मदद करें',
  ],
};

function WaveformBars({ active }) {
  return (
    <div className={`waveform ${active ? 'active' : ''}`} aria-hidden="true">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{
            height: active ? undefined : `${8 + (i % 3) * 4}px`,
            opacity: active ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );
}

export default function VoiceAssistant({ onBack, appState, ttsSpeak, onNavigate }) {
  const { language, apiKey, demoMode } = appState;
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: language === 'hi-IN'
        ? 'नमस्ते! मैं SAMARTH AI हूँ। आप मुझसे बात कर सकते हैं या नीचे टाइप कर सकते हैं।'
        : 'Hello! I am SAMARTH AI. You can speak to me or type below. How can I help you?',
      timestamp: new Date(),
    },
  ]);
  const recognitionRef = useRef(null);
  const conversationRef = useRef(null);

  const langLabels = SUPPORTED_LANGUAGES.find(l => l.code === language);

  // Auto-scroll to bottom
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = useCallback((role, content) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  }, []);

  const sendMessage = useCallback(async (userText) => {
    if (!userText.trim()) return;
    setTextInput('');
    addMessage('user', userText);
    setIsSending(true);

    // Check for navigation commands
    const lower = userText.toLowerCase();
    if (lower.includes('scan surround') || lower.includes('scan my') || lower.includes('स्कैन') || lower.includes('आसपास')) {
      const resp = language === 'hi-IN'
        ? 'ज़रूर! मैं अभी सराउंडिंग्स स्कैन मोड खोल रहा हूँ।'
        : 'Sure! Opening the surroundings scanner now.';
      addMessage('assistant', resp);
      ttsSpeak(resp);
      setIsSending(false);
      setTimeout(() => onNavigate('scan'), 1200);
      return;
    }
    if ((lower.includes('read') && (lower.includes('text') || lower.includes('sign'))) || lower.includes('पढ़')) {
      const resp = language === 'hi-IN'
        ? 'ज़रूर! मैं टेक्स्ट रीडर खोल रहा हूँ।'
        : 'Opening the text reader now!';
      addMessage('assistant', resp);
      ttsSpeak(resp);
      setIsSending(false);
      setTimeout(() => onNavigate('read'), 1200);
      return;
    }

    try {
      let response;
      if (demoMode || !apiKey) {
        await new Promise(r => setTimeout(r, 1200));
        response = getDemoChatResponse(userText, language);
      } else {
        response = await chatWithAssistant(
          apiKey,
          userText,
          language,
          messages.map(m => ({ role: m.role, content: m.content }))
        );
      }
      addMessage('assistant', response);
      ttsSpeak(response);
    } catch (err) {
      const fallback = 'Sorry, I encountered an error. Please try again.';
      addMessage('assistant', fallback);
      ttsSpeak(fallback);
    } finally {
      setIsSending(false);
    }
  }, [addMessage, apiKey, demoMode, language, messages, onNavigate, ttsSpeak]);

  const toggleListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!SR) {
      // Demo: simulate recognition
      setIsListening(true);
      ttsSpeak('Listening...');
      setTimeout(() => {
        const demo = language === 'hi-IN'
          ? 'आसपास क्या है मुझे बताओ'
          : 'What is around me?';
        setIsListening(false);
        sendMessage(demo);
      }, 2500);
      return;
    }

    const recognition = new SR();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setIsListening(false);
      sendMessage(text);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    ttsSpeak('Listening. Speak now.');
  }, [isListening, language, sendMessage, ttsSpeak]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(textInput);
    }
  };

  const commands = QUICK_COMMANDS[language] || QUICK_COMMANDS['en-IN'];

  return (
    <div className="screen">
      {/* Header */}
      <div className="screen-header">
        <button className="back-btn" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="screen-title">🎙️ Voice Assistant</div>
          <div className="screen-subtitle">
            Talk in {langLabels?.nativeName || language} — SAMARTH AI responds in your language
          </div>
        </div>
      </div>

      

      <div className="voice-screen">
        {/* Mic orb + waveform */}
        <div className="waveform-container">
          <WaveformBars active={isListening || isSending} />

          <button
            className={`mic-orb-large ${isListening ? 'listening' : 'idle'}`}
            onClick={toggleListening}
            aria-label={isListening ? 'Stop listening' : 'Start listening — speak your command'}
            aria-pressed={isListening}
          >
            {isListening ? <MicOff size={36} aria-hidden="true" /> : <Mic size={36} aria-hidden="true" />}
          </button>

          <p style={{
            fontSize: 'var(--text-sm)',
            color: isListening ? 'var(--color-danger)' : 'var(--color-text-3)',
            fontWeight: isListening ? 700 : 400,
            transition: 'color 0.3s',
          }} aria-live="polite">
            {isListening ? '🔴 Listening...' : isSending ? '⏳ Thinking...' : 'Tap to speak'}
          </p>

          {/* Quick commands */}
          <div className="quick-commands" role="list" aria-label="Quick voice commands">
            {commands.slice(0, 4).map(cmd => (
              <button
                key={cmd}
                className="command-chip"
                role="listitem"
                onClick={() => sendMessage(cmd)}
                aria-label={`Say: ${cmd}`}
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <div
          className="conversation-area"
          ref={conversationRef}
          role="log"
          aria-live="polite"
          aria-label="Conversation history"
          aria-relevant="additions"
        >
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className={`message-bubble ${msg.role}`}>
                {msg.content}
              </div>
              <div
                className="message-meta"
                style={{ textAlign: msg.role === 'user' ? 'right' : 'left', paddingInline: 4 }}
              >
                {msg.role === 'user' ? '🙂 You' : '🤖 SAMARTH'}
                {' · '}
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => ttsSpeak(msg.content)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', marginLeft: 6, padding: 2 }}
                    aria-label="Read this message aloud"
                  >
                    <Volume2 size={12} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="message-bubble ai" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="spinner spinner-sm" aria-hidden="true" />
              <span style={{ color: 'var(--color-text-3)', fontStyle: 'italic' }}>Thinking...</span>
            </div>
          )}
        </div>

        {/* Text input */}
        <div
          style={{
            width: '100%',
            maxWidth: 640,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
          }}
        >
          <textarea
            className="textarea"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={language === 'hi-IN' ? 'यहाँ टाइप करें...' : 'Type a message or use the mic...'}
            rows={2}
            aria-label="Type message to SAMARTH AI"
            style={{ flex: 1, resize: 'none' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="btn btn-primary btn-icon-only"
              onClick={() => sendMessage(textInput)}
              disabled={!textInput.trim() || isSending}
              aria-label="Send message"
            >
              {isSending ? <div className="spinner spinner-sm" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
            </button>
            <button
              className="btn btn-ghost btn-icon-only"
              onClick={() => setMessages([messages[0]])}
              aria-label="Clear conversation"
              title="Clear"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
