/**
 * Conversational AI Service for Public Services
 *
 * Multi-lingual dialogue management for citizens, immigrants,
 * and international partners accessing Estonian digital services.
 */

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  language: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ConversationContext {
  sessionId: string;
  userId?: string;
  language: string;
  preferredLanguage?: string;
  serviceCategory?: ServiceCategory;
  history: ConversationMessage[];
  entities: ExtractedEntity[];
  intents: DetectedIntent[];
  slots: Record<string, string>;
}

export type ServiceCategory =
  | 'e-residency'
  | 'immigration'
  | 'taxation'
  | 'healthcare'
  | 'education'
  | 'business-registration'
  | 'id-documents'
  | 'social-services'
  | 'general';

export interface DetectedIntent {
  name: string;
  confidence: number;
  parameters: Record<string, string>;
}

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  position: { start: number; end: number };
}

export interface ConversationResponse {
  text: string;
  language: string;
  intent?: DetectedIntent;
  suggestedActions?: SuggestedAction[];
  requiresHumanHandoff?: boolean;
  handoffReason?: string;
}

export interface SuggestedAction {
  type: 'link' | 'form' | 'appointment' | 'document' | 'faq';
  title: string;
  url?: string;
  description?: string;
}

// Intent patterns for common public service queries
const INTENT_PATTERNS: Record<string, { patterns: RegExp[]; category: ServiceCategory }> = {
  'e-residency.apply': {
    patterns: [
      /e-?residency|digital.?resident|become.?resident/i,
      /apply.*estonia/i,
      /digital.?id.*estonia/i,
    ],
    category: 'e-residency',
  },
  'e-residency.status': {
    patterns: [/application.*status/i, /check.*status/i, /my.?application/i],
    category: 'e-residency',
  },
  'immigration.visa': {
    patterns: [/visa|work.?permit|residence.?permit/i, /immigrat/i],
    category: 'immigration',
  },
  'tax.filing': {
    patterns: [/tax.*return|file.*tax|income.?tax/i, /declare.*income/i],
    category: 'taxation',
  },
  'tax.vat': {
    patterns: [/vat|value.?added.?tax|käibemaks/i],
    category: 'taxation',
  },
  'business.register': {
    patterns: [/register.*company|start.*business|incorporate/i, /oü|as.*company/i],
    category: 'business-registration',
  },
  'healthcare.ehic': {
    patterns: [/health.*insurance|ehic|european.*health/i],
    category: 'healthcare',
  },
  'id.apply': {
    patterns: [/id.?card|passport|identity.*document/i],
    category: 'id-documents',
  },
  'general.help': {
    patterns: [/help|assist|support|question/i],
    category: 'general',
  },
};

// Multi-lingual greeting patterns
const GREETING_PATTERNS: Record<string, RegExp> = {
  en: /^(hi|hello|hey|good\s+(morning|afternoon|evening)|greetings)/i,
  et: /^(tere|hei|tsau|head\s+(hommikut|päeva|õhtut))/i,
  ru: /^(привет|здравствуй|добрый\s+(день|вечер|утро))/i,
  de: /^(hallo|guten\s+(tag|morgen|abend))/i,
  fr: /^(bonjour|salut|bonsoir)/i,
  es: /^(hola|buenos\s+(días|tardes|noches))/i,
};

// Service information database
const SERVICE_INFO: Record<ServiceCategory, { title: string; description: string; url: string }> = {
  'e-residency': {
    title: 'e-Residency Program',
    description: 'Start and run an EU-based company 100% online',
    url: 'https://e-resident.gov.ee',
  },
  immigration: {
    title: 'Immigration & Visas',
    description: 'Work permits, residence permits, and visa information',
    url: 'https://www.politsei.ee/en/instructions/migration',
  },
  taxation: {
    title: 'Tax and Customs Board',
    description: 'File taxes, VAT registration, and tax residency',
    url: 'https://www.emta.ee/en',
  },
  healthcare: {
    title: 'Health Insurance Fund',
    description: 'Health insurance and European Health Insurance Card',
    url: 'https://www.haigekassa.ee/en',
  },
  education: {
    title: 'Education in Estonia',
    description: 'Schools, universities, and educational services',
    url: 'https://www.studyinestonia.ee',
  },
  'business-registration': {
    title: 'Business Registration',
    description: 'Register and manage companies in Estonia',
    url: 'https://www.rik.ee/en/e-business-register',
  },
  'id-documents': {
    title: 'ID Documents',
    description: 'ID cards, passports, and digital identity',
    url: 'https://www.politsei.ee/en/instructions/documents',
  },
  'social-services': {
    title: 'Social Services',
    description: 'Social benefits and support services',
    url: 'https://www.sotsiaalkindlustusamet.ee/en',
  },
  general: {
    title: 'Estonia.ee Portal',
    description: 'Central gateway to Estonian public services',
    url: 'https://www.estonia.ee',
  },
};

