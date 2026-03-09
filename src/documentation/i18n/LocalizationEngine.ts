/**
 * Internationalization and Localization Framework
 *
 * Provides comprehensive i18n/l10n support including:
 * - Multi-language content management
 * - Automated translation workflows
 * - Locale-specific formatting
 * - Content synchronization across languages
 * - Translation memory and consistency checking
 * - Contributor translation workflows
 * - Quality assurance for translations
 * - Cultural adaptation and localization
 */

import { EventEmitter } from 'events';

export interface LocalizationConfig {
  defaultLocale: string;
  supportedLocales: LocaleConfig[];
  fallbackChain: string[];
  translationProviders: TranslationProvider[];
  contentDirectory: string;
  translationMemory: boolean;
  qualityAssurance: QAConfig;
  workflow: TranslationWorkflow;
  formatting: LocaleFormatting;
}

export interface LocaleConfig {
  code: string; // e.g., 'en-US', 'fr-FR', 'zh-CN'
  name: string;
  nativeName: string;
  rtl: boolean;
  pluralRules: PluralRule[];
  dateFormat: string;
  timeFormat: string;
  numberFormat: NumberFormatConfig;
  currency: string;
  timezone: string;
  culturalNotes?: string;
  translators: string[];
  completeness: number; // 0-100 percentage
  lastUpdated: Date;
}

export interface TranslationProvider {
  name: string;
  type: 'machine' | 'human' | 'hybrid';
  apiKey?: string;
  endpoint?: string;
  supportedLanguages: string[];
  quality: 'basic' | 'professional' | 'native';
  costPerWord?: number;
  turnaroundTime?: number; // in hours
}

