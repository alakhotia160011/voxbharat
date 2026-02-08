// Survey question scripts for AI voice surveys
// Matches the existing demo conversation structure in the frontend

/**
 * Full language map for all supported languages
 */
export const LANGUAGE_MAP = {
  hi: 'Hindi', bn: 'Bengali', te: 'Telugu', mr: 'Marathi',
  ta: 'Tamil', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam',
  pa: 'Punjabi', en: 'English',
};

export const SURVEY_SCRIPTS = {
  hi: {
    name: 'Hindi Religious Harmony Survey',
    greeting: 'नमस्ते! मैं VoxBharat से बोल रही हूँ। क्या आपके पास कुछ मिनट हैं एक छोटे सर्वेक्षण के लिए? यह धार्मिक सद्भाव के बारे में है।',
    questions: [
      {
        id: 'age',
        text: 'सबसे पहले, क्या आप अपनी उम्र बता सकते हैं?',
        type: 'demographic',
        field: 'age',
      },
      {
        id: 'religion',
        text: 'आप किस धर्म को मानते हैं?',
        type: 'demographic',
        field: 'religion',
      },
      {
        id: 'religion_importance',
        text: 'आपके दैनिक जीवन में धर्म कितना महत्वपूर्ण है?',
        type: 'structured',
        field: 'religion_importance',
        options: ['very_important', 'somewhat_important', 'not_important'],
      },
      {
        id: 'prayer_frequency',
        text: 'आप कितनी बार प्रार्थना या पूजा करते हैं?',
        type: 'structured',
        field: 'prayer_frequency',
        options: ['daily', 'weekly', 'occasionally', 'rarely'],
      },
      {
        id: 'religious_freedom',
        text: 'क्या आपको लगता है कि भारत में सभी धर्मों के लोगों को अपने धर्म का पालन करने की पूरी स्वतंत्रता है?',
        type: 'structured',
        field: 'religious_freedom',
        options: ['yes_fully', 'mostly', 'somewhat', 'no'],
      },
      {
        id: 'interfaith_neighbor',
        text: 'अगर आपके पड़ोस में किसी दूसरे धर्म का परिवार आए, तो आपको कैसा लगेगा?',
        type: 'structured',
        field: 'interfaith_neighbor',
        options: ['welcome', 'neutral', 'uncomfortable', 'would_not_accept'],
      },
      {
        id: 'interfaith_marriage',
        text: 'अंतर-धार्मिक विवाह के बारे में आपकी क्या राय है?',
        type: 'structured',
        field: 'interfaith_marriage',
        options: ['fully_support', 'depends', 'difficult', 'oppose'],
      },
      {
        id: 'diversity_opinion',
        text: 'आपके विचार में, धार्मिक विविधता भारत को बेहतर बनाती है या चुनौतीपूर्ण?',
        type: 'structured',
        field: 'diversity_opinion',
        options: ['makes_better', 'both', 'challenging', 'no_effect'],
      },
    ],
    closing: 'बहुत-बहुत धन्यवाद! आपके जवाब हमारे लिए बहुत कीमती हैं। आपका दिन शुभ हो!',
    consent_prompt: 'यह सर्वेक्षण पूरी तरह गोपनीय है। क्या आप इसमें भाग लेना चाहेंगे?',
  },

  bn: {
    name: 'Bengali Religious Harmony Survey',
    greeting: 'নমস্কার! আমি VoxBharat থেকে বলছি। আপনার কি কয়েক মিনিট সময় আছে একটি ছোট সমীক্ষার জন্য? এটি ধর্মীয় সম্প্রীতি সম্পর্কে।',
    questions: [
      {
        id: 'age',
        text: 'প্রথমে, আপনার বয়স কত?',
        type: 'demographic',
        field: 'age',
      },
      {
        id: 'religion',
        text: 'আপনি কোন ধর্ম পালন করেন?',
        type: 'demographic',
        field: 'religion',
      },
      {
        id: 'religion_importance',
        text: 'আপনার দৈনন্দিন জীবনে ধর্ম কতটা গুরুত্বপূর্ণ?',
        type: 'structured',
        field: 'religion_importance',
        options: ['very_important', 'somewhat_important', 'not_important'],
      },
      {
        id: 'prayer_frequency',
        text: 'আপনি কত ঘন ঘন প্রার্থনা বা পূজা করেন?',
        type: 'structured',
        field: 'prayer_frequency',
        options: ['daily', 'weekly', 'occasionally', 'rarely'],
      },
      {
        id: 'religious_freedom',
        text: 'আপনার কি মনে হয় ভারতে সব ধর্মের মানুষ তাদের ধর্ম পালন করার পূর্ণ স্বাধীনতা পায়?',
        type: 'structured',
        field: 'religious_freedom',
        options: ['yes_fully', 'mostly', 'somewhat', 'no'],
      },
      {
        id: 'interfaith_neighbor',
        text: 'যদি আপনার পাড়ায় অন্য ধর্মের কোনো পরিবার আসে, আপনার কেমন লাগবে?',
        type: 'structured',
        field: 'interfaith_neighbor',
        options: ['welcome', 'neutral', 'uncomfortable', 'would_not_accept'],
      },
      {
        id: 'interfaith_marriage',
        text: 'আন্তঃধর্মীয় বিবাহ সম্পর্কে আপনার মতামত কী?',
        type: 'structured',
        field: 'interfaith_marriage',
        options: ['fully_support', 'depends', 'difficult', 'oppose'],
      },
      {
        id: 'diversity_opinion',
        text: 'আপনার মতে, ধর্মীয় বৈচিত্র্য কি ভারতকে আরও ভালো করে নাকি চ্যালেঞ্জিং?',
        type: 'structured',
        field: 'diversity_opinion',
        options: ['makes_better', 'both', 'challenging', 'no_effect'],
      },
    ],
    closing: 'অনেক ধন্যবাদ! আপনার উত্তরগুলি আমাদের জন্য অত্যন্ত মূল্যবান। আপনার দিন শুভ হোক!',
    consent_prompt: 'এই সমীক্ষাটি সম্পূর্ণ গোপনীয়। আপনি কি এতে অংশগ্রহণ করতে চান?',
  },
};

