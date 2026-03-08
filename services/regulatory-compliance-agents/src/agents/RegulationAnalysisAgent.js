"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegulationAnalysisAgent = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const openai_1 = __importDefault(require("openai"));
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createAgentLogger)('RegulationAnalysisAgent');
const ANALYSIS_PROMPT = `You are a regulatory compliance expert. Analyze the following regulation and provide a structured analysis.

Regulation Title: {title}
Jurisdiction: {jurisdiction}
Regulatory Body: {regulatoryBody}
Published Date: {publishedDate}
Summary: {summary}

Provide analysis in the following JSON format:
{
  "classification": {
    "primaryCategory": "e.g., data_privacy, financial, healthcare, cybersecurity, environmental",
    "subcategories": ["list of specific areas"],
    "industries": ["affected industries"],
    "dataTypes": ["types of data covered if applicable"]
  },
  "keyRequirements": [
    {
      "id": "REQ-001",
      "requirement": "description",
      "mandatory": true/false,
      "deadline": "if applicable",
      "penaltyForNonCompliance": "if specified"
    }
  ],
  "affectedEntities": [
    {
      "entityType": "e.g., data_controller, financial_institution",
      "description": "who this applies to",
      "obligations": ["list of obligations"]
    }
  ],
  "crossBorderImplications": {
    "hasImplications": true/false,
    "affectedJurisdictions": ["list"],
    "harmonizationNotes": "notes on alignment with other regulations"
  },
  "summary": {
    "executiveSummary": "2-3 sentence high-level summary",
    "technicalSummary": "technical implementation considerations",
    "complianceTimeline": "key dates and phases"
  },
  "confidence": 0.0-1.0
}`;
/**
 * RegulationAnalysisAgent - Uses AI/ML to analyze, classify, and extract
 * key requirements from detected regulations. Identifies affected industries,
 * cross-border implications, and compliance timelines.
 */