export interface TranslatableContent {
  id: string;
  sourceLocale: string;
  sourcePath: string;
  contentType: 'markdown' | 'html' | 'json' | 'yaml';
  extractedStrings: TranslatableString[];
  metadata: ContentMetadata;
  translations: Map<string, TranslatedContent>;
  lastModified: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TranslatableString {
  id: string;
  key: string;
  sourceText: string;
  context?: string;
  maxLength?: number;
  notes?: string;
  variables?: Variable[];
  pluralForms?: PluralForm[];
  tags: string[];
  translatable: boolean;
}

export interface Variable {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency';
  format?: string;
  example?: string;
}

export interface PluralForm {
  rule: string; // e.g., 'zero', 'one', 'two', 'few', 'many', 'other'
  text: string;
}

export interface TranslatedContent {
  locale: string;
  translator: string;
  translatedStrings: Map<string, TranslatedString>;
  status: 'draft' | 'in_review' | 'approved' | 'published';
  quality: QualityScore;
  lastModified: Date;
  reviewComments: ReviewComment[];
}

export interface TranslatedString {
  stringId: string;
  translatedText: string;
  translator: string;
  translationMethod: 'machine' | 'human' | 'hybrid';
  confidence: number; // 0-1 scale
  alternatives?: string[];
  context?: string;
  approved: boolean;
  reviewNotes?: string;
}

export interface QualityScore {
  accuracy: number; // 0-100
  fluency: number; // 0-100
  consistency: number; // 0-100
  cultural: number; // 0-100
  overall: number; // 0-100
  issues: QualityIssue[];
}

export interface QualityIssue {
  type: 'terminology' | 'grammar' | 'cultural' | 'technical' | 'formatting';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion?: string;
  lineNumber?: number;
  stringId?: string;
}

export interface TranslationProject {
  id: string;
  name: string;
  description: string;
  sourceLocale: string;
  targetLocales: string[];
  content: string[];
  deadline?: Date;
  budget?: number;
  assignees: ProjectAssignee[];
  status: 'planning' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  progress: { [locale: string]: number };
  qualityGates: QualityGate[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectAssignee {
  userId: string;
  role: 'translator' | 'reviewer' | 'project_manager';
  locales: string[];
  assignedAt: Date;
}

export interface QualityGate {
  name: string;
  criteria: QualityCriterion[];
  required: boolean;
  passed?: boolean;
}

export interface QualityCriterion {
  metric: string;
  threshold: number;
  weight: number;
}

export interface TranslationMemory {
  id: string;
  sourceText: string;
  targetText: string;
  sourceLocale: string;
  targetLocale: string;
  context?: string;
  metadata: TMMetadata;
  similarity?: number;
  usage: number;
  lastUsed: Date;
}

export interface TMMetadata {
  domain: string;
  project: string;
  translator: string;
  approved: boolean;
  createdAt: Date;
  tags: string[];
}

export class LocalizationEngine extends EventEmitter {
  private config: LocalizationConfig;
  private translatableContent: Map<string, TranslatableContent> = new Map();
  private translationProjects: Map<string, TranslationProject> = new Map();
  private translationMemory: TranslationMemory[] = [];
  private qaEngine: QualityAssuranceEngine;
  private workflowManager: WorkflowManager;

  constructor(config: LocalizationConfig) {
    super();
    this.config = config;
    this.qaEngine = new QualityAssuranceEngine(config.qualityAssurance);
    this.workflowManager = new WorkflowManager(config.workflow);
  }

  /**
   * Initialize localization engine
   */
  public async initialize(): Promise<void> {
    console.log('🌍 Initializing localization engine...');

    try {
      // Load existing translations and memory
      await this.loadTranslationData();

      // Initialize translation providers
      await this.initializeProviders();

      // Set up content monitoring
      this.setupContentMonitoring();

      console.log('✅ Localization engine initialized');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize localization engine:', error);
      throw error;
    }
  }

  /**
   * Extract translatable strings from content
   */
  public async extractTranslatableStrings(
    contentPath: string,
    sourceLocale: string = this.config.defaultLocale,
  ): Promise<TranslatableContent> {
    console.log(`📝 Extracting strings from ${contentPath}...`);

    const content = await this.loadContentFile(contentPath);
    const contentType = this.detectContentType(contentPath);
    const extractor = this.getStringExtractor(contentType);

    const extractedStrings = await extractor.extract(content);

    const translatableContent: TranslatableContent = {
      id: this.generateContentId(contentPath),
      sourceLocale,
      sourcePath: contentPath,
      contentType,
      extractedStrings,
      metadata: await this.extractContentMetadata(content),
      translations: new Map(),
      lastModified: new Date(),
      priority: this.determinePriority(contentPath),
    };

    this.translatableContent.set(translatableContent.id, translatableContent);

    this.emit('strings_extracted', translatableContent);
    return translatableContent;
  }

  /**
   * Translate content to target locale
   */
  public async translateContent(
    contentId: string,
    targetLocale: string,
    method: 'machine' | 'human' | 'hybrid' = 'hybrid',
  ): Promise<TranslatedContent> {
    const content = this.translatableContent.get(contentId);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    console.log(`🔄 Translating ${content.sourcePath} to ${targetLocale}...`);

    const translatedContent: TranslatedContent = {
      locale: targetLocale,
      translator: method === 'machine' ? 'system' : 'human',
      translatedStrings: new Map(),
      status: 'draft',
      quality: {
        accuracy: 0,
        fluency: 0,
        consistency: 0,
        cultural: 0,
        overall: 0,
        issues: [],
      },
      lastModified: new Date(),
      reviewComments: [],
    };

    // Translate each string
    for (const string of content.extractedStrings) {
      if (string.translatable) {
        const translatedString = await this.translateString(
          string,
          content.sourceLocale,
          targetLocale,
          method,
        );
        translatedContent.translatedStrings.set(string.id, translatedString);
      }
    }

    // Run quality assurance
    const qaResult = await this.qaEngine.analyze(content, translatedContent);
    translatedContent.quality = qaResult;

    // Update translation memory
    await this.updateTranslationMemory(content, translatedContent);

    content.translations.set(targetLocale, translatedContent);

    this.emit('content_translated', contentId, targetLocale, translatedContent);
    return translatedContent;
  }

  /**
   * Create translation project
   */
  public createTranslationProject(
    name: string,
    description: string,
    contentIds: string[],
    targetLocales: string[],
    deadline?: Date,
  ): TranslationProject {
    const project: TranslationProject = {
      id: this.generateProjectId(),
      name,
      description,
      sourceLocale: this.config.defaultLocale,
      targetLocales,
      content: contentIds,
      deadline,
      assignees: [],
      status: 'planning',
      progress: {},
      qualityGates: this.createDefaultQualityGates(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Initialize progress tracking
    for (const locale of targetLocales) {
      project.progress[locale] = 0;
    }

    this.translationProjects.set(project.id, project);

    this.emit('project_created', project);
    return project;
  }

  /**
   * Generate localized output
   */
  public async generateLocalizedOutput(
    contentId: string,
    locale: string,
    outputFormat: 'html' | 'markdown' | 'json' = 'markdown',
  ): Promise<string> {
    const content = this.translatableContent.get(contentId);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const translation = content.translations.get(locale);
    if (!translation) {
      throw new Error(`Translation for ${locale} not found`);
    }

    const generator = this.getOutputGenerator(outputFormat);
    return await generator.generate(content, translation, locale);
  }

  /**
   * Synchronize translations with source changes
   */
  public async synchronizeTranslations(contentId: string): Promise<SyncResult> {
    const content = this.translatableContent.get(contentId);
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    console.log(`🔄 Synchronizing translations for ${content.sourcePath}...`);

    // Re-extract strings from updated source
    const updatedContent = await this.extractTranslatableStrings(
      content.sourcePath,
    );
    const changes = this.detectChanges(content, updatedContent);

    const syncResult: SyncResult = {
      contentId,
      addedStrings: changes.added.length,
      modifiedStrings: changes.modified.length,
      removedStrings: changes.removed.length,
      affectedLocales: Array.from(content.translations.keys()),
      requiresReview: changes.modified.length > 0 || changes.removed.length > 0,
    };

    // Update translations for each locale
    for (const [locale, translation] of content.translations) {
      await this.updateTranslation(translation, changes, locale);
    }

    // Update the stored content
    this.translatableContent.set(contentId, updatedContent);

    this.emit('translations_synchronized', syncResult);
    return syncResult;
  }

  /**
   * Get translation statistics
   */
  public getTranslationStatistics(locale?: string): TranslationStats {
    const stats: TranslationStats = {
      totalStrings: 0,
      translatedStrings: 0,
      approvedStrings: 0,
      pendingReview: 0,
      completeness: 0,
      qualityScore: 0,
      localeStats: {},
    };

    const locales = locale
      ? [locale]
      : this.config.supportedLocales.map((l) => l.code);

    for (const loc of locales) {
      const localeStats: LocaleStats = {
        totalStrings: 0,
        translatedStrings: 0,
        approvedStrings: 0,
        pendingReview: 0,
        completeness: 0,
        qualityScore: 0,
        lastUpdated: new Date(),
      };

      for (const content of this.translatableContent.values()) {
        const translation = content.translations.get(loc);
        if (translation) {
          localeStats.totalStrings += content.extractedStrings.length;
          localeStats.translatedStrings += translation.translatedStrings.size;
          localeStats.approvedStrings += Array.from(
            translation.translatedStrings.values(),
          ).filter((t) => t.approved).length;
          localeStats.pendingReview +=
            translation.status === 'in_review' ? 1 : 0;
        }
      }

      localeStats.completeness =
        localeStats.totalStrings > 0
          ? (localeStats.translatedStrings / localeStats.totalStrings) * 100
          : 0;

      stats.localeStats[loc] = localeStats;
    }

    // Calculate overall stats
    const allLocaleStats = Object.values(stats.localeStats);
    stats.totalStrings = Math.max(
      ...allLocaleStats.map((s) => s.totalStrings),
      0,
    );
    stats.translatedStrings = allLocaleStats.reduce(
      (sum, s) => sum + s.translatedStrings,
      0,
    );
    stats.approvedStrings = allLocaleStats.reduce(
      (sum, s) => sum + s.approvedStrings,
      0,
    );
    stats.completeness =
      allLocaleStats.reduce((sum, s) => sum + s.completeness, 0) /
      allLocaleStats.length;

    return stats;
  }

  /**
   * Search translation memory
   */
  public searchTranslationMemory(
    sourceText: string,
    sourceLocale: string,
    targetLocale: string,
    fuzzyThreshold: number = 0.7,
  ): TranslationMemory[] {
    return this.translationMemory
      .filter(
        (tm) =>
          tm.sourceLocale === sourceLocale && tm.targetLocale === targetLocale,
      )
      .map((tm) => ({
        ...tm,
        similarity: this.calculateSimilarity(sourceText, tm.sourceText),
      }))
      .filter((tm) => tm.similarity! >= fuzzyThreshold)
      .sort((a, b) => b.similarity! - a.similarity!);
  }

  /**
   * Export translations
   */
  public async exportTranslations(
    locale: string,
    format: 'json' | 'po' | 'xliff' | 'csv',
  ): Promise<string> {
    const exporter = this.getExporter(format);
    const translations: ExportTranslation[] = [];

    for (const content of this.translatableContent.values()) {
      const translation = content.translations.get(locale);
      if (translation) {
        for (const [
          stringId,
          translatedString,
        ] of translation.translatedStrings) {
          const sourceString = content.extractedStrings.find(
            (s) => s.id === stringId,
          );
          if (sourceString) {
            translations.push({
              key: sourceString.key,
              sourceText: sourceString.sourceText,
              translatedText: translatedString.translatedText,
              context: sourceString.context,
              approved: translatedString.approved,
            });
          }
        }
      }
    }

    return await exporter.export(translations, locale);
  }

  // Private methods
  private async loadTranslationData(): Promise<void> {
    // Load existing translation data from storage
  }

  private async initializeProviders(): Promise<void> {
    // Initialize translation service providers
  }

  private setupContentMonitoring(): void {
    // Set up file system monitoring for content changes
  }

  private async loadContentFile(path: string): Promise<string> {
    // Load content file from filesystem
    return '';
  }

  private detectContentType(path: string): TranslatableContent['contentType'] {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'md':
        return 'markdown';
      case 'html':
        return 'html';
      case 'json':
        return 'json';
      case 'yml':
      case 'yaml':
        return 'yaml';
      default:
        return 'markdown';
    }
  }

  private getStringExtractor(
    contentType: TranslatableContent['contentType'],
  ): StringExtractor {
    // Return appropriate string extractor based on content type
    return new MarkdownExtractor();
  }

  private async translateString(
    string: TranslatableString,
    sourceLocale: string,
    targetLocale: string,
    method: 'machine' | 'human' | 'hybrid',
  ): Promise<TranslatedString> {
    // Check translation memory first
    const tmMatches = this.searchTranslationMemory(
      string.sourceText,
      sourceLocale,
      targetLocale,
    );

    if (tmMatches.length > 0 && tmMatches[0].similarity! > 0.95) {
      return {
        stringId: string.id,
        translatedText: tmMatches[0].targetText,
        translator: 'tm',
        translationMethod: 'human',
        confidence: tmMatches[0].similarity!,
        approved: tmMatches[0].metadata.approved,
      };
    }

    // Use translation provider
    const provider = this.selectTranslationProvider(
      sourceLocale,
      targetLocale,
      method,
    );
    const translatedText = await provider.translate(
      string.sourceText,
      sourceLocale,
      targetLocale,
    );

    return {
      stringId: string.id,
      translatedText,
      translator: provider.name,
      translationMethod: method,
      confidence: method === 'machine' ? 0.7 : 0.9,
      approved: false,
    };
  }

  private selectTranslationProvider(
    sourceLocale: string,
    targetLocale: string,
    method: 'machine' | 'human' | 'hybrid',
  ): TranslationProvider {
    return (
      this.config.translationProviders.filter(
        (p) => p.type === method && p.supportedLanguages.includes(targetLocale),
      )[0] || this.config.translationProviders[0]
    );
  }

  private async updateTranslationMemory(
    content: TranslatableContent,
    translation: TranslatedContent,
  ): Promise<void> {
    for (const [stringId, translatedString] of translation.translatedStrings) {
      const sourceString = content.extractedStrings.find(
        (s) => s.id === stringId,
      );
      if (sourceString) {
        const tmEntry: TranslationMemory = {
          id: this.generateTMId(),
          sourceText: sourceString.sourceText,
          targetText: translatedString.translatedText,
          sourceLocale: content.sourceLocale,
          targetLocale: translation.locale,
          context: sourceString.context,
          metadata: {
            domain: 'documentation',
            project: content.sourcePath,
            translator: translatedString.translator,
            approved: translatedString.approved,
            createdAt: new Date(),
            tags: sourceString.tags,
          },
          usage: 1,
          lastUsed: new Date(),
        };

        this.translationMemory.push(tmEntry);
      }
    }
  }

  private generateContentId(path: string): string {
    return Buffer.from(path)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  private generateProjectId(): string {
    return 'project_' + Math.random().toString(36).substring(2, 15);
  }

  private generateTMId(): string {
    return 'tm_' + Math.random().toString(36).substring(2, 15);
  }

  private async extractContentMetadata(
    content: string,
  ): Promise<ContentMetadata> {
    return {
      wordCount: content.split(/\s+/).length,
      complexity: 'medium',
      domain: 'technical',
      tags: [],
    };
  }

  private determinePriority(path: string): TranslatableContent['priority'] {
    if (path.includes('README') || path.includes('getting-started')) {
      return 'critical';
    }
    if (path.includes('tutorial') || path.includes('guide')) {
      return 'high';
    }
    return 'medium';
  }

  private createDefaultQualityGates(): QualityGate[] {
    return [
      {
        name: 'Completeness',
        criteria: [{ metric: 'completeness', threshold: 100, weight: 1.0 }],
        required: true,
      },
      {
        name: 'Quality',
        criteria: [{ metric: 'overall_quality', threshold: 80, weight: 1.0 }],
        required: true,
      },
    ];
  }

  private getOutputGenerator(format: string): OutputGenerator {
    switch (format) {
      case 'html':
        return new HTMLGenerator();
      case 'json':
        return new JSONGenerator();
      default:
        return new MarkdownGenerator();
    }
  }

  private detectChanges(
    oldContent: TranslatableContent,
    newContent: TranslatableContent,
  ): ContentChanges {
    const oldStrings = new Map(
      oldContent.extractedStrings.map((s) => [s.key, s]),
    );
    const newStrings = new Map(
      newContent.extractedStrings.map((s) => [s.key, s]),
    );

    const added = newContent.extractedStrings.filter(
      (s) => !oldStrings.has(s.key),
    );
    const removed = oldContent.extractedStrings.filter(
      (s) => !newStrings.has(s.key),
    );
    const modified = newContent.extractedStrings.filter((s) => {
      const oldString = oldStrings.get(s.key);
      return oldString && oldString.sourceText !== s.sourceText;
    });

    return { added, removed, modified };
  }

  private async updateTranslation(
    translation: TranslatedContent,
    changes: ContentChanges,
    locale: string,
  ): Promise<void> {
    // Mark translation as needing review if there are changes
    if (changes.modified.length > 0 || changes.removed.length > 0) {
      translation.status = 'draft';
    }

    // Remove translations for removed strings
    for (const removedString of changes.removed) {
      translation.translatedStrings.delete(removedString.id);
    }

    translation.lastModified = new Date();
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple Levenshtein distance-based similarity
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private getExporter(format: string): TranslationExporter {
    switch (format) {
      case 'po':
        return new POExporter();
      case 'xliff':
        return new XLIFFExporter();
      case 'csv':
        return new CSVExporter();
      default:
        return new JSONExporter();
    }
  }
}

// Supporting classes and interfaces
class QualityAssuranceEngine {
  constructor(private config: QAConfig) {}

  async analyze(
    content: TranslatableContent,
    translation: TranslatedContent,
  ): Promise<QualityScore> {
    // Implementation for quality analysis
    return {
      accuracy: 85,
      fluency: 90,
      consistency: 88,
      cultural: 82,
      overall: 86,
      issues: [],
    };
  }
}

class WorkflowManager {
  constructor(private config: TranslationWorkflow) {}
}

abstract class StringExtractor {
  abstract extract(content: string): Promise<TranslatableString[]>;
}

class MarkdownExtractor extends StringExtractor {
  async extract(content: string): Promise<TranslatableString[]> {
    const strings: TranslatableString[] = [];

    // Extract headings
    const headingRegex = /^(#+)\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      strings.push({
        id: `heading_${strings.length}`,
        key: `heading_${match[2].toLowerCase().replace(/\s+/g, '_')}`,
        sourceText: match[2],
        context: 'heading',
        tags: ['heading'],
        translatable: true,
      });
    }

    // Extract paragraphs
    const paragraphRegex = /^([^#\n\r-*+>].*?)$/gm;
    while ((match = paragraphRegex.exec(content)) !== null) {
      if (match[1].trim()) {
        strings.push({
          id: `paragraph_${strings.length}`,
          key: `paragraph_${strings.length}`,
          sourceText: match[1].trim(),
          context: 'paragraph',
          tags: ['paragraph'],
          translatable: true,
        });
      }
    }

    return strings;
  }
}

abstract class OutputGenerator {
  abstract generate(
    content: TranslatableContent,
    translation: TranslatedContent,
    locale: string,
  ): Promise<string>;
}

class MarkdownGenerator extends OutputGenerator {
  async generate(
    content: TranslatableContent,
    translation: TranslatedContent,
    locale: string,
  ): Promise<string> {
    // Generate localized Markdown content
    let output = content.sourcePath; // Start with original content

    for (const [stringId, translatedString] of translation.translatedStrings) {
      const sourceString = content.extractedStrings.find(
        (s) => s.id === stringId,
      );
      if (sourceString) {
        output = output.replace(
          sourceString.sourceText,
          translatedString.translatedText,
        );
      }
    }

    return output;
  }
}

class HTMLGenerator extends OutputGenerator {
  async generate(
    content: TranslatableContent,
    translation: TranslatedContent,
    locale: string,
  ): Promise<string> {
    // Generate localized HTML content
    return '<html></html>';
  }
}

class JSONGenerator extends OutputGenerator {
  async generate(
    content: TranslatableContent,
    translation: TranslatedContent,
    locale: string,
  ): Promise<string> {
    const translations: { [key: string]: string } = {};

    for (const [stringId, translatedString] of translation.translatedStrings) {
      const sourceString = content.extractedStrings.find(
        (s) => s.id === stringId,
      );
      if (sourceString) {
        translations[sourceString.key] = translatedString.translatedText;
      }
    }

    return JSON.stringify(translations, null, 2);
  }
}

abstract class TranslationExporter {
  abstract export(
    translations: ExportTranslation[],
    locale: string,
  ): Promise<string>;
}

class JSONExporter extends TranslationExporter {
  async export(
    translations: ExportTranslation[],
    locale: string,
  ): Promise<string> {
    const output: { [key: string]: string } = {};

    for (const translation of translations) {
      output[translation.key] = translation.translatedText;
    }

    return JSON.stringify(output, null, 2);
  }
}

class POExporter extends TranslationExporter {
  async export(
    translations: ExportTranslation[],
    locale: string,
  ): Promise<string> {
    let output = `# Translation file for ${locale}\n\n`;

    for (const translation of translations) {
      if (translation.context) {
        output += `#. ${translation.context}\n`;
      }
      output += `msgid "${translation.sourceText}"\n`;
      output += `msgstr "${translation.translatedText}"\n\n`;
    }

    return output;
  }
}

class XLIFFExporter extends TranslationExporter {
  async export(
    translations: ExportTranslation[],
    locale: string,
  ): Promise<string> {
    // XLIFF format implementation
    return '<xliff></xliff>';
  }
}

class CSVExporter extends TranslationExporter {
  async export(
    translations: ExportTranslation[],
    locale: string,
  ): Promise<string> {
    let output = 'Key,Source,Translation,Context,Approved\n';

    for (const translation of translations) {
      output += `"${translation.key}","${translation.sourceText}","${translation.translatedText}","${translation.context || ''}","${translation.approved}"\n`;
    }

    return output;
  }
}

// Supporting interfaces
interface PluralRule {
  rule: string;
  condition: string;
}

interface NumberFormatConfig {
  decimal: string;
  thousands: string;
  precision: number;
}

interface ContentMetadata {
  wordCount: number;
  complexity: 'simple' | 'medium' | 'complex';
  domain: string;
  tags: string[];
}

interface ReviewComment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  resolved: boolean;
}

interface QAConfig {
  enabled: boolean;
  rules: string[];
  threshold: number;
}

interface TranslationWorkflow {
  steps: string[];
  approvalRequired: boolean;
  reviewers: string[];
}

interface LocaleFormatting {
  dateFormats: { [locale: string]: string };
  numberFormats: { [locale: string]: NumberFormatConfig };
}

interface SyncResult {
  contentId: string;
  addedStrings: number;
  modifiedStrings: number;
  removedStrings: number;
  affectedLocales: string[];
  requiresReview: boolean;
}

interface ContentChanges {
  added: TranslatableString[];
  modified: TranslatableString[];
  removed: TranslatableString[];
}

interface TranslationStats {
  totalStrings: number;
  translatedStrings: number;
  approvedStrings: number;
  pendingReview: number;
  completeness: number;
  qualityScore: number;
  localeStats: { [locale: string]: LocaleStats };
}

interface LocaleStats {
  totalStrings: number;
  translatedStrings: number;
  approvedStrings: number;
  pendingReview: number;
  completeness: number;
  qualityScore: number;
  lastUpdated: Date;
}

interface ExportTranslation {
  key: string;
  sourceText: string;
  translatedText: string;
  context?: string;
  approved: boolean;
}