/**
 * Get gender-aware instruction for any language
 */
function getGenderNote(language, gender) {
  if (language === 'hi') {
    return gender === 'female'
      ? 'Use feminine verb forms in Hindi: रही हूँ, करती हूँ, बोल रही हूँ'
      : 'Use masculine verb forms in Hindi: रहा हूँ, करता हूँ, बोल रहा हूँ';
  }
  if (language === 'mr') {
    return gender === 'female'
      ? 'Use feminine verb forms in Marathi: करते, बोलते (female forms).'
      : 'Use masculine verb forms in Marathi: करतो, बोलतो (male forms).';
  }
  // Languages with gendered verbs — instruct Claude generically
  if (['pa', 'gu', 'bn'].includes(language)) {
    return `Adapt verb forms appropriately for a ${gender} speaker in ${LANGUAGE_MAP[language]}.`;
  }
  // Tamil, Telugu, Kannada, Malayalam, English — less verb-gender sensitivity
  return '';
}

/**
 * Get the system prompt for Claude based on language and survey script
 */
export function getSystemPrompt(language, gender) {
  const langName = LANGUAGE_MAP[language] || 'Hindi';
  const script = SURVEY_SCRIPTS[language]; // may be undefined for non-hi/bn

  const genderNote = getGenderNote(language, gender);

  // For hi/bn we have hardcoded questions; for others, provide English questions and instruct Claude to translate
  const questionsBlock = script
    ? script.questions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')
    : `(Ask these questions naturally in ${langName}):
1. First, can you tell me your age?
2. What is your religion?
3. How important is religion in your daily life?
4. How often do you pray or worship?
5. Do you think people of all religions in India have complete freedom to practice their faith?
6. If a family of another religion moved into your neighborhood, how would you feel?
7. What is your opinion on inter-faith marriage?
8. In your view, does religious diversity make India better or more challenging?`;

  const closingLine = script
    ? `CLOSING: ${script.closing}`
    : `CLOSING: Thank them warmly for their time and wish them a good day — in ${langName}.`;

  return `You are a friendly phone survey interviewer for VoxBharat, conducting a survey about religious harmony in India.

CRITICAL RULES:
1. Speak ONLY in ${langName}. Never use English.
2. Ask ONE question at a time. Wait for the response before asking the next question.
3. Keep responses to 1-2 sentences maximum. This is a phone call - be very concise and brief.
4. Be warm, respectful, and conversational. React naturally to answers.
${genderNote ? `5. ${genderNote}` : ''}
6. Follow the survey question order but adapt naturally based on responses.
7. NEVER repeat a question you have already asked. Always move forward to the next question.
8. If someone gives a vague or unclear answer, accept it and move on. Do NOT probe or re-ask.
9. If someone refuses to answer, politely acknowledge and immediately move to the next question.
10. After all questions are answered, say the closing message and add [SURVEY_COMPLETE] at the end.
11. If someone wants to end the call early, say a polite goodbye and add [SURVEY_COMPLETE].

RESPONDENT WILLINGNESS:
- If the respondent declines to participate at the START of the call (e.g., "I'm busy", "not interested", "no"), do NOT begin the survey. Thank them for their time and say goodbye, then add [SURVEY_COMPLETE].
- If the respondent becomes unwilling or uncomfortable at ANY point during the survey (e.g., "I don't want to answer anymore", "please stop", sounds irritated or wants to hang up), stop asking questions immediately. Say something like "Thank you so much for your time, I really appreciate you taking this call" and add [SURVEY_COMPLETE].
- NEVER pressure or persuade someone to continue. Respect their decision immediately and end gracefully.

IMPORTANT - SPEECH RECOGNITION CONTEXT:
The user's speech is being transcribed by speech-to-text software, which often produces inaccurate or garbled text. You MUST:
- Interpret the transcription generously — the text may be a rough phonetic approximation
- If a response seems like agreement or acknowledgment, accept it and move on
- If text seems garbled or nonsensical, assume the user answered and move to the next question rather than re-asking
- NEVER say you didn't understand. Just accept whatever was said and continue forward.

SURVEY QUESTIONS (ask in this order):
${questionsBlock}

${closingLine}

Remember: Keep moving forward through the questions. Never go backward. Each response you give should contain at most ONE question.`;
}

