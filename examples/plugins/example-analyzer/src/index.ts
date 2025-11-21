import { createPlugin, PluginPermission } from '@summit/plugin-sdk';
import {
  BaseAnalyzerExtension,
  AnalyzerInput,
  AnalyzerResult,
  Insight,
  Entity,
} from '@summit/extension-api';

/**
 * Example Sentiment Analyzer Plugin
 */
class SentimentAnalyzer extends BaseAnalyzerExtension {
  constructor() {
    super(
      'sentiment-analyzer',
      'Sentiment Analyzer',
      'Analyzes text sentiment and extracts key entities',
      ['text', 'document', 'message']
    );
  }

  async execute(input: AnalyzerInput): Promise<AnalyzerResult> {
    const text = typeof input.data === 'string' ? input.data : JSON.stringify(input.data);

    // Analyze sentiment (simplified - would use NLP library)
    const sentiment = this.analyzeSentiment(text);
    const entities = this.extractEntities(text);
    const keywords = this.extractKeywords(text);

    const insights: Insight[] = [
      {
        type: 'sentiment',
        description: `Overall sentiment: ${sentiment.label} (${(sentiment.score * 100).toFixed(1)}% confidence)`,
        confidence: sentiment.score,
        evidence: [sentiment.label],
      },
      {
        type: 'keywords',
        description: `Key topics: ${keywords.join(', ')}`,
        confidence: 0.8,
        evidence: keywords,
      },
    ];

    // Add entity insights
    if (entities.length > 0) {
      insights.push({
        type: 'entities',
        description: `Found ${entities.length} notable entities`,
        confidence: 0.85,
        evidence: entities.map(e => e.properties.name),
      });
    }

    return {
      insights,
      entities,
      relationships: [],
      confidence: sentiment.score,
      metadata: {
        wordCount: text.split(/\s+/).length,
        characterCount: text.length,
        processedAt: new Date().toISOString(),
      },
    };
  }

  private analyzeSentiment(text: string): { label: string; score: number } {
    // Simplified sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'wonderful', 'amazing'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'sad', 'poor', 'horrible'];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
    }

    if (positiveCount > negativeCount) {
      return { label: 'positive', score: 0.7 + (positiveCount / words.length) * 0.3 };
    } else if (negativeCount > positiveCount) {
      return { label: 'negative', score: 0.7 + (negativeCount / words.length) * 0.3 };
    }
    return { label: 'neutral', score: 0.8 };
  }

  private extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];

    // Simple entity extraction (would use NER library)
    const emailPattern = /[\w.-]+@[\w.-]+\.\w+/g;
    const emails = text.match(emailPattern) || [];
    for (const email of emails) {
      entities.push({
        id: `email-${entities.length}`,
        type: 'email',
        properties: { name: email, value: email },
      });
    }

    const urlPattern = /https?:\/\/[\w.-]+[/\w.-]*/g;
    const urls = text.match(urlPattern) || [];
    for (const url of urls) {
      entities.push({
        id: `url-${entities.length}`,
        type: 'url',
        properties: { name: url, value: url },
      });
    }

    // Extract capitalized phrases as potential named entities
    const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    const names = text.match(namePattern) || [];
    for (const name of [...new Set(names)].slice(0, 5)) {
      entities.push({
        id: `person-${entities.length}`,
        type: 'person',
        properties: { name },
      });
    }

    return entities;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'can', 'to', 'of',
      'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'and',
      'or', 'but', 'if', 'then', 'because', 'while', 'although', 'this',
      'that', 'these', 'those', 'it', 'its',
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    // Count word frequency
    const wordCount = new Map<string, number>();
    for (const word of words) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }

    // Return top keywords
    return [...wordCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
}

// Create and export the plugin
const sentimentAnalyzer = new SentimentAnalyzer();

export default createPlugin()
  .withMetadata({
    id: 'sentiment-analyzer',
    name: 'Sentiment Analyzer',
    version: '1.0.0',
    description: 'Analyzes text sentiment, extracts entities, and identifies keywords',
    author: {
      name: 'Summit Team',
      email: 'team@summit.dev',
    },
    license: 'MIT',
    category: 'analyzer',
  })
  .requiresEngine('>=1.0.0')
  .withMain('./dist/index.js')
  .requestPermissions(PluginPermission.READ_DATA)
  .withResources({
    maxMemoryMB: 128,
    maxCpuPercent: 30,
  })
  .providesExtensionPoint({
    id: 'sentiment-analyzer',
    type: 'analyzer',
  })
  .onInitialize(async (context) => {
    context.logger.info('Sentiment Analyzer initializing...');
  })
  .onStart(async () => {
    console.log('Sentiment Analyzer started');
  })
  .withHealthCheck(async () => ({
    healthy: true,
    message: 'Sentiment Analyzer is ready',
  }))
  .build();

export { SentimentAnalyzer };