export class ConversationalAI {
  private sessions: Map<string, ConversationContext>;
  private maxHistoryLength: number;

  constructor(maxHistoryLength = 50) {
    this.sessions = new Map();
    this.maxHistoryLength = maxHistoryLength;
  }

  /**
   * Process user message and generate response
   */
  async processMessage(
    sessionId: string,
    message: string,
    language = 'en'
  ): Promise<ConversationResponse> {
    const context = this.getOrCreateSession(sessionId, language);

    // Add user message to history
    this.addToHistory(context, {
      id: this.generateId(),
      role: 'user',
      content: message,
      language,
      timestamp: new Date(),
    });

    // Detect intent and extract entities
    const intent = this.detectIntent(message);
    const entities = this.extractEntities(message);

    if (intent) {
      context.intents.push(intent);
      context.serviceCategory = INTENT_PATTERNS[intent.name]?.category;
    }
    context.entities.push(...entities);

    // Generate response
    const response = await this.generateResponse(context, message, intent);

    // Add assistant response to history
    this.addToHistory(context, {
      id: this.generateId(),
      role: 'assistant',
      content: response.text,
      language: response.language,
      timestamp: new Date(),
    });

    return response;
  }

  /**
   * Get conversation history
   */
  getHistory(sessionId: string): ConversationMessage[] {
    return this.sessions.get(sessionId)?.history || [];
  }

  /**
   * Clear conversation session
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Set user's preferred language
   */
  setPreferredLanguage(sessionId: string, language: string): void {
    const context = this.sessions.get(sessionId);
    if (context) {
      context.preferredLanguage = language;
      context.language = language;
    }
  }

  /**
   * Get available service categories
   */
  getServiceCategories(): Array<{ id: ServiceCategory; title: string; description: string }> {
    return Object.entries(SERVICE_INFO).map(([id, info]) => ({
      id: id as ServiceCategory,
      title: info.title,
      description: info.description,
    }));
  }

  // Private methods

  private getOrCreateSession(sessionId: string, language: string): ConversationContext {
    let context = this.sessions.get(sessionId);
    if (!context) {
      context = {
        sessionId,
        language,
        history: [],
        entities: [],
        intents: [],
        slots: {},
      };
      this.sessions.set(sessionId, context);
    }
    return context;
  }

  private addToHistory(context: ConversationContext, message: ConversationMessage): void {
    context.history.push(message);
    if (context.history.length > this.maxHistoryLength) {
      context.history = context.history.slice(-this.maxHistoryLength);
    }
  }

