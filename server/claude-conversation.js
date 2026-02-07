// Claude conversation manager for voice surveys
import Anthropic from '@anthropic-ai/sdk';
import {
  getSystemPrompt, getExtractionPrompt, SURVEY_SCRIPTS,
  getCustomSystemPrompt, getCustomExtractionPrompt, generateCustomGreeting,
} from './survey-scripts.js';

export class ClaudeConversation {
  constructor(apiKey, options = {}) {
    this.client = new Anthropic({ apiKey });
    this.language = options.language || 'hi';
    this.gender = options.gender || 'female';
    this.customSurvey = options.customSurvey || null;
    this.messages = [];
    this.isComplete = false;
    this.systemPrompt = this.customSurvey
      ? getCustomSystemPrompt(this.language, this.gender, this.customSurvey)
      : getSystemPrompt(this.language, this.gender);
  }

  /**
   * Get the greeting message for the call
   */
  getGreeting() {
    let greeting;
    if (this.customSurvey) {
      greeting = generateCustomGreeting(this.language, this.gender, this.customSurvey.name);
    } else {
      greeting = SURVEY_SCRIPTS[this.language].greeting;
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
        max_tokens: 300,
        system: this.systemPrompt,
        messages: this.messages,
      });

      const assistantText = response.content[0].text;

      // Check for completion signal
      if (assistantText.includes('[SURVEY_COMPLETE]')) {
        this.isComplete = true;
      }

      // Store assistant response (without the completion token)
      const cleanText = assistantText.replace('[SURVEY_COMPLETE]', '').trim();
      this.messages.push({ role: 'assistant', content: cleanText });

      return cleanText;
    } catch (error) {
      console.error('[Claude] API error:', error.message);
      // Retry once
      try {
        const response = await this.client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: this.systemPrompt,
          messages: this.messages,
        });
        const assistantText = response.content[0].text;
        if (assistantText.includes('[SURVEY_COMPLETE]')) {
          this.isComplete = true;
        }
        const cleanText = assistantText.replace('[SURVEY_COMPLETE]', '').trim();
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
   * Fallback response when Claude API fails
   */
  _getFallback() {
    const askedCount = this.messages.filter(m => m.role === 'assistant').length;

    if (this.customSurvey) {
      if (askedCount < this.customSurvey.questions.length) {
        const nextQ = this.customSurvey.questions[askedCount];
        this.messages.push({ role: 'assistant', content: nextQ.text });
        return nextQ.text;
      }
      this.isComplete = true;
      const closing = this.language === 'hi'
        ? 'बहुत-बहुत धन्यवाद! आपका दिन शुभ हो!'
        : 'অনেক ধন্যবাদ! আপনার দিন শুভ হোক!';
      this.messages.push({ role: 'assistant', content: closing });
      return closing;
    }

    const script = SURVEY_SCRIPTS[this.language];
    if (askedCount < script.questions.length) {
      const nextQ = script.questions[askedCount];
      this.messages.push({ role: 'assistant', content: nextQ.text });
      return nextQ.text;
    }

    this.isComplete = true;
    this.messages.push({ role: 'assistant', content: script.closing });
    return script.closing;
  }
}
