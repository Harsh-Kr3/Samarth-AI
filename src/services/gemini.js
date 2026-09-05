// Vision and Text Models
const VISION_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

const TEXT_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

const DEFAULT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

/**
 * Generic Gemini API Caller
 */
export async function callGeminiAPI(endpoint, body, apiKey) {
  const key = (apiKey || DEFAULT_API_KEY || '').trim();
  const url = endpoint.includes('?') ? `${endpoint}&key=${key}` : `${endpoint}?key=${key}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}):${errorText}`);
  }

  return response.json();
}

/**
 * Analyze surroundings (Vision)
 * Returns structured description + objects with position and distance
 */
export async function AnalyzeSurroundings(base64Image, language = 'en', customKey = '') {
  const apiKey = (customKey || DEFAULT_API_KEY || '').trim();
  if (!apiKey) throw new Error('API key is missing.');

  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '').trim();
  const isHindi = language?.startsWith('hi');

  const prompt = isHindi
    ? `आप दृष्टिबाधित उपयोगकर्ताओं के लिए सहायक एआई हैं। इस दृश्य का संपूर्ण स्थानिक (spatial) विश्लेषण करें।
उत्तर केवल और केवल एक वैध JSON ऑब्जेक्ट के रूप में दें, बिना किसी अतिरिक्त टेक्स्ट या मार्कडाउन के:
{
  "description": "कमरे, व्यक्ति और समग्र वातावरण का स्पष्ट विवरण",
  "objects": [
    {
      "name": "वस्तु या व्यक्ति का नाम",
      "position": "LEFT",
      "distance": "0.6m",
      "details": "संक्षिप्त स्थिति या रंग"
    }
  ]
}
नियम:
1. 'position' केवल "LEFT", "CENTER", या "RIGHT" होनी चाहिए।
2. 'distance' में कैमरे से अनुमानित दूरी (उदा. 0.5m, 1.2m, 2m, 3m) अवश्य दें।
3. सभी दिखने वाली मुख्य वस्तुओं, लोगों और बाधाओं की पहचान करें।`
    : `You are an accessibility AI assistant for visually impaired users. Provide a thorough spatial analysis of this scene.
You MUST respond ONLY with a valid JSON object, with no conversational text or fences:
{
  "description": "Clear overall description of the room, person, and environment.",
  "objects": [
    {
      "name": "Name of object, person, or obstacle",
      "position": "LEFT",
      "distance": "0.6m",
      "details": "Color, state, or posture"
    }
  ]
}
Rules:
1. 'position' MUST be one of: "LEFT", "CENTER", "RIGHT".
2. 'distance' MUST be an estimated measurement with units (e.g. 0.5m, 1.2m, 2m, 3m).
3. Identify ALL visible items (e.g. person, phone, chair, window, wall, shelves, clothes, computer).`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: cleanBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json'
    }
  };

  let lastError = null;
  for (const model of VISION_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const data = await callGeminiAPI(endpoint, payload, apiKey);
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      let jsonString = rawText.trim();
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      try {
        const parsed = JSON.parse(jsonString);
        return {
          description: parsed.description || 'Scene analyzed successfully.',
          objects: Array.isArray(parsed.objects) ? parsed.objects : []
        };
      } catch (_) {
        const descMatch = rawText.match(/"description"\s*:\s*"([^"]+)"/);
        return {
          description: descMatch ? descMatch[1] : rawText.replace(/```json|```/g, '').trim(),
          objects: []
        };
      }
    } catch (err) {
      lastError = err;
      console.warn(`Vision model ${model} attempt failed:`, err);
    }
  }

  throw lastError || new Error('All vision models failed.');
}

/**
 * Text extraction / OCR
 */
export async function extractText(base64Image, language = 'en', customKey = '') {
  const apiKey = (customKey || DEFAULT_API_KEY || '').trim();
  if (!apiKey) throw new Error('API key is missing.');

  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '').trim();
  const prompt = language === 'hi'
    ? 'इस छवि में दिखाई देने वाले सभी टेक्स्ट को निकालें और पढ़ें।'
    : 'Extract and read all readable text from this image clearly and completely.';

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: cleanBase64
            }
          }
        ]
      }
    ]
  };

  let lastError = null;
  for (const model of VISION_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const data = await callGeminiAPI(endpoint, payload, apiKey);
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to extract text.');
}

/**
 * Voice Assistant Conversational Query
 */
export async function askAssistant(prompt, language = 'en', customKey = '') {
  const apiKey = (customKey || DEFAULT_API_KEY || '').trim();
  if (!apiKey) throw new Error('API key is missing.');

  const systemInstruction = language === 'hi'
    ? 'आप समर्थ एआई हैं, दृष्टिबाधित लोगों के लिए एक सहायक। संक्षिप्त, स्पष्ट और सहायक उत्तर दें।'
    : 'You are Samarth AI, an accessibility assistant for visually impaired users. Keep answers brief, clear, and natural.';

  const payload = {
    contents: [{ parts: [{ text: `${systemInstruction}\n\nUser:${prompt}` }] }]
  };

  let lastError = null;
  for (const model of TEXT_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const data = await callGeminiAPI(endpoint, payload, apiKey);
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to get answer from assistant.');
}
/**
 * Demo OCR fallback response for ReadText
 */
export function getDemoOCRResponse(language = 'en') {
  if (language?.startsWith('hi')) {
    return 'यह एक डेमो टेक्स्ट है। समर-प्रोजेक्ट रिपोर्ट: समर्थ एआई दृष्टिबाधित लोगों के लिए एक सहायक प्रणाली है।';
  }
  return 'DEMO OCR RESULT: Samarth AI visual assistant for the visually impaired. All systems functioning normally.';
}
/**
 * Voice Assistant Conversational Chat (alias for askAssistant)
 */
export async function chatWithAssistant(prompt, language = 'en', customKey = '') {
  return askAssistant(prompt, language, customKey);
}

/**
 * Demo fallback response for VoiceAssistant
 */
export function getDemoChatResponse(prompt = '', language = 'en') {
  if (language?.startsWith('hi')) {
    return 'मैं समर्थ एआई हूँ। मैं आपके परिवेश को देखने, टेक्स्ट पढ़ने और आपकी सहायता करने के लिए तैयार हूँ।';
  }
  return 'I am Samarth AI, your intelligent visual assistant. I can help you scan surroundings, read text, and navigate your environment.';
}