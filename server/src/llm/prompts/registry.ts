
import { PromptTemplate, PromptService, RenderedPrompt } from './types';
import { ChatMessage } from '../types';

export class InMemoryPromptRegistry implements PromptService {
  private templates: Map<string, PromptTemplate[]> = new Map();

  constructor() {
      // Seed with initial prompts
      this.register({
          id: 'rag.answer',
          version: '1.0.0',
          purpose: 'rag_answer',
          riskLevel: 'medium',
          description: 'Generates an answer based on retrieved context.',
          inputSchema: {
              context: { type: 'string' },
              question: { type: 'string' }
          },
          messages: [
              {
                  role: 'system',
                  content: 'You are a helpful AI assistant. Use the following context to answer the user\'s question. If you cannot answer from the context, say so.\n\nContext:\n{{context}}'
              },
              {
                  role: 'user',
                  content: '{{question}}'
              }
          ]
      });

      this.register({
          id: 'summarize.text',
          version: '1.0.0',
          purpose: 'summarization',
          riskLevel: 'low',
          description: 'Summarizes the provided text.',
          inputSchema: {
              text: { type: 'string' }
          },
          messages: [
              {
                  role: 'system',
                  content: 'You are a concise summarizer. Summarize the following text in 3-5 sentences.'
              },
              {
                  role: 'user',
                  content: '{{text}}'
              }
          ]
      });

      this.register({
          id: 'classify.sentiment',
          version: '1.0.0',
          purpose: 'classification',
          riskLevel: 'low',
          description: 'Classifies text sentiment.',
          inputSchema: {
              text: { type: 'string' }
          },
          messages: [
              {
                  role: 'system',
                  content: 'Classify the sentiment of the user text as POSITIVE, NEGATIVE, or NEUTRAL. Reply with only the label.'
              },
              {
                  role: 'user',
                  content: '{{text}}'
              }
          ]
      });
  }

  register(template: PromptTemplate): void {
    const existing = this.templates.get(template.id) || [];
    // Simple version check: unshift to keep latest at index 0
    // In a real system, we'd parse semver
    this.templates.set(template.id, [template, ...existing]);
  }

  get(id: string, version: string = 'latest'): PromptTemplate | undefined {
    const versions = this.templates.get(id);
    if (!versions || versions.length === 0) return undefined;

    if (version === 'latest') {
        return versions[0];
    }

    return versions.find(v => v.version === version);
  }

  async render(id: string, params: Record<string, any>, version: string = 'latest'): Promise<RenderedPrompt> {
    const template = this.get(id, version);
    if (!template) {
        throw new Error(`Prompt template not found: ${id}@${version}`);
    }

    const messages: ChatMessage[] = template.messages.map(msg => ({
        role: msg.role,
        content: this.interpolate(msg.content, params),
        name: msg.name
    }));

    return {
        messages,
        templateId: template.id,
        templateVersion: template.version
    };
  }

  private interpolate(text: string, params: Record<string, any>): string {
      return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
          return params[key] !== undefined ? String(params[key]) : `{{${key}}}`;
      });
  }
}

export const promptService = new InMemoryPromptRegistry();