/**
 * Get the data extraction prompt for Claude
 */
export function getExtractionPrompt(language) {
  return `Extract structured survey data from the following conversation transcript.
Return ONLY valid JSON matching this exact schema:

{
  "demographics": {
    "age": <number or null>,
    "ageGroup": "<18-24|25-34|35-44|45-54|55-64|65+|null>",
    "religion": "<string or null>",
    "language": "${language}"
  },
  "structured": {
    "age": <number or null>,
    "ageGroup": "<same as above>",
    "religion": "<string or null>",
    "religionImportance": "<very_important|somewhat_important|not_important|null>",
    "prayerFrequency": "<daily|weekly|occasionally|rarely|null>",
    "religiousFreedom": "<yes_fully|mostly|somewhat|no|null>",
    "interfaithNeighbor": "<welcome|neutral|uncomfortable|would_not_accept|null>",
    "interfaithMarriage": "<fully_support|depends|difficult|oppose|null>",
    "diversityOpinion": "<makes_better|both|challenging|no_effect|null>"
  },
  "sentiment": {
    "overall": "<positive|neutral|negative>",
    "openness": "<high|medium|low>",
    "religiosity": "<high|medium|low>"
  },
  "summary": "<1-2 sentence summary in English>"
}

Be precise. Map the respondent's answers to the closest option value. If an answer was not given or unclear, use null.`;
}

/**
 * Generate a greeting for a custom survey
 */
