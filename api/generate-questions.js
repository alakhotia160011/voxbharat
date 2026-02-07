// Vercel Serverless Function - Claude-powered Survey Question Generator
// Takes survey config and generates tailored questions dynamically

import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Anthropic API key not configured' });
  }

  try {
    const { config } = req.body;
    if (!config || !config.type || !config.purpose) {
      return res.status(400).json({ error: 'Missing required fields: config.type, config.purpose' });
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const primaryLanguage = config.languages?.[0] || 'hi';
    const languageMap = {
      hi: 'Hindi', bn: 'Bengali', te: 'Telugu', mr: 'Marathi',
      ta: 'Tamil', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam',
      pa: 'Punjabi', or: 'Odia', as: 'Assamese', ur: 'Urdu',
    };
    const langName = languageMap[primaryLanguage] || 'Hindi';

    const prompt = `You are a professional survey researcher designing voice survey questions for India.

SURVEY CONFIGURATION:
- Type: ${config.type}
- Name: ${config.name || 'Untitled Survey'}
- Primary Language: ${langName} (${primaryLanguage})
- Purpose: ${config.purpose}
- Key Questions to Answer: ${config.keyQuestions || 'Not specified'}
- Target Audience: ${config.targetAudience || 'General population'}
- Geography: ${config.geography || 'National'}${config.states?.length ? ` (${config.states.join(', ')})` : ''}
- Tone: ${config.tone || 'conversational'}
- Sensitivity Level: ${config.sensitivity || 'low'}
- Target Duration: ${config.duration || 10} minutes
- Analysis Goals: ${config.analysisGoals || 'Not specified'}
- Brand Names (if market research): ${config.brandNames || 'None'}

INSTRUCTIONS:
1. Generate 5-8 survey questions tailored to this specific survey's purpose, audience, and goals.
2. Each question MUST be written in ${langName} script as the primary text, with an English translation.
3. Questions should feel natural for a voice conversation — conversational, not formal or bureaucratic.
4. Include a mix of question types: single choice, multiple choice, likert scale, rating, open-ended, yes/no as appropriate.
5. Order questions from easy/comfortable to more sensitive/complex (funnel approach).
6. If sensitivity is "high", include trust-building phrasing and indirect question techniques.
7. If tone is "formal", use respectful/formal language (e.g., "aap" forms). If "friendly", use warmer language.
8. Make questions specific to the stated purpose — do NOT use generic placeholder questions.
9. Do NOT include demographic questions (age, gender) — those are added automatically.

RESPOND WITH ONLY a JSON array, no other text. Each object must have:
{
  "id": <number starting from 1>,
  "type": "<single|multiple|likert|rating|nps|open|yes_no>",
  "text": "<question in ${langName} script>",
  "textEn": "<English translation>",
  "options": ["<option1>", "<option2>", ...] (only for single/multiple/likert types, omit for open/rating/nps/yes_no),
  "required": true,
  "category": "<short category label in English>"
}

For likert type, always use exactly 5 options from negative to positive.
For rating type, include "min": 1, "max": 10.
For nps type, include "min": 0, "max": 10.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text;

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in Claude response');
    }

    const questions = JSON.parse(jsonMatch[0]);

    res.status(200).json({ questions });
  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ error: 'Failed to generate questions', message: error.message });
  }
}
