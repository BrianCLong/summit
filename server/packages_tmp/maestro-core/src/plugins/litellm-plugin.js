"use strict";
/**
 * LiteLLM Step Plugin
 * Integrates with LiteLLM for multi-provider AI model routing with cost optimization
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiteLLMPlugin = void 0;
const axios_1 = __importDefault(require("axios"));
class LiteLLMPlugin {
    name = 'litellm';
    client;
    config;
    promptTemplates = new Map();
    constructor(config) {
        this.config = config;
        this.client = axios_1.default.create({
            baseURL: config.baseUrl,
            timeout: config.timeout || 60000,
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
            },
        });
        this.loadDefaultTemplates();
    }
    validate(config) {
        const stepConfig = config;
        if (!stepConfig.model) {
            throw new Error('LiteLLM step requires model configuration');
        }
        // Validate that either prompt or messages are provided
        if (!stepConfig.prompt &&
            !stepConfig.prompt_template &&
            !stepConfig.messages) {
            throw new Error('LiteLLM step requires either prompt, prompt_template, or messages');
        }
        // Validate prompt template exists if specified
        if (stepConfig.prompt_template &&
            !this.promptTemplates.has(stepConfig.prompt_template)) {
            throw new Error(`Unknown prompt template: ${stepConfig.prompt_template}`);
        }
        // Validate model format (provider/model-name)
        if (!stepConfig.model.includes('/') &&
            !this.isBuiltinModel(stepConfig.model)) {
            console.warn(`Model ${stepConfig.model} should be in format 'provider/model-name' for proper routing`);
        }
        // Validate token limits
        if (stepConfig.max_tokens && stepConfig.max_tokens > 32768) {
            console.warn('max_tokens > 32768 may not be supported by all models');
        }
        // Validate temperature range
        if (stepConfig.temperature !== undefined &&
            (stepConfig.temperature < 0 || stepConfig.temperature > 2)) {
            throw new Error('temperature must be between 0 and 2');
        }
    }
    async execute(context, step, execution) {
        const stepConfig = step.config;
        try {
            // Prepare the request payload
            const payload = await this.preparePayload(stepConfig, context, execution);
            // Add request metadata
            payload.metadata = {
                run_id: context.run_id,
                step_id: step.id,
                tenant_id: context.tenant_id,
                environment: context.environment,
            };
            // Make the request with retry logic
            const response = await this.makeRequestWithRetry(payload);
            // Extract response data
            const result = this.extractResponse(response.data);
            // Calculate cost if enabled
            let cost_usd;
            if (this.config.costTrackingEnabled && response.data.usage) {
                cost_usd = this.calculateCost(stepConfig.model, response.data.usage);
            }
            return {
                output: result,
                cost_usd,
                metadata: {
                    model: stepConfig.model,
                    usage: response.data.usage,
                    response_id: response.data.id,
                    created: response.data.created,
                    finish_reason: response.data.choices?.[0]?.finish_reason,
                    litellm_model_info: response.data.model_info,
                },
            };
        }
        catch (error) {
            throw new Error(`LiteLLM execution failed: ${error.message}`);
        }
    }
    async compensate(context, step, execution) {
        // LiteLLM calls are generally not compensatable (can't "undo" an AI generation)
        // But we can log the compensation attempt for audit trails
        console.log(`LiteLLM compensation called for step ${step.id} in run ${context.run_id}`);
        // Could potentially:
        // 1. Mark the output as "compensated" in metadata
        // 2. Send a follow-up request to generate a "reversal" or "correction"
        // 3. Update cost tracking to reflect compensation
    }
    registerPromptTemplate(name, template) {
        this.promptTemplates.set(name, template);
    }
    async preparePayload(stepConfig, context, execution) {
        let messages = stepConfig.messages;
        // Handle prompt template
        if (stepConfig.prompt_template) {
            const template = this.promptTemplates.get(stepConfig.prompt_template);
            if (!template) {
                throw new Error(`Prompt template not found: ${stepConfig.prompt_template}`);
            }
            const prompt = this.renderTemplate(template, {
                ...stepConfig.template_variables,
                ...context.parameters,
                run_id: context.run_id,
                step_id: execution.step_id,
            });
            messages = [{ role: 'user', content: prompt }];
        }
        else if (stepConfig.prompt) {
            messages = [{ role: 'user', content: stepConfig.prompt }];
        }
        return {
            model: stepConfig.model,
            messages,
            max_tokens: stepConfig.max_tokens,
            temperature: stepConfig.temperature,
            top_p: stepConfig.top_p,
            frequency_penalty: stepConfig.frequency_penalty,
            presence_penalty: stepConfig.presence_penalty,
            stop: stepConfig.stop,
            stream: stepConfig.stream || false,
            response_format: stepConfig.response_format,
            tools: stepConfig.tools,
            tool_choice: stepConfig.tool_choice,
        };
    }
    async makeRequestWithRetry(payload) {
        const maxRetries = this.config.retryAttempts || 3;
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.client.post('/chat/completions', payload);
            }
            catch (error) {
                lastError = error;
                // Don't retry on client errors (4xx)
                if (error.response?.status >= 400 && error.response?.status < 500) {
                    break;
                }
                // Exponential backoff for retries
                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }
    extractResponse(responseData) {
        if (responseData.choices && responseData.choices.length > 0) {
            const choice = responseData.choices[0];
            // Handle tool calls
            if (choice.message?.tool_calls) {
                return {
                    type: 'tool_calls',
                    tool_calls: choice.message.tool_calls,
                };
            }
            // Handle regular text response
            if (choice.message?.content) {
                return {
                    type: 'text',
                    content: choice.message.content,
                };
            }
        }
        throw new Error('Invalid response format from LiteLLM');
    }
    calculateCost(model, usage) {
        // Simple cost calculation - in production this would use a comprehensive pricing table
        const baseCostPer1kTokens = this.getBaseCostForModel(model);
        if (!usage.prompt_tokens || !usage.completion_tokens) {
            return 0;
        }
        const promptCost = (usage.prompt_tokens / 1000) * baseCostPer1kTokens.input;
        const completionCost = (usage.completion_tokens / 1000) * baseCostPer1kTokens.output;
        return promptCost + completionCost;
    }
    getBaseCostForModel(model) {
        // Simplified pricing - real implementation would have comprehensive model pricing
        const pricing = {
            'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
            'gpt-4o': { input: 0.005, output: 0.015 },
            'claude-3-haiku': { input: 0.00025, output: 0.00125 },
            'claude-3-sonnet': { input: 0.003, output: 0.015 },
        };
        // Extract base model name from provider/model format
        const baseModel = model.includes('/') ? model.split('/')[1] : model;
        return pricing[baseModel] || { input: 0.002, output: 0.006 }; // Default pricing
    }
    renderTemplate(template, variables) {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
            result = result.replace(regex, String(value));
        }
        return result;
    }
    isBuiltinModel(model) {
        const builtinModels = [
            'gpt-3.5-turbo',
            'gpt-4',
            'gpt-4o-mini',
            'claude-3-haiku',
        ];
        return builtinModels.includes(model);
    }
    loadDefaultTemplates() {
        this.promptTemplates.set('code_review', `
Review the following code changes and provide feedback:

{{code_changes}}

Focus on:
- Code quality and best practices
- Security vulnerabilities
- Performance implications
- Maintainability

Provide specific, actionable feedback.
    `.trim());
        this.promptTemplates.set('documentation', `
Generate documentation for the following code:

{{code}}

Include:
- Purpose and functionality
- Parameters and return values
- Usage examples
- Any important notes or warnings
    `.trim());
        this.promptTemplates.set('test_generation', `
Generate comprehensive unit tests for the following function:

{{function_code}}

Requirements:
- Test happy path scenarios
- Test edge cases and error conditions
- Use appropriate assertions
- Follow testing best practices
    `.trim());
    }
}
exports.LiteLLMPlugin = LiteLLMPlugin;