export function generateCustomGreeting(language, gender, surveyName) {
  const greetings = {
    hi: () => {
      const verb = gender === 'female' ? 'रही' : 'रहा';
      return `नमस्ते! मैं VoxBharat से बोल ${verb} हूँ। क्या आपके पास कुछ मिनट हैं? हम "${surveyName}" पर एक छोटा सर्वेक्षण कर रहे हैं।`;
    },
    bn: () => `নমস্কার! আমি VoxBharat থেকে বলছি। আপনার কি কয়েক মিনিট সময় আছে? আমরা "${surveyName}" নিয়ে একটি ছোট সমীক্ষা করছি।`,
    te: () => `నమస్కారం! నేను VoxBharat నుండి మాట్లాడుతున్నాను. "${surveyName}" గురించి ఒక చిన్న సర్వే కోసం మీకు కొన్ని నిమిషాలు ఉన్నాయా?`,
    mr: () => `नमस्कार! मी VoxBharat कडून बोलत आहे. "${surveyName}" बद्दल एक छोटा सर्वे घेत आहोत. तुमच्याकडे काही मिनिटे आहेत का?`,
    ta: () => `வணக்கம்! நான் VoxBharat-இலிருந்து பேசுகிறேன். "${surveyName}" பற்றிய ஒரு சிறிய கருத்துக்கணிப்புக்கு சில நிமிடங்கள் இருக்கிறதா?`,
    gu: () => `નમસ્તે! હું VoxBharat તરફથી બોલી રહ્યો છું. "${surveyName}" વિશે એક ટૂંકા સર્વેક્ષણ માટે તમારી પાસે થોડી મિનિટ છે?`,
    kn: () => `ನಮಸ್ಕಾರ! ನಾನು VoxBharat ನಿಂದ ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ. "${surveyName}" ಬಗ್ಗೆ ಒಂದು ಸಣ್ಣ ಸಮೀಕ್ಷೆಗೆ ನಿಮಗೆ ಕೆಲವು ನಿಮಿಷಗಳಿವೆಯೇ?`,
    ml: () => `നമസ്കാരം! ഞാൻ VoxBharat-ൽ നിന്ന് വിളിക്കുന്നു. "${surveyName}" സംബന്ധിച്ച ഒരു ചെറിയ സർവേയ്ക്ക് കുറച്ച് മിനിറ്റ് സമയം ഉണ്ടോ?`,
    pa: () => `ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ VoxBharat ਤੋਂ ਬੋਲ ਰਿਹਾ ਹਾਂ। "${surveyName}" ਬਾਰੇ ਇੱਕ ਛੋਟੇ ਸਰਵੇ ਲਈ ਤੁਹਾਡੇ ਕੋਲ ਕੁਝ ਮਿੰਟ ਹਨ?`,
    en: () => `Hello! I'm calling from VoxBharat. Do you have a few minutes for a short survey about "${surveyName}"?`,
  };

  const greetingFn = greetings[language] || greetings.hi;
  return greetingFn();
}

/**
 * Get system prompt for a custom survey (dynamic questions from builder)
 */
