// Text-to-Speech service for SAMARTH AI
// Uses Web Speech API SpeechSynthesis

let currentUtterance = null;

export function speak(text, options = {}) {
  if (!window.speechSynthesis) {
    console.warn('SpeechSynthesis not available');
    return;
  }
  stop();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.lang || 'en-IN';
  utterance.rate = options.rate ?? 0.95;
  utterance.pitch = options.pitch ?? 1.0;
  utterance.volume = options.volume ?? 1.0;
  if (options.onStart) utterance.onstart = options.onStart;
  if (options.onEnd) utterance.onend = options.onEnd;
  utterance.onerror = () => options.onEnd?.();
  currentUtterance = utterance;
  setTimeout(() => window.speechSynthesis.speak(utterance), 50);
}

export function stop() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function isSpeaking() {
  return window.speechSynthesis?.speaking ?? false;
}
