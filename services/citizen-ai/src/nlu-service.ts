/**
 * Natural Language Understanding Service
 *
 * Advanced NLU capabilities for multi-lingual citizen services.
 */

export interface NLUAnalysis {
  language: LanguageDetection;
  sentiment: SentimentResult;
  entities: EntityResult[];
  intent: IntentResult;
  keywords: KeywordResult[];
  urgency: UrgencyLevel;
}

export interface LanguageDetection {
  detected: string;
  confidence: number;
  alternatives: Array<{ code: string; confidence: number }>;
  isRTL: boolean;
}

export interface SentimentResult {
  score: number; // -1 to 1
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;
  aspects?: AspectSentiment[];
}

export interface AspectSentiment {
  aspect: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
}

export interface EntityResult {
  type: EntityType;
  value: string;
  normalizedValue?: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export type EntityType =
  | 'person'
  | 'organization'
  | 'location'
  | 'date'
  | 'time'
  | 'money'
  | 'email'
  | 'phone'
  | 'estonian_id'
  | 'registration_code'
  | 'address'
  | 'document_number';

export interface IntentResult {
  primary: string;
  confidence: number;
  subIntent?: string;
  parameters: Record<string, string>;
}

export interface KeywordResult {
  keyword: string;
  relevance: number;
  category?: string;
}

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

// Language detection patterns
const LANGUAGE_SIGNATURES: Record<string, { chars: RegExp; words: RegExp[] }> = {
  et: {
    chars: /[õäöü]/i,
    words: [/\b(ja|ning|et|kui|on|ei|see|mis|kes|kus)\b/gi],
  },
  en: {
    chars: /[a-z]/i,
    words: [/\b(the|is|are|was|were|have|has|will|would|can|could)\b/gi],
  },
  ru: {
    chars: /[а-яё]/i,
    words: [/\b(и|в|не|на|я|что|он|она|с|это|как)\b/gi],
  },
  uk: {
    chars: /[іїєґ]/i,
    words: [/\b(і|в|не|на|я|що|він|вона|з|це|як)\b/gi],
  },
  de: {
    chars: /[äöüß]/i,
    words: [/\b(der|die|das|und|ist|ein|eine|nicht|mit|auf)\b/gi],
  },
  fr: {
    chars: /[àâçéèêëïîôùûü]/i,
    words: [/\b(le|la|les|de|du|des|un|une|et|est|que)\b/gi],
  },
  fi: {
    chars: /[äö]/i,
    words: [/\b(ja|on|ei|se|että|kun|niin|kuin|myös|ovat)\b/gi],
  },
  ar: {
    chars: /[\u0600-\u06FF]/,
    words: [],
  },
  zh: {
    chars: /[\u4e00-\u9fff]/,
    words: [],
  },
};

// RTL languages
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

// Urgency indicators
const URGENCY_PATTERNS: Record<UrgencyLevel, RegExp[]> = {
  critical: [
    /emergency|urgent|asap|immediately|deadline.*(today|tomorrow)/i,
    /expires?.*(today|tomorrow|soon)/i,
    /срочно|немедленно|kiiresti|kohe/i,
  ],
  high: [
    /important|priority|quickly|soon/i,
    /tähtis|oluline|важно|срок/i,
  ],
  medium: [
    /please|need|require|want/i,
    /palun|vajan|нужно|пожалуйста/i,
  ],
  low: [],
};

// Intent patterns for government services
const INTENT_DEFINITIONS: Record<string, { patterns: RegExp[]; parameters: string[] }> = {
  'query.status': {
    patterns: [
      /status|progress|where.*(my|the)|check.*(application|request)/i,
      /staatus|seisund|статус|состояние/i,
    ],
    parameters: ['reference_number', 'application_type'],
  },
  'request.information': {
    patterns: [
      /how.*(do|can|to)|what.*(is|are)|tell.*about|information.*about/i,
      /kuidas|mis|info|информация|как/i,
    ],
    parameters: ['topic'],
  },
  'request.service': {
    patterns: [
      /apply|register|request|submit|start/i,
      /taotlema|registreerima|подать|зарегистрировать/i,
    ],
    parameters: ['service_type'],
  },
  'complaint.submit': {
    patterns: [
      /complain|problem|issue|not.*(working|functioning)|broken/i,
      /kaebus|probleem|жалоба|проблема/i,
    ],
    parameters: ['subject', 'description'],
  },
  'appointment.book': {
    patterns: [
      /book|schedule|appointment|meet|visit/i,
      /broneeri|ajastada|записаться|назначить/i,
    ],
    parameters: ['service', 'date', 'location'],
  },
  'document.request': {
    patterns: [
      /document|certificate|extract|copy|proof/i,
      /dokument|tõend|väljavõte|документ|справка/i,
    ],
    parameters: ['document_type'],
  },
  'payment.inquiry': {
    patterns: [
      /pay|payment|fee|cost|price|invoice/i,
      /maksu?ma?|tasu|makse|оплата|стоимость/i,
    ],
    parameters: ['service', 'amount'],
  },
};

export class NLUService {
  /**
   * Perform comprehensive NLU analysis
   */
  async analyze(text: string): Promise<NLUAnalysis> {
    const language = this.detectLanguage(text);
    const sentiment = this.analyzeSentiment(text, language.detected);
    const entities = this.extractEntities(text, language.detected);
    const intent = this.classifyIntent(text, language.detected);
    const keywords = this.extractKeywords(text, language.detected);
    const urgency = this.assessUrgency(text);

    return {
      language,
      sentiment,
      entities,
      intent,
      keywords,
      urgency,
    };
  }