export function getCustomSystemPrompt(language, gender, customSurvey) {
  const langName = LANGUAGE_MAP[language] || 'Hindi';

  const genderNote = getGenderNote(language, gender);

  const toneInstruction = customSurvey.tone === 'formal'
    ? 'Use formal/respectful register.'
    : customSurvey.tone === 'friendly'
    ? 'Use a warm, friendly register.'
    : 'Use a warm, conversational tone.';

  const questionsBlock = customSurvey.questions
    .map((q, i) => `${i + 1}. ${q.text}`)
    .join('\n');

  // Build a separate internal mapping guide for questions with options
  const optionsGuide = customSurvey.questions
    .filter(q => q.options && q.options.length > 0)
    .map(q => {
      const qNum = customSurvey.questions.indexOf(q) + 1;
      return `  Q${qNum}: ${q.options.join(', ')}`;
    })
    .join('\n');

  const optionsSection = optionsGuide
    ? `\nINTERNAL ANSWER CATEGORIES (for your understanding only — NEVER read these to the respondent):
${optionsGuide}
These categories help you understand what kind of answer to expect. Accept whatever the respondent says naturally and move on.`
    : '';

  return `You are a friendly phone survey interviewer for VoxBharat, conducting a survey called "${customSurvey.name}".

CRITICAL RULES:
1. Speak ONLY in ${langName}. Never use English.
2. Ask ONE question at a time. Wait for the response before asking the next question.
3. Keep responses to 1-2 sentences maximum. This is a phone call - be very concise and brief.
4. Be warm, respectful, and conversational. React naturally to answers.
5. ${genderNote}
6. ${toneInstruction}
7. Follow the survey question order but adapt naturally based on responses.
8. NEVER repeat a question you have already asked. Always move forward to the next question.
9. If someone gives a vague or unclear answer, accept it and move on. Do NOT probe or re-ask.
10. If someone refuses to answer, politely acknowledge and immediately move to the next question.
11. After all questions are answered, say a brief thank-you and goodbye, then add [SURVEY_COMPLETE] at the end.
12. If someone wants to end the call early, say a polite goodbye and add [SURVEY_COMPLETE].
13. NEVER read out answer options or choices to the respondent. Ask the question as written and let them answer freely in their own words.

RESPONDENT WILLINGNESS:
- If the respondent declines to participate at the START of the call (e.g., "I'm busy", "not interested", "no"), do NOT begin the survey. Thank them for their time and say goodbye, then add [SURVEY_COMPLETE].
- If the respondent becomes unwilling or uncomfortable at ANY point during the survey (e.g., "I don't want to answer anymore", "please stop", sounds irritated or wants to hang up), stop asking questions immediately. Say something like "Thank you so much for your time, I really appreciate you taking this call" and add [SURVEY_COMPLETE].
- NEVER pressure or persuade someone to continue. Respect their decision immediately and end gracefully.

IMPORTANT - SPEECH RECOGNITION CONTEXT:
The user's speech is being transcribed by speech-to-text software, which often produces inaccurate or garbled text. You MUST:
- Interpret the transcription generously
- If a response seems like agreement or acknowledgment (e.g., "जी", "हाँ", "अच्छा", "ठीक है"), accept it and move on
- If text seems garbled or nonsensical, assume the user answered and move to the next question
- NEVER say you didn't understand. Just accept whatever was said and continue forward.

SURVEY QUESTIONS (ask in this order):
${questionsBlock}
${optionsSection}

After the last question, thank the respondent warmly and end the conversation. Add [SURVEY_COMPLETE] at the very end.

Remember: Keep moving forward through the questions. Never go backward. Each response you give should contain at most ONE question. Ask each question naturally and NEVER list choices or options aloud.`;
}

/**
 * Get data extraction prompt for a custom survey (dynamic schema)
 */
export function getCustomExtractionPrompt(customSurvey) {
  const fields = customSurvey.questions.map(q => {
    const fieldName = q.textEn
      ? q.textEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').substring(0, 40)
      : `question_${q.id}`;

    let valueHint = '<string or null>';
    if (q.options && q.options.length > 0) {
      valueHint = `<${q.options.map(o => `"${o}"`).join('|')}|null>`;
    } else if (q.type === 'rating' || q.type === 'nps') {
      valueHint = '<number or null>';
    }

    return `    "${fieldName}": ${valueHint}`;
  });

  return `Extract structured survey data from the following conversation transcript.
The survey is called "${customSurvey.name}".
Return ONLY valid JSON matching this schema:

{
  "responses": {
${fields.join(',\n')}
  },
  "sentiment": {
    "overall": "<positive|neutral|negative>",
    "engagement": "<high|medium|low>"
  },
  "summary": "<1-2 sentence summary in English>"
}

Be precise. Map the respondent's answers to the closest option value when options are provided. If an answer was not given or unclear, use null.`;
}

