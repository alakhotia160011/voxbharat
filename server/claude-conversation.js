// Claude conversation manager for voice surveys
import Anthropic from '@anthropic-ai/sdk';
import {
  getSystemPrompt, getExtractionPrompt, SURVEY_SCRIPTS,
  getCustomSystemPrompt, getCustomExtractionPrompt, generateCustomGreeting,
  getAutoDetectSystemPrompt, getAutoDetectCustomSystemPrompt,
  generateInboundGreeting, generateCallbackGreeting, getVoiceName,
} from './survey-scripts.js';

export class ClaudeConversation {
  constructor(apiKey, options = {}) {
    this.client = new Anthropic({ apiKey });
    this.language = options.language || 'hi';
    this.gender = options.gender || 'female';
    this.customSurvey = options.customSurvey || null;
    this.autoDetectLanguage = options.autoDetectLanguage || false;
    this.currentLanguage = this.autoDetectLanguage ? 'en' : this.language;
    this.direction = options.direction || 'outbound';
    this.inboundType = options.inboundType || null; // 'callback' | 'standalone'
    this.customGreeting = options.customGreeting || null;
    this.messages = [];
    this.isComplete = false;
    this.lastEmotion = 'content'; // default TTS emotion

    if (this.autoDetectLanguage) {
      this.systemPrompt = this.customSurvey
        ? getAutoDetectCustomSystemPrompt(this.gender, this.customSurvey)
        : getAutoDetectSystemPrompt(this.gender);
    } else {
      this.systemPrompt = this.customSurvey
        ? getCustomSystemPrompt(this.language, this.gender, this.customSurvey)
        : getSystemPrompt(this.language, this.gender);
    }

    // Prepend inbound context to system prompt
    if (this.direction === 'inbound') {
      const preamble = this.inboundType === 'callback'
        ? 'CALL CONTEXT: The respondent called you back after a missed call. Be warm and grateful they returned the call. Skip lengthy introductions — they already know who you are.'
        : 'CALL CONTEXT: The respondent called YOU. They initiated this call, so they likely want to participate. Be warm and welcoming.';
      this.systemPrompt = preamble + '\n\n' + this.systemPrompt;
    }
  }

  /**
   * Get the greeting message for the call
   */
  getGreeting() {
    let greeting;

    if (this.direction === 'inbound') {
      // Inbound call greetings
      const surveyName = this.customSurvey?.name || 'our survey';
      const lang = this.autoDetectLanguage ? 'en' : this.language;
      if (this.inboundType === 'callback') {
        greeting = generateCallbackGreeting(lang, this.gender, surveyName);
      } else {
        greeting = this.customGreeting || generateInboundGreeting(lang, this.gender, surveyName);
      }
    } else if (this.autoDetectLanguage) {
      const enName = getVoiceName('en', this.gender);
      greeting = this.customSurvey
        ? `Namaste! Hello! I'm ${enName} calling from VoxBharat. I'd like to ask you a few questions about ${this.customSurvey.name}. I can speak Hindi, English, Bengali, Tamil, Telugu, and many other Indian languages. Aapko kis bhasha mein baat karni hai? Which language would you prefer?`
        : `Namaste! Hello! I'm ${enName} calling from VoxBharat for a short survey. I can speak Hindi, English, Bengali, Tamil, Telugu, and many other Indian languages. Aapko kis bhasha mein baat karni hai? Which language would you prefer?`;
    } else if (this.customSurvey) {
      greeting = generateCustomGreeting(this.language, this.gender, this.customSurvey.name);
    } else if (SURVEY_SCRIPTS[this.language]) {
      greeting = generateCustomGreeting(this.language, this.gender, SURVEY_SCRIPTS[this.language].name);
    } else {
      greeting = generateCustomGreeting(this.language, this.gender, 'VoxBharat Survey');
    }

    // Add greeting to message history so Claude knows it was already spoken
    this.messages.push({ role: 'assistant', content: greeting });
    return greeting;
  }