class RegulationAnalysisAgent extends events_1.EventEmitter {
    openai = null;
    analysisCache = new Map();
    processingQueue = [];
    isProcessing = false;
    constructor() {
        super();
        this.initializeAI();
    }
    initializeAI() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new openai_1.default({ apiKey });
            logger.info('OpenAI client initialized');
        }
        else {
            logger.warn('OPENAI_API_KEY not set - using rule-based analysis fallback');
        }
    }
    /**
     * Queue a regulation for analysis
     */
    async queueForAnalysis(regulation) {
        this.processingQueue.push(regulation);
        logger.debug({ regulationId: regulation.id, queueSize: this.processingQueue.length }, 'Queued for analysis');
        if (!this.isProcessing) {
            this.processQueue();
        }
    }
    /**
     * Process the analysis queue
     */
    async processQueue() {
        this.isProcessing = true;
        while (this.processingQueue.length > 0) {
            const regulation = this.processingQueue.shift();
            try {
                const result = await this.analyzeRegulation(regulation);
                this.emitAnalysisComplete(regulation, result);
            }
            catch (error) {
                logger.error({ regulationId: regulation.id, error }, 'Analysis failed');
            }
        }
        this.isProcessing = false;
    }
    /**
     * Analyze a single regulation
     */
    async analyzeRegulation(regulation) {
        // Check cache
        if (this.analysisCache.has(regulation.id)) {
            logger.debug({ regulationId: regulation.id }, 'Returning cached analysis');
            return this.analysisCache.get(regulation.id);
        }
        logger.info({ regulationId: regulation.id, title: regulation.title }, 'Analyzing regulation');
        let result;
        if (this.openai) {
            result = await this.analyzeWithAI(regulation);
        }
        else {
            result = this.analyzeWithRules(regulation);
        }
        this.analysisCache.set(regulation.id, result);
        return result;
    }
    /**
     * AI-powered analysis using OpenAI
     */
    async analyzeWithAI(regulation) {
        const prompt = ANALYSIS_PROMPT
            .replace('{title}', regulation.title)
            .replace('{jurisdiction}', regulation.jurisdiction)
            .replace('{regulatoryBody}', regulation.regulatoryBody)
            .replace('{publishedDate}', regulation.publishedDate.toISOString())
            .replace('{summary}', regulation.summary || 'No summary available');
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.3,
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from AI');
        }
        const parsed = JSON.parse(content);
        return {
            regulationId: regulation.id,
            classification: parsed.classification,
            keyRequirements: parsed.keyRequirements || [],
            affectedEntities: parsed.affectedEntities || [],
            crossBorderImplications: parsed.crossBorderImplications || {
                hasImplications: false,
                affectedJurisdictions: [],
                harmonizationNotes: '',
            },
            summary: parsed.summary,
            confidence: parsed.confidence || 0.8,
            analyzedAt: new Date(),
        };
    }
    /**
     * Rule-based analysis fallback
     */
    analyzeWithRules(regulation) {
        const title = regulation.title.toLowerCase();
        const summary = (regulation.summary || '').toLowerCase();
        const combined = `${title} ${summary}`;
        // Category detection rules
        const categories = {
            data_privacy: ['gdpr', 'privacy', 'personal data', 'data protection', 'ccpa', 'cpra'],
            financial: ['sec', 'finra', 'banking', 'securities', 'investment', 'aml', 'kyc'],
            healthcare: ['hipaa', 'healthcare', 'medical', 'patient', 'phi', 'health data'],
            cybersecurity: ['cyber', 'security', 'breach', 'nist', 'encryption', 'vulnerability'],
            ai_regulation: ['ai act', 'artificial intelligence', 'machine learning', 'algorithm'],
            environmental: ['esg', 'climate', 'environmental', 'sustainability', 'carbon'],
        };
        let primaryCategory = 'general';
        const subcategories = [];
        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(kw => combined.includes(kw))) {
                if (primaryCategory === 'general') {
                    primaryCategory = category;
                }
                else {
                    subcategories.push(category);
                }
            }
        }
        // Industry detection
        const industries = [];
        const industryKeywords = {
            technology: ['technology', 'software', 'digital', 'platform', 'tech'],
            finance: ['bank', 'financial', 'insurance', 'investment'],
            healthcare: ['healthcare', 'hospital', 'medical', 'pharmaceutical'],
            retail: ['retail', 'ecommerce', 'consumer', 'merchant'],
        };
        for (const [industry, keywords] of Object.entries(industryKeywords)) {
            if (keywords.some(kw => combined.includes(kw))) {
                industries.push(industry);
            }
        }
        // Cross-border implications
        const euKeywords = ['eu', 'european', 'gdpr', 'eur-lex', 'brussels'];
        const crossBorder = {
            hasImplications: regulation.jurisdiction === 'EU' || euKeywords.some(kw => combined.includes(kw)),
            affectedJurisdictions: regulation.jurisdiction === 'EU' ? ['EU', 'UK', 'US'] : [regulation.jurisdiction],
            harmonizationNotes: regulation.jurisdiction === 'EU'
                ? 'May require alignment with local data protection laws'
                : '',
        };
        return {
            regulationId: regulation.id,
            classification: {
                primaryCategory,
                subcategories,
                industries: industries.length > 0 ? industries : ['all'],
                dataTypes: primaryCategory === 'data_privacy' ? ['personal_data', 'sensitive_data'] : [],
            },
            keyRequirements: [{
                    id: 'REQ-001',
                    requirement: `Review and assess compliance with ${regulation.title}`,
                    mandatory: true,
                }],
            affectedEntities: [{
                    entityType: 'organization',
                    description: 'All organizations within scope',
                    obligations: ['Review regulation', 'Assess applicability', 'Implement controls'],
                }],
            crossBorderImplications: crossBorder,
            summary: {
                executiveSummary: `New regulation from ${regulation.regulatoryBody}: ${regulation.title}`,
                technicalSummary: 'Technical assessment pending detailed review',
                complianceTimeline: regulation.effectiveDate
                    ? `Effective: ${regulation.effectiveDate.toISOString().split('T')[0]}`
                    : 'Timeline to be determined',
            },
            confidence: 0.6, // Lower confidence for rule-based
            analyzedAt: new Date(),
        };
    }
    /**
     * Emit analysis complete event
     */
    emitAnalysisComplete(regulation, result) {
        const event = {
            id: (0, uuid_1.v4)(),
            type: 'analysis_complete',
            payload: { regulation, analysis: result },
            timestamp: new Date(),
            agentId: 'RegulationAnalysisAgent',
        };
        logger.info({
            regulationId: regulation.id,
            category: result.classification.primaryCategory,
            confidence: result.confidence,
        }, 'Analysis complete');
        this.emit('analysis_complete', event);
    }
    /**
     * Get analysis statistics
     */
    getStats() {
        return {
            cachedAnalyses: this.analysisCache.size,
            pendingAnalyses: this.processingQueue.length,
        };
    }
}
exports.RegulationAnalysisAgent = RegulationAnalysisAgent;