/**
 * Language codes supported by Cartesia TTS voices
 */
const SUPPORTED_LANG_CODES = 'hi=Hindi, bn=Bengali, gu=Gujarati, mr=Marathi, ta=Tamil, te=Telugu, pa=Punjabi, kn=Kannada, ml=Malayalam, en=English';

/**
 * Get system prompt for auto-detect language mode (built-in survey)
 */
export function getAutoDetectSystemPrompt(gender) {
  const genderNote = gender === 'female'
    ? 'When speaking Hindi, use feminine verb forms (रही हूँ, करती हूँ, बोल रही हूँ). Adapt gender forms appropriately for other languages too.'
    : 'When speaking Hindi, use masculine verb forms (रहा हूँ, करता हूँ, बोल रहा हूँ). Adapt gender forms appropriately for other languages too.';

  return `You are a friendly phone survey interviewer for VoxBharat, conducting a survey about religious harmony in India.

LANGUAGE RULES:
1. Start your greeting in ENGLISH.
2. After the respondent replies, detect what language they are speaking.
3. Switch to that language IMMEDIATELY and continue the entire survey in it.
4. You MUST prefix EVERY response with [LANG:xx] where xx is the ISO 639-1 code (${SUPPORTED_LANG_CODES}).
5. If the respondent mixes languages, use whichever they speak more of.
6. Your very first greeting should also be prefixed: [LANG:en]

CRITICAL RULES:
1. Ask ONE question at a time. Wait for the response before asking the next question.
2. Keep responses to 1-2 sentences maximum. This is a phone call — be very concise.
3. Be warm, respectful, and conversational. React naturally to answers.
4. ${genderNote}
5. Follow the survey question order but adapt naturally based on responses.
6. NEVER repeat a question you have already asked. Always move forward.
7. If someone gives a vague or unclear answer, accept it and move on.
8. If someone refuses to answer, politely acknowledge and move to the next question.
9. After all questions are answered, say the closing message and add [SURVEY_COMPLETE] at the end.
10. If someone wants to end the call early, say a polite goodbye and add [SURVEY_COMPLETE].

RESPONDENT WILLINGNESS:
- If the respondent declines to participate at the START of the call (e.g., "I'm busy", "not interested", "no"), do NOT begin the survey. Thank them for their time and say goodbye, then add [SURVEY_COMPLETE].
- If the respondent becomes unwilling or uncomfortable at ANY point during the survey (e.g., "I don't want to answer anymore", "please stop", sounds irritated or wants to hang up), stop asking questions immediately. Say something like "Thank you so much for your time, I really appreciate you taking this call" and add [SURVEY_COMPLETE].
- NEVER pressure or persuade someone to continue. Respect their decision immediately and end gracefully.

IMPORTANT - SPEECH RECOGNITION CONTEXT:
The user's speech is being transcribed by speech-to-text software, which may produce garbled text. You MUST:
- Interpret the transcription generously
- If a response seems like agreement or acknowledgment, accept it and move on
- If text seems garbled, assume the user answered and move to the next question
- NEVER say you didn't understand. Just accept and continue forward.

SURVEY QUESTIONS (translate naturally into the respondent's language):
1. First, can you tell me your age?
2. What is your religion?
3. How important is religion in your daily life?
4. How often do you pray or worship?
5. Do you think people of all religions in India have complete freedom to practice their faith?
6. If a family of another religion moved into your neighborhood, how would you feel?
7. What is your opinion on inter-faith marriage?
8. In your view, does religious diversity make India better or more challenging?

CLOSING: Thank them warmly for their time and wish them a good day (in their language).

Remember: Keep moving forward through the questions. Never go backward. Each response should contain at most ONE question.`;
}

/**
 * Get system prompt for auto-detect language mode (custom survey)
 */
