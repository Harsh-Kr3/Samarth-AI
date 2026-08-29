import { GoogleGenerativeAI } from '@google/generative-ai';

let _client = null;

function getClient(apiKey) {
  if (!_client || apiKey) {
    _client = new GoogleGenerativeAI(apiKey);
  }
  return _client;
}

function formatImagePart(imageBase64, mimeType = 'image/jpeg') {
  const data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  return {
    inlineData: {
      data,
      mimeType,
    },
  };
}

// 1. Surroundings Analysis
export async function analyzeSurroundings(apiKey, imageBase64, mimeType = 'image/jpeg', language = 'en') {
  const client = getClient(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-3.6-flash' });

  const prompt = `You are SAMARTH AI, an intelligent visual assistant for blind and visually impaired users.
Analyze this image and provide a scene description + structured object detection.

RULES:
1. Identify important objects: people, furniture, doors, steps, obstacles, signs, vehicles.
2. For each object direction in the image: LEFT, SLIGHTLY_LEFT, CENTER, SLIGHTLY_RIGHT, or RIGHT.
3. For distance: VERY_CLOSE (within 0.5m), NEAR (0.5-2m), MEDIUM (2-5m), FAR (5m+), or UNKNOWN.
4. The description must be 2-3 natural sentences MAXIMUM.
5. Respond ONLY with this exact JSON format:

{"description":"Natural 2-3 sentence description for a visually impaired user","objects":[{"name":"object name","direction":"center","distance":"near","distanceText":"approximately 1.5 meters","confident":true}]}

Language for description: ${language}
Respond only with valid JSON.`;

  const result = await model.generateContent([
    { text: prompt },
    formatImagePart(imageBase64, mimeType),
  ]);

  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : text;
  const parsed = JSON.parse(jsonText);

  return {
    description: parsed.description || 'Scene analyzed successfully.',
    objects: (parsed.objects || []).map(o => ({
      name: o.name || 'Object',
      direction: o.direction || 'center',
      distance: o.distance || 'near',
      distanceText: o.distanceText || '',
    })),
  };
}

// 2. Text Extraction / OCR (supports both function names)
export async function extractText(apiKey, imageBase64, mimeType = 'image/jpeg', language = 'en') {
  const client = getClient(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-3.6-flash' });

  const prompt = `You are SAMARTH AI, reading text aloud for a visually impaired user.
Transcribe all readable text from this image clearly and accurately. If no text is visible, state "No readable text found."
Language preferred: ${language}`;

  const result = await model.generateContent([
    { text: prompt },
    formatImagePart(imageBase64, mimeType),
  ]);

  return {
    text: result.response.text().trim(),
  };
}

export const readText = extractText;

// 3. Voice / Chat Assistant
export async function chatWithAssistant(apiKey, message, history = [], language = 'en') {
  const client = getClient(apiKey);
  const model = client.getGenerativeModel({
    model: 'gemini-3.6-flash',
    systemInstruction: `You are SAMARTH AI, a concise and friendly visual and voice assistant for blind and visually impaired users. Respond in ${language}. Keep responses direct, helpful, and concise.`
  });

  const chat = model.startChat({
    history: history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content || h.text || '' }]
    }))
  });

  const result = await chat.sendMessage(message);
  return result.response.text().trim();
}

// 4. Demo / Fallback Responses
export function getDemoScanResponse() {
  return {
    description: "You are holding a black wallet in your hand directly in front of the camera. The background shows an indoor room setting.",
    objects: [
      { name: "Black Wallet", direction: "center", distance: "near", distanceText: "held in hand" },
      { name: "Person", direction: "center", distance: "near", distanceText: "in frame" }
    ]
  };
}

export function getDemoOCRResponse() {
  return {
    text: "Sample detected text: Welcome to SAMARTH AI accessibility suite."
  };
}

export function getDemoChatResponse(query = '') {
  return `I am here to help you navigate and identify your surroundings. You asked: "${query}".`;
}