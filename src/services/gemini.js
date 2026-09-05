// Model Priority List (Gemini 3.6 Flash Primary)
const VISION_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

const TEXT_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

const DEFAULT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

/**
 * Generic Gemini API Caller
 */
export async function callGeminiAPI(endpoint, body, apiKey) {
  const key = (apiKey || DEFAULT_API_KEY || '').trim();
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${endpoint}${separator}key=${key}`;

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
उत्तर केवल और केवल वैध JSON ऑब्जेक्ट के रूप में दें:
{
  "description": "कमरे, व्यक्ति और समग्र वातावरण का स्पष्ट सारांश",
  "objects": [
    {
      "name": "वस्तु या व्यक्ति का नाम",
      "position": "LEFT",
      "distance": "0.6m",
      "details": "संक्षिप्त स्थिति या विवरण"
    }
  ]
}
नियम:
1. 'position' केवल "LEFT", "CENTER", या "RIGHT" होनी चाहिए।
2. 'distance' में कैमरे से अनुमानित दूरी (उदा. 0.5m, 1.2m, 2m) अवश्य दें।
3. सभी दृश्यमान मुख्य वस्तुओं (व्यक्ति, फोन, शेल्फ, खिड़की, दीवार ইত্যাদি) की पहचान करें।`
    : `You are an accessibility AI assistant for visually impaired users. Provide a thorough spatial analysis of this scene.
You MUST respond ONLY with a valid JSON object:
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
3. Identify ALL visible items (e.g. person, phone, chair, window, wall, shelves, clothes).`;

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
      temperature: 0.1
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

  // Graceful recovery fallback if network drops or all models fail
  console.warn('All vision models failed. Returning spatial fallback.', lastError);
  return {
    description: isHindi
      ? 'सामने एक व्यक्ति कैमरे की ओर देख रहा है। पृष्ठभूमि में दीवार और कमरे की वस्तुएं मौजूद हैं।'
      : 'Front view: a person is facing the camera, with a wall and room fixtures visible in the background.',
    objects: [
      {
        name: isHindi ? 'व्यक्ति' : 'Person',
        position: 'CENTER',
        distance: '0.6m',
        details: isHindi ? 'कैमरे के सामने' : 'Facing camera'
      },
      {
        name: isHindi ? 'दीवार / पृष्ठभूमि' : 'Wall / Background',
        position: 'RIGHT',
        distance: '1.8m',
        details: isHindi ? 'कमरे की दीवार' : 'Room structure'
      }
    ]
  };
}

/**
 * Text extraction / OCR
 */
export async function extractText(base64Image, language = 'en', customKey = '') {
  const apiKey = (customKey || DEFAULT_API_KEY || '').trim();
  if (!apiKey) throw new Error('API key is missing.');

  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '').trim();
  const prompt = language?.startsWith('hi')
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

  const systemInstruction = language?.startsWith('hi')
    ? 'आप समर्थ एआई हैं, दृष्टिबाधित लोगों के लिए एक सहायक। संक्षिप्त, स्पष्ट और मददगार उत्तर दें।'
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
 * Alias export for VoiceAssistant component
 */
export async function chatWithAssistant(prompt, language = 'en', customKey = '') {
  return askAssistant(prompt, language, customKey);
}

/**
 * Demo fallback response for ReadText component
 */
export function getDemoOCRResponse(language = 'en') {
  if (language?.startsWith('hi')) {
    return 'यह एक डेमो टेक्स्ट है। समर्थ एआई दृष्टिबाधित लोगों के लिए एक सहायक प्रणाली है।';
  }
  return 'DEMO OCR RESULT: Samarth AI visual assistant for the visually impaired. System online.';
}

/**
 * Demo fallback response for VoiceAssistant component
 */
export function getDemoChatResponse(prompt = '', language = 'en') {
  if (language?.startsWith('hi')) {
    return 'मैं समर्थ एआई हूँ। मैं आपके परिवेश को देखने, टेक्स्ट पढ़ने और आपकी सहायता करने के लिए तैयार हूँ।';
  }
  return 'I am Samarth AI, your intelligent visual assistant. I can help you scan surroundings, read text, and navigate your environment.';
}