  /**
   * Detect language with confidence scoring
   */
  detectLanguage(text: string): LanguageDetection {
    const scores: Record<string, number> = {};

    for (const [lang, signature] of Object.entries(LANGUAGE_SIGNATURES)) {
      let score = 0;

      // Check character patterns
      const charMatches = (text.match(signature.chars) || []).length;
      score += charMatches * 0.5;

      // Check word patterns
      for (const wordPattern of signature.words) {
        const wordMatches = (text.match(wordPattern) || []).length;
        score += wordMatches * 2;
      }

      if (score > 0) {
        scores[lang] = score;
      }
    }

    // Sort by score
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
      return {
        detected: 'en',
        confidence: 0.5,
        alternatives: [],
        isRTL: false,
      };
    }

    const totalScore = sorted.reduce((sum, [, score]) => sum + score, 0);
    const detected = sorted[0][0];
    const confidence = Math.min(sorted[0][1] / Math.max(totalScore, 1), 1);

    return {
      detected,
      confidence,
      alternatives: sorted.slice(1, 4).map(([code, score]) => ({
        code,
        confidence: score / totalScore,
      })),
      isRTL: RTL_LANGUAGES.includes(detected),
    };
  }

  /**
   * Analyze sentiment of text
   */
  analyzeSentiment(text: string, language: string): SentimentResult {
    const positivePatterns = [
      /thank|good|great|excellent|perfect|happy|pleased|wonderful/i,
      /aitäh|hea|suurepärane|rahul/i,
      /спасибо|хорошо|отлично|доволен/i,
    ];

    const negativePatterns = [
      /bad|terrible|awful|angry|frustrated|disappointed|problem|issue/i,
      /halb|kohutav|vihane|pettunud|probleem/i,
      /плохо|ужасно|злой|разочарован|проблема/i,
    ];

    let positiveScore = 0;
    let negativeScore = 0;

    for (const pattern of positivePatterns) {
      positiveScore += (text.match(pattern) || []).length;
    }

    for (const pattern of negativePatterns) {
      negativeScore += (text.match(pattern) || []).length;
    }

    const total = positiveScore + negativeScore;
    let score: number;
    let label: 'positive' | 'neutral' | 'negative';

    if (total === 0) {
      score = 0;
      label = 'neutral';
    } else {
      score = (positiveScore - negativeScore) / total;
      label = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';
    }

    return {
      score,
      label,
      confidence: Math.min(total * 0.2 + 0.5, 1),
    };
  }

