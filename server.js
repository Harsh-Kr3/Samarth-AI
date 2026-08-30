import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8787;
const API_KEY = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY;

app.use(express.json({ limit: '15mb' }));
app.use(express.static(__dirname));

app.post('/api/claude', async (req, res) => {
  if (!API_KEY) {
    console.error('GEMINI_API_KEY is not set in .env.');
    return res.status(500).json({ error: { message: 'Server is missing GEMINI_API_KEY in .env.' } });
  }

  const { system, messages, max_tokens } = req.body || {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: { message: 'Request body must include a "messages" array.' } });
  }

  try {
    const contents = messages.map(msg => {
      const parts = [];
      if (typeof msg.content === 'string') {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const item of msg.content) {
          if (item.type === 'text') {
            parts.push({ text: item.text });
          } else if (item.type === 'image' && item.source) {
            parts.push({
              inlineData: {
                mimeType: item.source.media_type || 'image/jpeg',
                data: item.source.data
              }
            });
          }
        }
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: parts
      };
    });

    const requestBody = {
      contents: contents,
      generationConfig: {
        maxOutputTokens: max_tokens || 1000
      }
    };

    if (system) {
      requestBody.systemInstruction = {
        parts: [{ text: system }]
      };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('Gemini API error:', upstream.status, data);
      return res.status(upstream.status).json({
        error: { message: data.error?.message || 'Gemini API Error' }
      });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.json({
      content: [
        {
          type: 'text',
          text: replyText
        }
      ]
    });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: { message: err.message || 'Internal Server Error' } });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});