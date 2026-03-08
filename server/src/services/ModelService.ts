// server/src/services/ModelService.ts
import { AppError } from '../lib/errors';

/**
 * @interface ModelProvider
 * @description Defines the interface for a model provider that can perform analysis.
 */
interface ModelProvider {
  analyze(question: string, context: any): Promise<{ recommendation: string; rationale: string; }>;
}

/**
 * @class MockModelProvider
 * @implements ModelProvider
 * @description A mock provider that returns a static response for testing and development.
 */
class MockModelProvider implements ModelProvider {
  async analyze(question: string, context: any): Promise<{ recommendation: string; rationale: string; }> {
    console.log(`[MockModelProvider] Analyzing question: "${question}"`);
    return Promise.resolve({
      recommendation: `Based on the mock analysis, the recommended action is to proceed with the default option.`,
      rationale: `This recommendation is based on a static mock provider and does not reflect real-world analysis. Context provided: ${Object.keys(context).join(', ')}.`,
    });
  }
}

/**
 * @class RealLLMProvider
 * @implements ModelProvider
 * @description A placeholder provider for a real Large Language Model.
 * In a production scenario, this class would contain the logic to call an external
 * AI service (e.g., OpenAI, Anthropic) via an SDK or REST API.
 */
class RealLLMProvider implements ModelProvider {
  async analyze(question: string, context: any): Promise<{ recommendation: string; rationale: string; }> {
    console.log(`[RealLLMProvider] Analyzing question: "${question}"`);
    // Placeholder for real LLM API call
    // Example:
    // const response = await openai.chat.completions.create({ ... });
    // return { recommendation: response.choices[0]..., rationale: ... };
    throw new AppError('RealLLMProvider not implemented', 501);
  }
}

/**
 * @class ModelService
 * @description A configurable service that provides access to a model provider for decision analysis.
 * It can be configured via environment variables to use a mock or a real provider.
 */
class ModelService {
  private provider: ModelProvider;

  constructor() {
    const providerType = process.env.MODEL_PROVIDER || 'mock';
    if (providerType === 'real') {
      this.provider = new RealLLMProvider();
    } else {
      this.provider = new MockModelProvider();
    }
    console.log(`ModelService initialized with provider: ${providerType}`);
  }

  /**
   * Forwards the analysis request to the configured model provider.
   */
  async analyze(question: string, context: any): Promise<{ recommendation: string; rationale: string; }> {
    return this.provider.analyze(question, context);
  }
}

// Export a singleton instance of the ModelService
export const modelService = new ModelService();
