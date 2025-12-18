import { securedLLM } from './SecuredLLMService.js';
import { promptRegistry } from '../prompts/registry.js';
import logger from '../utils/logger.js';

export interface ThreatModelInputs {
  serviceName: string;
  description: string;
  architecture: string;
  dataFlow: string;
}

export interface Threat {
  category: 'Spoofing' | 'Tampering' | 'Repudiation' | 'Information Disclosure' | 'Denial of Service' | 'Elevation of Privilege';
  description: string;
  impact: string;
  severity: 'High' | 'Medium' | 'Low';
  mitigation: string;
}

export interface ThreatModel {
  serviceName: string;
  analysisDate: string;
  trustBoundaries: string[];
  threats: Threat[];
  recommendations: string[];
}

export class ThreatModelingService {
  private static instance: ThreatModelingService;

  private constructor() {}

  public static getInstance(): ThreatModelingService {
    if (!ThreatModelingService.instance) {
      ThreatModelingService.instance = new ThreatModelingService();
    }
    return ThreatModelingService.instance;
  }

  /**
   * Generates a STRIDE threat model for a given microservice.
   *
   * @param inputs - Details about the microservice to analyze.
   * @param userId - ID of the user requesting the analysis (for audit logs).
   * @param tenantId - Tenant ID (for isolation).
   * @returns A promise resolving to the generated ThreatModel.
   */
  async generateThreatModel(
    inputs: ThreatModelInputs,
    userId?: string,
    tenantId?: string
  ): Promise<ThreatModel> {
    logger.info('Generating threat model', { serviceName: inputs.serviceName, userId, tenantId });

    try {
      // Ensure registry is initialized (idempotent if already done elsewhere, but good safety)
      // Note: promptRegistry.initialize() is async.
      // In a real app, this should be done at startup. We'll assume it's done or do a lazy check if possible.
      // However, registry.ts doesn't show a public initialized flag.
      // We will try to get the prompt, if null, try initializing.
      let promptConfig = promptRegistry.getPrompt('security.threat-model@v1');
      if (!promptConfig) {
        logger.warn('Prompt not found, attempting to initialize registry');
        await promptRegistry.initialize();
        promptConfig = promptRegistry.getPrompt('security.threat-model@v1');
        if (!promptConfig) {
           throw new Error('Prompt template security.threat-model@v1 not found after initialization');
        }
      }

      const promptText = promptRegistry.render('security.threat-model@v1', inputs);

      const response = await securedLLM.complete({
        prompt: promptText,
        userId,
        tenantId,
        privacyLevel: 'internal', // Architectural details are internal
        model: promptConfig.modelConfig.model,
        temperature: promptConfig.modelConfig.temperature,
        maxTokens: promptConfig.modelConfig.maxTokens,
      });

      if (!response.content) {
        throw new Error('Received empty response from LLM');
      }

      // Parse JSON from the response
      // The prompt asks for JSON, but LLMs might wrap it in markdown blocks (```json ... ```)
      // We should strip those if present.
      const jsonString = this.cleanJsonOutput(response.content);
      const threatModel = JSON.parse(jsonString) as ThreatModel;

      logger.info('Threat model generated successfully', {
        serviceName: inputs.serviceName,
        threatCount: threatModel.threats.length,
        auditId: response.audit_id,
      });

      return threatModel;
    } catch (error: any) {
      logger.error('Failed to generate threat model', {
        serviceName: inputs.serviceName,
        error: error.message,
      });
      throw error;
    }
  }

  private cleanJsonOutput(text: string): string {
    // Remove markdown code blocks if present
    let clean = text.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json/, '').replace(/```$/, '');
    } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```/, '').replace(/```$/, '');
    }
    return clean.trim();
  }
}

export const threatModelingService = ThreatModelingService.getInstance();
