// Vercel Serverless Function - Claude-powered Survey Question Generator
// Uses tool_use for guaranteed valid JSON output (no parsing errors)

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

    const autoDetect = config.autoDetectLanguage || false;
    const primaryLanguage = autoDetect ? 'en' : (config.languages?.[0] || 'hi');
    const languageMap = {
      hi: 'Hindi', bn: 'Bengali', te: 'Telugu', mr: 'Marathi',
      ta: 'Tamil', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam',
      pa: 'Punjabi', en: 'English',
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
10. For likert type, always use exactly 5 options from negative to positive.
11. For rating type, set min=1, max=10. For nps type, set min=0, max=10.

Call the generate_survey_questions tool with all the questions.`;

    const questionTool = {
      name: 'generate_survey_questions',
      description: 'Output the generated survey questions as structured data',
      input_schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number', description: 'Question number starting from 1' },
                type: { type: 'string', enum: ['single', 'multiple', 'likert', 'rating', 'nps', 'open', 'yes_no'] },
                text: { type: 'string', description: `Question text in ${langName} script` },
                textEn: { type: 'string', description: 'English translation of the question' },
                options: { type: 'array', items: { type: 'string' }, description: 'Answer options (for single/multiple/likert types only)' },
                required: { type: 'boolean' },
                category: { type: 'string', description: 'Short category label in English' },
                min: { type: 'number', description: 'Min value (for rating/nps types)' },
                max: { type: 'number', description: 'Max value (for rating/nps types)' },
              },
              required: ['id', 'type', 'text', 'textEn', 'required', 'category'],
            },
          },
        },
        required: ['questions'],
      },
    };

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      tools: [questionTool],
      tool_choice: { type: 'tool', name: 'generate_survey_questions' },
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract questions from tool_use block (guaranteed valid JSON)
    const toolBlock = response.content.find(b => b.type === 'tool_use');
    if (!toolBlock) {
      throw new Error('Claude did not return tool output');
    }

    const questions = toolBlock.input.questions;
    res.status(200).json({ questions });
  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ error: 'Failed to generate questions', message: error.message });
  }
}
