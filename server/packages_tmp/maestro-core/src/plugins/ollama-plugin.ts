/**
 * Ollama Step Plugin
 * Integrates with Ollama for local AI model execution with GPU-aware scheduling
 */

import axios, { AxiosInstance } from 'axios';
import { StepPlugin, RunContext, WorkflowStep, StepExecution } from '../engine';

export interface OllamaConfig {
  baseUrl: string;
  timeout?: number;
  maxConcurrentRequests?: number;
  gpuMemoryThreshold?: number; // MB, when to prefer smaller models
  autoModelSelection?: boolean;
}

export interface OllamaStepConfig {
  model: string;
  prompt?: string;
  messages?: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  template?: string;
  system?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
    top_k?: number;
    top_p?: number;
    repeat_last_n?: number;
    repeat_penalty?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    mirostat?: number;
    mirostat_tau?: number;
    mirostat_eta?: number;
    penalize_newline?: boolean;
    stop?: string[];
    numa?: boolean;
    num_ctx?: number;
    num_batch?: number;
    num_gqa?: number;
    num_gpu?: number;
    main_gpu?: number;
    low_vram?: boolean;
    f16_kv?: boolean;
    logits_all?: boolean;
    vocab_only?: boolean;
    use_mmap?: boolean;
    use_mlock?: boolean;
    embedding_only?: boolean;
    rope_frequency_base?: number;
    rope_frequency_scale?: number;
    num_thread?: number;
  };
  keep_alive?: string | number;
  fallback_models?: string[]; // Alternative models if primary fails
}

interface OllamaModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export class OllamaPlugin implements StepPlugin {
  name = 'ollama';
  private client: AxiosInstance;
  private config: OllamaConfig;
  private availableModels: Map<string, OllamaModelInfo> = new Map();
  private activeRequests = 0;

  constructor(config: OllamaConfig) {
    this.config = config;

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 300000, // 5 minutes default for local models
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Initialize model info
    this.refreshModelList().catch(console.error);
  }

  validate(config: any): void {
    const stepConfig = config as OllamaStepConfig;

    if (!stepConfig.model) {
      throw new Error('Ollama step requires model configuration');
    }

    // Validate that either prompt or messages are provided
    if (!stepConfig.prompt && !stepConfig.messages && !stepConfig.template) {
      throw new Error(
        'Ollama step requires either prompt, messages, or template',
      );
    }

    // Validate options
    if (stepConfig.options) {
      const opts = stepConfig.options;

      if (
        opts.temperature !== undefined &&
        (opts.temperature < 0 || opts.temperature > 2)
      ) {
        throw new Error('temperature must be between 0 and 2');
      }

      if (opts.top_p !== undefined && (opts.top_p < 0 || opts.top_p > 1)) {
        throw new Error('top_p must be between 0 and 1');
      }

      if (opts.num_ctx && opts.num_ctx > 32768) {
        console.warn('num_ctx > 32768 may cause high memory usage');
      }
    }
  }

  async execute(
    context: RunContext,
    step: WorkflowStep,
    execution: StepExecution,
  ): Promise<{
    output?: any;
    cost_usd?: number;
    metadata?: Record<string, any>;
  }> {
    const stepConfig = step.config as OllamaStepConfig;

    // Check concurrent request limits
    if (
      this.config.maxConcurrentRequests &&
      this.activeRequests >= this.config.maxConcurrentRequests
    ) {
      throw new Error('Maximum concurrent Ollama requests reached');
    }

    this.activeRequests++;

    try {
      // Auto-select model based on available resources if enabled
      const selectedModel = await this.selectOptimalModel(stepConfig);

      // Prepare the request payload
      const payload = this.preparePayload(stepConfig, selectedModel, context);

      // Make the request
      const startTime = Date.now();
      const response = await this.makeRequest(payload);
      const duration = Date.now() - startTime;

      // Extract response
      const result = this.extractResponse(response.data);

      // Calculate estimated cost (for local models, this is primarily compute time)
      const cost_usd = this.calculateComputeCost(duration, selectedModel);

      return {
        output: result,
        cost_usd,
        metadata: {
          model: selectedModel,
          original_model: stepConfig.model,
          duration_ms: duration,
          total_duration: response.data.total_duration,
          load_duration: response.data.load_duration,
          prompt_eval_count: response.data.prompt_eval_count,
          prompt_eval_duration: response.data.prompt_eval_duration,
          eval_count: response.data.eval_count,
          eval_duration: response.data.eval_duration,
          context: response.data.context,
        },
      };
    } catch (error) {
      // Try fallback models if configured
      if (stepConfig.fallback_models && stepConfig.fallback_models.length > 0) {
        return await this.executeWithFallback(
          stepConfig,
          context,
          execution,
          error as Error,
        );
      }

      throw new Error(`Ollama execution failed: ${(error as Error).message}`);
    } finally {
      this.activeRequests--;
    }
  }

  async compensate(
    context: RunContext,
    step: WorkflowStep,
    execution: StepExecution,
  ): Promise<void> {
    // For Ollama, compensation might involve:
    // 1. Cleaning up any cached context
    // 2. Releasing GPU memory if the model is no longer needed

    const stepConfig = step.config as OllamaStepConfig;

    try {
      // If keep_alive was set, we might want to explicitly unload the model
      if (stepConfig.keep_alive !== undefined) {
        await this.client.delete(`/api/generate`, {
          data: { name: stepConfig.model },
        });
      }
    } catch (error) {
      console.warn(`Ollama compensation warning: ${(error as Error).message}`);
    }
  }

  async getAvailableModels(): Promise<string[]> {
    await this.refreshModelList();
    return Array.from(this.availableModels.keys());
  }

