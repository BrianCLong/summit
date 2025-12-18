/**
 * Copilot i18n Integration Adapter
 *
 * Provides language detection and translation capabilities for the Copilot service.
 * Ensures that Copilot can handle multilingual queries and responses.
 */

import type {
  LanguageCode,
  TranslationContext,
  TranslationResult,
} from '../../types/index.js';
import { getTranslationService } from '../../lib/translation-service.js';
import { getLanguageDetector } from '../../lib/language-detector.js';
import { MessageId, getSystemMessage } from '../../../packages/i18n/src/system-messages/index.js';

export interface CopilotMessage {
  content: string;
  language?: LanguageCode;
  metadata?: {
    userId?: string;
    entityId?: string;
    classificationTags?: string[];
    [key: string]: any;
  };
}

export interface CopilotTranslationResult {
  originalContent: string;
  translatedContent: string;
  detectedLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  wasTranslated: boolean;
  policyAllowed: boolean;
  policyReason?: string;
}

/**
 * Copilot i18n Adapter
 *
 * Handles language detection and translation for Copilot interactions.
 */
export class CopilotI18nAdapter {
  private defaultUserLanguage: LanguageCode;
  private defaultCopilotLanguage: LanguageCode;

  constructor(
    defaultUserLanguage: LanguageCode = 'en',
    defaultCopilotLanguage: LanguageCode = 'en'
  ) {
    this.defaultUserLanguage = defaultUserLanguage;
    this.defaultCopilotLanguage = defaultCopilotLanguage;
  }

  /**
   * Detect language of user query
   */
  async detectQueryLanguage(query: string): Promise<LanguageCode> {
    const detector = getLanguageDetector();
    const detection = await detector.detect(query);
    return detection.language;
  }

  /**
   * Translate user query to Copilot's language
   *
   * This allows Copilot to process queries in its native language
   * while preserving the user's original language for context.
   */
  async translateUserQuery(
    message: CopilotMessage,
    targetLanguage?: LanguageCode
  ): Promise<CopilotTranslationResult> {
    const translationService = await getTranslationService();

    // Detect source language if not provided
    let sourceLanguage = message.language;
    if (!sourceLanguage) {
      sourceLanguage = await this.detectQueryLanguage(message.content);
    }

    const target = targetLanguage || this.defaultCopilotLanguage;

    // Check if translation is needed
    if (sourceLanguage === target) {
      return {
        originalContent: message.content,
        translatedContent: message.content,
        detectedLanguage: sourceLanguage,
        targetLanguage: target,
        wasTranslated: false,
        policyAllowed: true,
      };
    }

    // Translate with policy enforcement
    const context: TranslationContext = {
      sourceLanguage,
      targetLanguage: target,
      userId: message.metadata?.userId,
      entityId: message.metadata?.entityId,
      metadata: {
        ...message.metadata,
        purpose: 'copilot_query',
      },
    };

    const result = await translationService.translate(message.content, context);

    return {
      originalContent: message.content,
      translatedContent: result.translatedText,
      detectedLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      wasTranslated: result.wasTranslated,
      policyAllowed: result.policyResult.allowed,
      policyReason: result.policyResult.reason,
    };
  }

  /**
   * Translate Copilot response to user's language
   */
  async translateCopilotResponse(
    response: string,
    userLanguage: LanguageCode,
    metadata?: {
      userId?: string;
      entityId?: string;
      classificationTags?: string[];
    }
  ): Promise<CopilotTranslationResult> {
    const translationService = await getTranslationService();

    // Copilot responses are typically in the default language
    const sourceLanguage = this.defaultCopilotLanguage;

    // Check if translation is needed
    if (sourceLanguage === userLanguage) {
      return {
        originalContent: response,
        translatedContent: response,
        detectedLanguage: sourceLanguage,
        targetLanguage: userLanguage,
        wasTranslated: false,
        policyAllowed: true,
      };
    }

    // Translate with policy enforcement
    const context: TranslationContext = {
      sourceLanguage,
      targetLanguage: userLanguage,
      userId: metadata?.userId,
      entityId: metadata?.entityId,
      metadata: {
        ...metadata,
        purpose: 'copilot_response',
      },
    };

    const result = await translationService.translate(response, context);

    return {
      originalContent: response,
      translatedContent: result.translatedText,
      detectedLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      wasTranslated: result.wasTranslated,
      policyAllowed: result.policyResult.allowed,
      policyReason: result.policyResult.reason,
    };
  }

  /**
   * Get localized system message for Copilot
   *
   * Returns appropriate refusal/guardrail messages in user's language
   */
  getLocalizedSystemMessage(
    messageId: MessageId,
    userLanguage: LanguageCode,
    params?: Record<string, string | number>
  ): string {
    // In production, this would use the full i18n system
    // For now, return English message
    // TODO: Integrate with i18n message catalog
    return getSystemMessage(messageId, params);
  }

  /**
   * Get localized refusal message
   */
  getRefusalMessage(
    reason: 'harmful' | 'private' | 'policy',
    userLanguage: LanguageCode
  ): string {
    const messageIdMap = {
      harmful: MessageId.COPILOT_REFUSAL_HARMFUL,
      private: MessageId.COPILOT_REFUSAL_PRIVATE,
      policy: MessageId.COPILOT_REFUSAL_POLICY,
    };

    return this.getLocalizedSystemMessage(
      messageIdMap[reason],
      userLanguage
    );
  }

  /**
   * Get localized guardrail message
   */
  getGuardrailMessage(
    type: 'classification' | 'sensitive',
    userLanguage: LanguageCode
  ): string {
    const messageIdMap = {
      classification: MessageId.COPILOT_GUARDRAIL_CLASSIFICATION,
      sensitive: MessageId.COPILOT_GUARDRAIL_SENSITIVE,
    };

    return this.getLocalizedSystemMessage(messageIdMap[type], userLanguage);
  }

  /**
   * Handle multilingual conversation flow
   *
   * This orchestrates the full translation flow:
   * 1. Detect user query language
   * 2. Translate query to Copilot language if needed
   * 3. Process with Copilot (external)
   * 4. Translate response back to user language
   */
  async handleMultilingualConversation(
    userQuery: CopilotMessage,
    copilotResponseGenerator: (translatedQuery: string) => Promise<string>,
    userLanguage?: LanguageCode
  ): Promise<{
    query: CopilotTranslationResult;
    response: CopilotTranslationResult;
    userLanguage: LanguageCode;
  }> {
    // Detect user language if not provided
    const detectedLanguage = userLanguage || await this.detectQueryLanguage(userQuery.content);

    // Translate query to Copilot language
    const translatedQuery = await this.translateUserQuery(userQuery, this.defaultCopilotLanguage);

    // Generate Copilot response (in Copilot's language)
    const copilotResponse = await copilotResponseGenerator(translatedQuery.translatedContent);

    // Translate response back to user language
    const translatedResponse = await this.translateCopilotResponse(
      copilotResponse,
      detectedLanguage,
      userQuery.metadata
    );

    return {
      query: translatedQuery,
      response: translatedResponse,
      userLanguage: detectedLanguage,
    };
  }
}

/**
 * Singleton instance
 */
let adapterInstance: CopilotI18nAdapter | null = null;

/**
 * Get Copilot i18n adapter instance
 */
export function getCopilotI18nAdapter(
  defaultUserLanguage?: LanguageCode,
  defaultCopilotLanguage?: LanguageCode
): CopilotI18nAdapter {
  if (!adapterInstance) {
    adapterInstance = new CopilotI18nAdapter(
      defaultUserLanguage,
      defaultCopilotLanguage
    );
  }
  return adapterInstance;
}
