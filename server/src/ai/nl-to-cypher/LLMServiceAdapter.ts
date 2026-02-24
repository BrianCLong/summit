import { ModelAdapter } from './model-adapter.ts';
import { LLMService } from '../../services/LLMService.ts';

export class LLMServiceAdapter implements ModelAdapter {
  constructor(private llmService: LLMService) {}

  async generate(prompt: string): Promise<string> {
    // complete() takes prompt first, then options
    return this.llmService.complete(prompt, {
      temperature: 0,
      // Default model is handled by LLMService config if not specified
      // but we can specify 'gpt-4' or similar if needed.
      // We'll leave it to default or config to be more flexible.
    });
  }
}