  /**
   * Process user speech and get Claude's response
   * @param {string} userText - Transcribed user speech
   * @returns {Promise<string>} Claude's response text
   */
  async getResponse(userText) {
    if (this.isComplete) return null;

    this.messages.push({ role: 'user', content: userText });

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: this.systemPrompt,
        messages: this.messages,
      });

      const assistantText = response.content[0].text;

      // Check for completion signal
      if (assistantText.includes('[SURVEY_COMPLETE]')) {
        this.isComplete = true;
      }

      // Store assistant response (without the completion token or metadata tags)
      let cleanText = assistantText.replace('[SURVEY_COMPLETE]', '').trim();
      cleanText = this._parseLanguageTag(cleanText);
      cleanText = this._parseEmotionTag(cleanText);
      this.messages.push({ role: 'assistant', content: cleanText });

      return cleanText;
    } catch (error) {
      console.error('[Claude] API error:', error.message);
      // Retry once
      try {
        const response = await this.client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          system: this.systemPrompt,
          messages: this.messages,
        });
        const assistantText = response.content[0].text;
        if (assistantText.includes('[SURVEY_COMPLETE]')) {
          this.isComplete = true;
        }
        let cleanText = assistantText.replace('[SURVEY_COMPLETE]', '').trim();
        cleanText = this._parseLanguageTag(cleanText);
        cleanText = this._parseEmotionTag(cleanText);
        this.messages.push({ role: 'assistant', content: cleanText });
        return cleanText;
      } catch (retryError) {
        console.error('[Claude] Retry failed:', retryError.message);
        // Return a scripted fallback
        return this._getFallback();
      }
    }
  }

  /**
   * Start streaming Claude's response — returns a stream with .textStream async iterable
   * After iteration completes, call finalizeStreamedResponse(fullText) to update history
   * @param {string} userText - Transcribed user speech
   * @returns {MessageStream|null} Anthropic stream object, or null if survey is complete
   */
  startResponseStream(userText) {
    if (this.isComplete) return null;
    this.messages.push({ role: 'user', content: userText });

    return this.client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: this.systemPrompt,
      messages: this.messages,
    });
  }

  /**
   * Finalize a streamed response — update conversation history
   * Call this after streaming completes (or is interrupted)
   * @param {string} fullText - The accumulated response text (raw, with tags)
   * @returns {string} Clean response text
   */
  finalizeStreamedResponse(fullText) {
    if (fullText.includes('[SURVEY_COMPLETE]')) {
      this.isComplete = true;
    }
    let cleanText = fullText.replace('[SURVEY_COMPLETE]', '').trim();
    cleanText = this._parseLanguageTag(cleanText);
    cleanText = this._parseEmotionTag(cleanText);
    this.messages.push({ role: 'assistant', content: cleanText });
    return cleanText;
  }

  /**
   * Extract structured data from the conversation transcript
   * @returns {Promise<object>} Extracted survey data
   */
  async extractData() {
    const transcript = this.messages
      .map(m => `${m.role === 'user' ? 'Respondent' : 'Interviewer'}: ${m.content}`)
      .join('\n');

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: this.customSurvey
          ? getCustomExtractionPrompt(this.customSurvey)
          : getExtractionPrompt(this.language),
        messages: [{ role: 'user', content: transcript }],
      });

      const text = response.content[0].text;
      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in extraction response');
    } catch (error) {
      console.error('[Claude] Data extraction error:', error.message);
      return {
        demographics: { age: null, ageGroup: null, religion: null, language: this.language },
        structured: {},
        sentiment: { overall: 'neutral', openness: 'medium', religiosity: 'medium' },
        summary: 'Data extraction failed',
      };
    }
  }

  /**
   * Get the full transcript
   */
  getTranscript() {
    return this.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));
  }

  /**
   * Parse [EMOTION:xxx] tag from Claude's response.
   * Strips the tag and stores the detected emotion.
   * @returns {string} Text with emotion tag removed
   */
  _parseEmotionTag(text) {
    const match = text.match(/^\[EMOTION:([a-z]+)\]\s*/i);
    if (match) {
      this.lastEmotion = match[1].toLowerCase();
      return text.slice(match[0].length);
    }
    return text;
  }

  /**
   * Parse [LANG:xx] tag from Claude's response (auto-detect mode only)
   * Updates currentLanguage and strips the tag from the text
   */
  _parseLanguageTag(text) {
    if (!this.autoDetectLanguage) return text;

    const langMatch = text.match(/^\[LANG:([a-z]{2})\]\s*/i);
    if (langMatch) {
      const detectedLang = langMatch[1].toLowerCase();
      if (detectedLang !== this.currentLanguage) {
        console.log(`[Claude] Language switch: ${this.currentLanguage} → ${detectedLang}`);
        this.currentLanguage = detectedLang;
      }
      return text.slice(langMatch[0].length);
    }
    return text;
  }

  /**
   * Fallback response when Claude API fails
   */
  _getFallback() {
    const askedCount = this.messages.filter(m => m.role === 'assistant').length;

    const closings = {
      hi: 'बहुत-बहुत धन्यवाद! आपका दिन शुभ हो!',
      bn: 'অনেক ধন্যবাদ! আপনার দিন শুভ হোক!',
      te: 'చాలా ధన్యవాదాలు! మీ రోజు శుభంగా ఉండాలి!',
      mr: 'खूप खूप धन्यवाद! तुमचा दिवस शुभ असो!',
      ta: 'மிக்க நன்றி! உங்கள் நாள் நல்லதாக அமையட்டும்!',
      gu: 'ખૂબ ખૂબ ધન્યવાદ! તમારો દિવસ શુભ રહે!',
      kn: 'ತುಂಬಾ ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ದಿನ ಶುಭವಾಗಿರಲಿ!',
      ml: 'വളരെ നന്ദി! നിങ്ങളുടെ ദിവസം ശുഭമാകട്ടെ!',
      pa: 'ਬਹੁਤ-ਬਹੁਤ ਧੰਨਵਾਦ! ਤੁਹਾਡਾ ਦਿਨ ਸ਼ੁਭ ਹੋਵੇ!',
      en: 'Thank you so much! Have a wonderful day!',
    };

    if (this.customSurvey) {
      if (askedCount < this.customSurvey.questions.length) {
        const nextQ = this.customSurvey.questions[askedCount];
        this.messages.push({ role: 'assistant', content: nextQ.text });
        return nextQ.text;
      }
      this.isComplete = true;
      const closing = closings[this.language] || closings.hi;
      this.messages.push({ role: 'assistant', content: closing });
      return closing;
    }

    const script = SURVEY_SCRIPTS[this.language];
    if (script && askedCount < script.questions.length) {
      const nextQ = script.questions[askedCount];
      this.messages.push({ role: 'assistant', content: nextQ.text });
      return nextQ.text;
    }

    this.isComplete = true;
    if (script) {
      this.messages.push({ role: 'assistant', content: script.closing });
      return script.closing;
    }
    const fallbackClosing = closings[this.language] || closings.hi;
    this.messages.push({ role: 'assistant', content: fallbackClosing });
    return fallbackClosing;
  }
}
