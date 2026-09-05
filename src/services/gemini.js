const DEFAULT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export const MODELS = {
  VISION: 'gemini-3.6-flash',
  VISION_FALLBACK: 'gemini-3.5-flash',
  TEXT: 'gemini-3.6-flash',
};

const VISION_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite'
];

/**
 * Universal Gemini API caller
 */
export async function callGeminiAPI(endpoint, body, apiKey) {
  const key = (apiKey || DEFAULT_API_KEY || '').trim();
  const url = endpoint.includes('?') ? `${endpoint}&key=${key}` : `${endpoint}?key=${key}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Analyze surroundings (Vision)
 */
export async function AnalyzeSurroundings(base64Image, language = 'en', customKey = '') {
  const apiKey = (customKey || DEFAULT_API_KEY || '').trim();
  if (!apiKey) throw new Error('API key is missing.');

  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '').trim();

  const prompt = language === 'hi'
    ? 'इस दृश्य का विश्लेषण करें। मुख्य वस्तुओं की पहचान करें, उनकी दिशा (LEFT, CENTER, RIGHT) और कैमरे से अनुमानित दूरी (जैसे "0.5m", "1.2m", "2m") बताएं। केवल शुद्ध JSON उत्तर दें: {"description": "...", "objects": [{"name": "...", "position": "CENTER", "distance": "0.8m"}]}'
    : 'Analyze this scene for a visually impaired user. Identify key visible objects, their spatial direction (LEFT, CENTER, RIGHT), and their estimated distance from the camera (e.g. "0.5m", "1.2m", "2m"). Respond ONLY in valid JSON: {"description": "...", "objects": [{"name": "...", "position": "CENTER", "distance": "0.8m"}]}';

  let lastError = null;

  for (const model of VISION_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      });

      if (!response.ok) {
        lastError = new Error(await response.text());
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) return JSON.parse(rawText);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All vision models failed.');
}

/**
 * Text extraction / OCR
 */
export async function extractText(base64Image, language = 'en', customKey = '') {
  const apiKey = (customKey || DEFAULT_API_KEY || '').trim();
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '').trim();

  const prompt = language === 'hi'
    ? 'इस छवि में मौजूद सभी पाठ को स्पष्ट रूप से निकालें और पढ़ें।'
    : 'Extract and transcribe all readable text from this image accurately.';

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
        ],
      },
    ],
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`;
  const data = await callGeminiAPI(endpoint, body, apiKey);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No readable text detected.';
}

export const readTextFromImage = extractText;

/**
 * Voice conversational assistant
 */
export async function chatWithAssistant(userMessage, history = [], customKey = '') {
  const apiKey = (customKey || DEFAULT_API_KEY || '').trim();
  const contents = [
    ...history.map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`;
  const data = await callGeminiAPI(endpoint, { contents }, apiKey);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Demo / Fallback helpers
 */
export function getDemoScanResponse(language = 'en') {
  return {
    description: language === 'hi'
      ? 'सामने एक व्यक्ति और कमरा दिखाई दे रहा है।'
      : 'A person is visible in front of the camera.',
    objects: [{ name: 'Person', position: 'center', distance: '0.8m' }],
  };
}

export function getDemoOCRResponse(language = 'en') {
  return language === 'hi'
    ? 'यह एक डेमो पाठ है। वास्तविक पहचान के लिए एपीआई सक्रिय है।'
    : 'This is sample extracted text. Real OCR is connected.';
}

export function getDemoChatResponse(message = '', language = 'en') {
  return language === 'hi'
    ? `नमस्ते! मैं समर्थ एआई सहायक हूँ। आपने कहा: "${message}"`
    : `Hello! I am Samarth AI assistant. You said: "${message}"`;
}