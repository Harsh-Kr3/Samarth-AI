const DEFAULT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Priority fallback list for vision-capable models
const VISION_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite'
];

/**
 * Analyzes an image with Google Generative Language API.
 * @param {string} base64Image - Data URL or raw base64 string of the image.
 * @param {string} language - Language code ('en', 'hi', etc.).
 * @param {string} customKey - Optional API key passed from state.
 * @returns {Promise<{description: string, objects: Array<{name: string, position: string, distance: string}>}>}
 */
export async function analyzeSurroundings(base64Image, language = 'en', customKey = '') {
  const apiKey = (customKey || DEFAULT_API_KEY || '').trim();

  if (!apiKey) {
    throw new Error('API key is missing. Please set VITE_GEMINI_API_KEY in Vercel settings.');
  }

  // Strip prefix data URI headers if present
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '').trim();

  const prompt = language === 'hi'
    ? 'इस दृश्य का संक्षिप्त और सटीक विश्लेषण करें। मुख्य वस्तुओं, उनकी दिशा (LEFT, CENTER, RIGHT) और अनुमानित दूरी बताएं। केवल शुद्ध JSON उत्तर दें: {"description": "...", "objects": [{"name": "...", "position": "CENTER", "distance": "near"}]}'
    : 'Analyze this scene succinctly for visual assistance. Identify key objects, their spatial direction (LEFT, CENTER, RIGHT), and approximate distance (very-close, near, medium, far). Respond ONLY with valid JSON: {"description": "...", "objects": [{"name": "...", "position": "CENTER", "distance": "near"}]}';

  let lastError = null;

  for (const model of VISION_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.warn(`Model ${model} returned HTTP ${response.status}:`, errBody);
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (rawText) {
        return JSON.parse(rawText);
      }
    } catch (err) {
      console.warn(`Attempt with ${model} failed:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('All configured Gemini vision models failed to return a response.');
}

/**
 * Fallback response for offline or testing mode
 */
export function getDemoScanResponse(language = 'en') {
  if (language === 'hi') {
    return {
      description: 'आपके सामने एक व्यक्ति बैठा है और पृष्ठभूमि में एक कमरा दिखाई दे रहा है।',
      objects: [
        { name: 'व्यक्ति', position: 'center', distance: 'near' },
        { name: 'दीवार', position: 'center', distance: 'medium' }
      ]
    };
  }

  return {
    description: 'A person is visible seated in the center of the room.',
    objects: [
      { name: 'Person', position: 'center', distance: 'near' },
      { name: 'Wall', position: 'center', distance: 'medium' }
    ]
  };
}