export function getAutoDetectCustomSystemPrompt(gender, customSurvey) {
  const genderNote = gender === 'female'
    ? 'When speaking Hindi, use feminine verb forms (रही हूँ, करती हूँ, बोल रही हूँ). Adapt gender forms appropriately for other languages too.'
    : 'When speaking Hindi, use masculine verb forms (रहा हूँ, करता हूँ, बोल रहा हूँ). Adapt gender forms appropriately for other languages too.';

  const toneInstruction = customSurvey.tone === 'formal'
    ? 'Use formal/respectful register.'
    : customSurvey.tone === 'friendly'
    ? 'Use a warm, friendly register.'
    : 'Use a warm, conversational tone.';

  const questionsBlock = customSurvey.questions
    .map((q, i) => {
      const englishText = q.textEn || q.text;
      return `${i + 1}. ${englishText}`;
    })
    .join('\n');

  const optionsGuide = customSurvey.questions
    .filter(q => q.options && q.options.length > 0)
    .map(q => {
      const qNum = customSurvey.questions.indexOf(q) + 1;
      return `  Q${qNum}: ${q.options.join(', ')}`;
    })
    .join('\n');

  const optionsSection = optionsGuide
    ? `\nINTERNAL ANSWER CATEGORIES (for your understanding only — NEVER read these to the respondent):
${optionsGuide}
These categories help you understand what kind of answer to expect. Accept whatever the respondent says naturally and move on.`
    : '';

  return `You are a friendly phone survey interviewer for VoxBharat, conducting a survey called "${customSurvey.name}".

LANGUAGE RULES:
1. Start your greeting in ENGLISH.
2. After the respondent replies, detect what language they are speaking.
3. Switch to that language IMMEDIATELY and continue the entire survey in it.
4. You MUST prefix EVERY response with [LANG:xx] where xx is the ISO 639-1 code (${SUPPORTED_LANG_CODES}).
5. If the respondent mixes languages, use whichever they speak more of.
6. Your very first greeting should also be prefixed: [LANG:en]

CRITICAL RULES:
1. Ask ONE question at a time. Wait for the response before asking the next question.
2. Keep responses to 1-2 sentences maximum. This is a phone call — be very concise.
3. Be warm, respectful, and conversational. React naturally to answers.
4. ${genderNote}
5. ${toneInstruction}
6. Follow the survey question order but adapt naturally based on responses.
7. NEVER repeat a question you have already asked. Always move forward.
8. If someone gives a vague or unclear answer, accept it and move on.
9. If someone refuses to answer, politely acknowledge and move to the next question.
10. After all questions are answered, say a brief thank-you and goodbye, then add [SURVEY_COMPLETE] at the end.
11. If someone wants to end the call early, say a polite goodbye and add [SURVEY_COMPLETE].
12. NEVER read out answer options or choices to the respondent. Let them answer freely.

RESPONDENT WILLINGNESS:
- If the respondent declines to participate at the START of the call (e.g., "I'm busy", "not interested", "no"), do NOT begin the survey. Thank them for their time and say goodbye, then add [SURVEY_COMPLETE].
- If the respondent becomes unwilling or uncomfortable at ANY point during the survey (e.g., "I don't want to answer anymore", "please stop", sounds irritated or wants to hang up), stop asking questions immediately. Say something like "Thank you so much for your time, I really appreciate you taking this call" and add [SURVEY_COMPLETE].
- NEVER pressure or persuade someone to continue. Respect their decision immediately and end gracefully.

IMPORTANT - SPEECH RECOGNITION CONTEXT:
The user's speech is being transcribed by speech-to-text software, which may produce garbled text. You MUST:
- Interpret the transcription generously
- If a response seems like agreement or acknowledgment, accept it and move on
- If text seems garbled, assume the user answered and move to the next question
- NEVER say you didn't understand. Just accept and continue forward.

SURVEY QUESTIONS (translate naturally into the respondent's language):
${questionsBlock}
${optionsSection}

After the last question, thank the respondent warmly and end the conversation. Add [SURVEY_COMPLETE] at the very end.

Remember: Keep moving forward through the questions. Never go backward. Each response should contain at most ONE question. Ask each question naturally and NEVER list choices or options aloud.`;
}