  /**
   * Extract named entities from text
   */
  extractEntities(text: string, language: string): EntityResult[] {
    const entities: EntityResult[] = [];

    // Email
    const emails = text.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
    for (const email of emails) {
      entities.push({ type: 'email', value: email, confidence: 0.95 });
    }

    // Phone numbers (Estonian and international formats)
    const phones = text.match(/(?:\+372|00372)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g) || [];
    for (const phone of phones) {
      entities.push({
        type: 'phone',
        value: phone,
        normalizedValue: phone.replace(/[\s-]/g, ''),
        confidence: 0.85,
      });
    }

    // Estonian ID code (isikukood)
    const idCodes = text.match(/[1-6]\d{2}[01]\d[0-3]\d{5}/g) || [];
    for (const id of idCodes) {
      entities.push({ type: 'estonian_id', value: id, confidence: 0.9 });
    }

    // Company registration codes (Estonian: 8 digits starting with 1)
    const regCodes = text.match(/\b1\d{7}\b/g) || [];
    for (const code of regCodes) {
      entities.push({ type: 'registration_code', value: code, confidence: 0.85 });
    }

    // Dates (various formats)
    const dates = text.match(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g) || [];
    for (const date of dates) {
      entities.push({ type: 'date', value: date, confidence: 0.8 });
    }

    // Money amounts (EUR)
    const money = text.match(/€?\s?\d+([.,]\d{2})?\s*(€|EUR|eurot?)?/gi) || [];
    for (const amount of money) {
      if (/\d/.test(amount)) {
        entities.push({
          type: 'money',
          value: amount,
          normalizedValue: amount.replace(/[^\d.,]/g, ''),
          confidence: 0.8,
        });
      }
    }

    return entities;
  }

  /**
   * Classify user intent
   */
  classifyIntent(text: string, language: string): IntentResult {
    let bestMatch: { intent: string; confidence: number; parameters: string[] } | null = null;
    let highestScore = 0;

    for (const [intentName, definition] of Object.entries(INTENT_DEFINITIONS)) {
      for (const pattern of definition.patterns) {
        const matches = text.match(pattern);
        if (matches) {
          const score = matches.length * (pattern.flags.includes('i') ? 1 : 1.5);
          if (score > highestScore) {
            highestScore = score;
            bestMatch = {
              intent: intentName,
              confidence: Math.min(score * 0.3 + 0.5, 0.95),
              parameters: definition.parameters,
            };
          }
        }
      }
    }

    if (!bestMatch) {
      return {
        primary: 'general.inquiry',
        confidence: 0.5,
        parameters: {},
      };
    }

    return {
      primary: bestMatch.intent,
      confidence: bestMatch.confidence,
      parameters: {},
    };
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text: string, language: string): KeywordResult[] {
    // Simple keyword extraction based on word frequency and importance
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'and', 'or', 'but', 'if', 'then', 'else', 'when', 'at', 'by', 'for',
      'with', 'about', 'against', 'between', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
      'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
      'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we',
      'our', 'ours', 'you', 'your', 'he', 'him', 'his', 'she', 'her',
      'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who',
    ]);

    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/gi) || [];
    const wordCounts: Record<string, number> = {};

    for (const word of words) {
      if (!stopWords.has(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }

    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({
        keyword,
        relevance: count / words.length,
      }));
  }

  /**
   * Assess urgency level of request
   */
  assessUrgency(text: string): UrgencyLevel {
    for (const [level, patterns] of Object.entries(URGENCY_PATTERNS) as [UrgencyLevel, RegExp[]][]) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return level;
        }
      }
    }
    return 'low';
  }
}

export const nluService = new NLUService();