  async pullModel(
    modelName: string,
    progressCallback?: (progress: any) => void,
  ): Promise<void> {
    const response = await this.client.post(
      '/api/pull',
      { name: modelName },
      {
        responseType: 'stream',
        timeout: 0, // No timeout for model downloads
      },
    );

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().trim().split('\n');

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (progressCallback) {
              progressCallback(data);
            }
            if (data.status === 'success') {
              resolve();
              return;
            }
            if (data.error) {
              reject(new Error(data.error));
              return;
            }
          } catch (e) {
            // Ignore parse errors for progress data
          }
        }
      });

      response.data.on('end', resolve);
      response.data.on('error', reject);
    });
  }

  private async selectOptimalModel(
    stepConfig: OllamaStepConfig,
  ): Promise<string> {
    if (!this.config.autoModelSelection) {
      return stepConfig.model;
    }

    // Get system resources
    const systemInfo = await this.getSystemInfo();

    // If GPU memory is limited, prefer smaller models
    if (
      systemInfo.gpu_memory_mb &&
      systemInfo.gpu_memory_mb < (this.config.gpuMemoryThreshold || 8192)
    ) {
      const smallerModel = this.findSmallerAlternative(stepConfig.model);
      if (smallerModel) {
        console.log(
          `Selected smaller model ${smallerModel} due to GPU memory constraints`,
        );
        return smallerModel;
      }
    }

    return stepConfig.model;
  }

  private async refreshModelList(): Promise<void> {
    try {
      const response = await this.client.get('/api/tags');
      const models = response.data.models || [];

      this.availableModels.clear();
      for (const model of models) {
        this.availableModels.set(model.name, model);
      }
    } catch (error) {
      console.error('Failed to refresh Ollama model list:', error);
    }
  }

  private preparePayload(
    stepConfig: OllamaStepConfig,
    model: string,
    context: RunContext,
  ): any {
    const payload: any = {
      model,
      stream: stepConfig.stream || false,
      raw: stepConfig.raw || false,
      format: stepConfig.format,
      options: stepConfig.options,
      keep_alive: stepConfig.keep_alive,
    };

    // Handle different input formats
    if (stepConfig.messages) {
      // Chat format
      payload.messages = stepConfig.messages;
    } else if (stepConfig.prompt) {
      // Simple prompt
      payload.prompt = stepConfig.prompt;
    } else if (stepConfig.template) {
      // Template with system message
      payload.template = stepConfig.template;
      payload.system = stepConfig.system;
    }

    // Add context if provided (for conversation continuity)
    if (stepConfig.context) {
      payload.context = stepConfig.context;
    }

    return payload;
  }

  private async makeRequest(payload: any): Promise<any> {
    const endpoint = payload.messages ? '/api/chat' : '/api/generate';
    return await this.client.post(endpoint, payload);
  }

  private extractResponse(responseData: any): any {
    if (responseData.message) {
      // Chat API response
      return {
        type: 'chat',
        content: responseData.message.content,
        role: responseData.message.role,
      };
    } else if (responseData.response) {
      // Generate API response
      return {
        type: 'generate',
        content: responseData.response,
      };
    }

    throw new Error('Invalid response format from Ollama');
  }

  private async executeWithFallback(
    stepConfig: OllamaStepConfig,
    context: RunContext,
    execution: StepExecution,
    originalError: Error,
  ): Promise<any> {
    for (const fallbackModel of stepConfig.fallback_models || []) {
      try {
        console.log(`Trying fallback model: ${fallbackModel}`);

        const fallbackConfig = { ...stepConfig, model: fallbackModel };
        const payload = this.preparePayload(
          fallbackConfig,
          fallbackModel,
          context,
        );

        const startTime = Date.now();
        const response = await this.makeRequest(payload);
        const duration = Date.now() - startTime;

        const result = this.extractResponse(response.data);
        const cost_usd = this.calculateComputeCost(duration, fallbackModel);

        return {
          output: result,
          cost_usd,
          metadata: {
            model: fallbackModel,
            original_model: stepConfig.model,
            fallback: true,
            original_error: originalError.message,
            duration_ms: duration,
          },
        };
      } catch (fallbackError) {
        console.log(
          `Fallback model ${fallbackModel} also failed:`,
          fallbackError,
        );
        continue;
      }
    }

    throw originalError;
  }

  private calculateComputeCost(durationMs: number, model: string): number {
    // Estimate compute cost for local models
    // This is primarily about electricity and hardware amortization

    const baseCostPerHour = 0.05; // $0.05/hour for local compute
    const modelMultiplier = this.getModelComputeMultiplier(model);

    return (durationMs / 3600000) * baseCostPerHour * modelMultiplier;
  }

  private getModelComputeMultiplier(model: string): number {
    // Rough multipliers based on model size/complexity
    if (model.includes('7b') || model.includes('7B')) return 1.0;
    if (model.includes('13b') || model.includes('13B')) return 2.0;
    if (model.includes('34b') || model.includes('34B')) return 4.0;
    if (model.includes('70b') || model.includes('70B')) return 8.0;

    return 1.5; // Default multiplier
  }

  private findSmallerAlternative(model: string): string | null {
    // Logic to find smaller variants of models
    const alternatives: Record<string, string> = {
      'llama2:70b': 'llama2:13b',
      'llama2:13b': 'llama2:7b',
      'codellama:34b': 'codellama:13b',
      'codellama:13b': 'codellama:7b',
    };

    return alternatives[model] || null;
  }

  private async getSystemInfo(): Promise<{
    gpu_memory_mb?: number;
    cpu_cores?: number;
    available_memory_mb?: number;
  }> {
    try {
      // This would ideally call a system info endpoint
      // For now, return minimal info
      return {};
    } catch (error) {
      return {};
    }
  }
}
