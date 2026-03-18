// routes/chat.js — Jack AI chat route, proxies to Google Gemini
const express = require('express');
const https = require('https');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

function httpsPost(url, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const SYSTEM_PROMPT = `You are Jack, a friendly AI financial assistant in NexusFinance expense tracker.
Help users with spending, savings, budgeting, and navigating the app (Dashboard, Transactions, Categories, Reports, Profile).
IMPORTANT: Always respond in the same language the user writes in.
You are fluent in English, Hindi (हिन्दी), Kannada (ಕನ್ನಡ), Telugu (తెలుగు), Spanish, French, German, Chinese, Arabic, Portuguese, Japanese, Korean.
If the user writes in Kannada respond in Kannada. If Hindi respond in Hindi. If Telugu respond in Telugu. Match their language naturally.
Keep responses concise and friendly. Use **bold** for emphasis.`;

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ message: 'Message is required.' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(503).json({ message: 'Jack AI not configured. Add GEMINI_API_KEY to server/.env — free key at https://aistudio.google.com/app/apikey' });
    }

    const contents = [];
    for (const msg of history) {
      contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    };

    const result = await httpsPost(url, payload);

    if (result.status !== 200) {
      console.error('Gemini error:', result.status, result.body.slice(0, 300));
      const errData = JSON.parse(result.body);
      if (result.status === 429) {
        return res.status(429).json({ message: 'Jack is a bit busy right now. Please try again in a moment.' });
      }
      return res.status(502).json({ message: 'AI service error. Please try again.' });
    }

    const data = JSON.parse(result.body);
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I could not generate a response.";
    res.json({ reply });
  } catch (err) { next(err); }
});

module.exports = router;