  private detectIntent(message: string): DetectedIntent | null {
    for (const [intentName, config] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(message)) {
          return {
            name: intentName,
            confidence: 0.85,
            parameters: {},
          };
        }
      }
    }
    return null;
  }

  private extractEntities(message: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Email extraction
    const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      entities.push({
        type: 'email',
        value: emailMatch[0],
        confidence: 0.95,
        position: { start: emailMatch.index!, end: emailMatch.index! + emailMatch[0].length },
      });
    }

    // Estonian ID code extraction (isikukood)
    const idMatch = message.match(/[1-6]\d{2}[01]\d[0-3]\d{5}/);
    if (idMatch) {
      entities.push({
        type: 'estonian_id',
        value: idMatch[0],
        confidence: 0.9,
        position: { start: idMatch.index!, end: idMatch.index! + idMatch[0].length },
      });
    }

    // Date extraction
    const dateMatch = message.match(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/);
    if (dateMatch) {
      entities.push({
        type: 'date',
        value: dateMatch[0],
        confidence: 0.8,
        position: { start: dateMatch.index!, end: dateMatch.index! + dateMatch[0].length },
      });
    }

    return entities;
  }

  private async generateResponse(
    context: ConversationContext,
    message: string,
    intent: DetectedIntent | null
  ): Promise<ConversationResponse> {
    const language = context.preferredLanguage || context.language;

    // Check for greeting
    for (const [lang, pattern] of Object.entries(GREETING_PATTERNS)) {
      if (pattern.test(message)) {
        return this.getGreetingResponse(language);
      }
    }

    // Intent-based response
    if (intent) {
      return this.getIntentResponse(intent, language);
    }

    // Default response
    return {
      text: this.getLocalizedText('default_help', language),
      language,
      suggestedActions: this.getDefaultSuggestions(language),
    };
  }

  private getGreetingResponse(language: string): ConversationResponse {
    const greetings: Record<string, string> = {
      en: "Hello! Welcome to Estonia's digital services assistant. How can I help you today? I can assist with e-Residency, immigration, taxation, business registration, and more.",
      et: 'Tere! Tere tulemast Eesti digitaalsete teenuste abimehele. Kuidas saan teid aidata? Aitan e-residentsuse, sisserände, maksude, ettevõtte registreerimise ja muu osas.',
      ru: 'Здравствуйте! Добро пожаловать в помощник цифровых услуг Эстонии. Чем могу помочь? Я могу помочь с э-резидентством, иммиграцией, налогами, регистрацией бизнеса и другими вопросами.',
      de: 'Hallo! Willkommen beim digitalen Serviceassistenten Estlands. Wie kann ich Ihnen helfen? Ich kann bei e-Residency, Einwanderung, Steuern, Unternehmensregistrierung und mehr helfen.',
      fr: "Bonjour! Bienvenue sur l'assistant des services numériques de l'Estonie. Comment puis-je vous aider? Je peux vous aider avec l'e-Résidence, l'immigration, les impôts, l'enregistrement d'entreprise et plus encore.",
    };

    return {
      text: greetings[language] || greetings.en,
      language,
      suggestedActions: this.getDefaultSuggestions(language),
    };
  }

  private getIntentResponse(intent: DetectedIntent, language: string): ConversationResponse {
    const category = INTENT_PATTERNS[intent.name]?.category || 'general';
    const serviceInfo = SERVICE_INFO[category];

    const responses: Record<string, string> = {
      en: `I can help you with ${serviceInfo.title}. ${serviceInfo.description}. Would you like me to guide you through the process, or would you prefer to visit the official portal?`,
      et: `Saan teid aidata teenusega: ${serviceInfo.title}. ${serviceInfo.description}. Kas soovite, et juhendaksin teid protsessi läbi, või eelistate külastada ametlikku portaali?`,
      ru: `Я могу помочь вам с ${serviceInfo.title}. ${serviceInfo.description}. Хотите, чтобы я провел вас через процесс, или вы предпочитаете посетить официальный портал?`,
    };

    return {
      text: responses[language] || responses.en,
      language,
      intent,
      suggestedActions: [
        {
          type: 'link',
          title: `Visit ${serviceInfo.title}`,
          url: serviceInfo.url,
          description: serviceInfo.description,
        },
        {
          type: 'faq',
          title: 'Frequently Asked Questions',
          description: `Common questions about ${serviceInfo.title}`,
        },
        {
          type: 'appointment',
          title: 'Book an Appointment',
          description: 'Schedule a consultation with a specialist',
        },
      ],
    };
  }

  private getLocalizedText(key: string, language: string): string {
    const texts: Record<string, Record<string, string>> = {
      default_help: {
        en: "I'm here to help you access Estonian public services. You can ask about e-Residency, immigration, taxation, healthcare, education, or business registration. What would you like to know?",
        et: 'Olen siin, et aidata teil pääseda Eesti avalikele teenustele. Võite küsida e-residentsuse, sisserände, maksude, tervishoiu, hariduse või ettevõtte registreerimise kohta. Mida sooviksite teada?',
        ru: 'Я здесь, чтобы помочь вам получить доступ к государственным услугам Эстонии. Вы можете спросить об э-резидентстве, иммиграции, налогах, здравоохранении, образовании или регистрации бизнеса. Что бы вы хотели узнать?',
      },
    };

    return texts[key]?.[language] || texts[key]?.en || '';
  }

  private getDefaultSuggestions(language: string): SuggestedAction[] {
    return [
      {
        type: 'link',
        title: 'e-Residency',
        url: 'https://e-resident.gov.ee',
        description: 'Start a business in Estonia',
      },
      {
        type: 'link',
        title: 'Immigration',
        url: 'https://www.politsei.ee/en/instructions/migration',
        description: 'Visas and residence permits',
      },
      {
        type: 'link',
        title: 'Tax Services',
        url: 'https://www.emta.ee/en',
        description: 'File taxes and VAT',
      },
      {
        type: 'link',
        title: 'estonia.ee',
        url: 'https://www.estonia.ee',
        description: 'All public services portal',
      },
    ];
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const conversationalAI = new ConversationalAI();
