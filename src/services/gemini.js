const DEFAULT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

function sanitizeBase64(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '').trim();
}

// Active models
const VISION_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.5-pro'
];

async function callGeminiVision(payload, apiKey) {
  for (const model of VISION_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 503 || res.status === 429) {
        console.warn(`Model ${model} busy (${res.status}), trying next candidate...`);
        continue;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn(`Model ${model} error (${res.status}):`, errData?.error?.message);
        continue;
      }

      const data = await res.json();
      return data;
    } catch (err) {
      console.warn(`Network error requesting ${model}:`, err.message);
    }
  }
  throw new Error('All model endpoints failed.');
}

// 1. Scan Surroundings
export async function analyzeSurroundings(arg1, arg2, arg3) {
  let imageBase64 = '';
  let language = 'en';
  let apiKey = DEFAULT_API_KEY;

  const args = [arg1, arg2, arg3];
  for (const a of args) {
    if (typeof a === 'string') {
      if (a.startsWith('data:image') || a.length > 300) {
        imageBase64 = a;
      } else if (a === 'en' || a === 'hi') {
        language = a;
      } else if (a.startsWith('AQ.') || a.startsWith('AIza')) {
        apiKey = a;
      }
    }
  }

  const rawBase64 = sanitizeBase64(imageBase64);
  if (!rawBase64) {
    return getDemoScanResponse(language);
  }

  const promptText = `You are SAMARTH AI, an assistive visual interpreter for visually impaired users.
Analyze what is shown in front of the camera in detail and describe it clearly.
Provide a strictly valid JSON response with this exact structure:
{
  "description": "A concise 2-sentence description of the scene in ${language === 'hi' ? 'Hindi' : 'English'}.",
  "objects": [
    {
      "name": "Exact name of detected object",
      "direction": "CENTER",
      "position": "CENTER",
      "distance": "held in hand"
    }
  ]
}
Note: "direction" must be one of: "CENTER", "LEFT", "RIGHT", "SLIGHTLY_LEFT", "SLIGHTLY_RIGHT". Return JSON only without markdown code blocks.`;

  const payload = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: rawBase64,
            },
          },
        ],
      },
    ],
  };

  try {
    const data = await callGeminiVision(payload, apiKey);
    const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = rawOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.objects && Array.isArray(parsed.objects)) {
      parsed.objects = parsed.objects.map((obj) => ({
        ...obj,
        direction: obj.direction || obj.position || 'CENTER',
        position: obj.position || obj.direction || 'CENTER',
        distance: obj.distance || 'held in hand',
      }));
    }

    return parsed;
  } catch (err) {
    console.warn('Gemini live analysis fallback:', err);
    return getDemoScanResponse(language);
  }
}

// 2. Read Text (OCR)
export async function extractText(arg1, arg2, arg3) {
  let imageBase64 = '';
  let language = 'en';
  let apiKey = DEFAULT_API_KEY;

  const args = [arg1, arg2, arg3];
  for (const a of args) {
    if (typeof a === 'string') {
      if (a.startsWith('data:image') || a.length > 300) {
        imageBase64 = a;
      } else if (a === 'en' || a === 'hi') {
        language = a;
      } else if (a.startsWith('AQ.') || a.startsWith('AIza')) {
        apiKey = a;
      }
    }
  }

  const rawBase64 = sanitizeBase64(imageBase64);
  if (!rawBase64) return getDemoOCRResponse(language);

  const payload = {
    contents: [
      {
        parts: [
          { text: `Extract all legible text from this image clearly in ${language === 'hi' ? 'Hindi' : 'English'}. Return only the extracted text.` },
          { inline_data: { mime_type: 'image/jpeg', data: rawBase64 } },
        ],
      },
    ],
  };

  try {
    const data = await callGeminiVision(payload, apiKey);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No text detected.';
  } catch (err) {
    console.error('OCR Error:', err);
    return getDemoOCRResponse(language);
  }
}

// 3. Voice Assistant
export async function chatWithAssistant(prompt, language = 'en', userApiKey = null) {
  const apiKey = userApiKey || DEFAULT_API_KEY;
  if (!apiKey) return getDemoChatResponse(prompt, language);

  const payload = {
    contents: [
      {
        parts: [{ text: `You are SAMARTH AI assistant. Answer concisely and supportively in ${language === 'hi' ? 'Hindi' : 'English'}: ${prompt}` }],
      },
    ],
  };

  try {
    const data = await callGeminiVision(payload, apiKey);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not process that request.';
  } catch (err) {
    console.error('Assistant Error:', err);
    return getDemoChatResponse(prompt, language);
  }
}

// --- Aliases ---
export const readText = extractText;
export const analyzeScene = analyzeSurroundings;
export const askAssistant = chatWithAssistant;
export const askVoiceAssistant = chatWithAssistant;

// --- Fallbacks ---
export function getDemoScanResponse(language = 'en') {
  return language === 'hi'
    ? {
        description: 'कैमरे के सामने एक वस्तु दिखाई दे रही है।',
        objects: [{ name: 'वस्तु', direction: 'CENTER', position: 'CENTER', distance: 'हाथ में' }],
      }
    : {
        description: 'You are holding an object in front of the camera.',
        objects: [{ name: 'Object', direction: 'CENTER', position: 'CENTER', distance: 'held in hand' }],
      };
}

export function getDemoOCRResponse(language = 'en') {
  return language === 'hi'
    ? 'सामर्थ एआई: दृष्टिबाधित लोगों के लिए सहायता प्रणाली।'
    : 'SAMARTH AI: Empowering vision through intelligent assistive technology.';
}
export const getDemoOcrResponse = getDemoOCRResponse;
export const getDemoReadTextResponse = getDemoOCRResponse;

export function getDemoChatResponse(query = '', language = 'en') {
  return language === 'hi'
    ? 'नमस्ते, मैं सामर्थ एआई हूँ। मैं आपकी क्या सहायता कर सकता हूँ?'
    : 'Hello, I am SAMARTH AI. How can I assist you today?';
}
export const getDemoVoiceResponse = getDemoChatResponse;
export const getDemoAssistantResponse = getDemoChatResponse;