/**
 * Coder Agent
 *
 * Generates, reviews, and refactors code based on specifications.
 * Integrates with git tools and can run tests.
 */

import { BaseAgent, type AgentServices } from '../Agent.js';
import type { AgentDescriptor, TaskInput, TaskOutput } from '../types.js';

interface CoderInput {
  action: 'generate' | 'refactor' | 'review' | 'fix_bug';
  specification: string;
  targetFiles?: string[];
  language?: string;
  testRequired?: boolean;
}

interface CoderOutput {
  code?: string;
  files?: FileChange[];
  review?: CodeReview;
  testsRun?: boolean;
  testsPassed?: boolean;
}

interface FileChange {
  path: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;
  diff?: string;
}

interface CodeReview {
  score: number; // 1-10
  issues: ReviewIssue[];
  suggestions: string[];
  approved: boolean;
}

interface ReviewIssue {
  severity: 'error' | 'warning' | 'info';
  file: string;
  line?: number;
  message: string;
}

/**
 * CoderAgent handles code generation, refactoring, and review tasks.
 */
export class CoderAgent extends BaseAgent {
  getDescriptor(): Omit<AgentDescriptor, 'id' | 'status' | 'registeredAt' | 'lastHeartbeat'> {
    return {
      name: 'coder-agent',
      version: '1.0.0',
      role: 'coder',
      riskTier: 'medium',
      capabilities: ['code_generation', 'refactoring', 'code_review', 'bug_fixing', 'typescript', 'python'],
      requiredTools: ['git', 'file_read', 'file_write'],
      modelPreference: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.2,
        maxTokens: 8192,
      },
      expectedLatencyMs: 10000,
    };
  }

  async onTaskReceived(
    input: TaskInput<CoderInput>,
    services: AgentServices
  ): Promise<TaskOutput<CoderOutput>> {
    const { task, payload } = input;
    const startTime = Date.now();

    services.logger.info('Coder task received', { taskId: task.id, action: payload.action });

    try {
      let result: CoderOutput;

      switch (payload.action) {
        case 'generate':
          result = await this.generateCode(payload, services);
          break;
        case 'refactor':
          result = await this.refactorCode(payload, services);
          break;
        case 'review':
          result = await this.reviewCode(payload, services);
          break;
        case 'fix_bug':
          result = await this.fixBug(payload, services);
          break;
        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }

      return this.success(task.id, result, {
        latencyMs: Date.now() - startTime,
        modelCallCount: 1,
      });
    } catch (error) {
      return this.failure(task.id, {
        code: 'CODER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: true,
      });
    }
  }

  private async generateCode(payload: CoderInput, services: AgentServices): Promise<CoderOutput> {
    const prompt = `You are an expert software engineer. Generate code based on this specification.

Specification: ${payload.specification}
Language: ${payload.language ?? 'TypeScript'}

Provide production-quality code with:
- Clear comments
- Error handling
- Type safety (if applicable)

Return the code in a markdown code block.`;

    const response = await services.model.complete(prompt);
    const codeMatch = response.content.match(/```[\w]*\n([\s\S]*?)```/);

    return {
      code: codeMatch ? codeMatch[1].trim() : response.content,
    };
  }

  private async refactorCode(payload: CoderInput, services: AgentServices): Promise<CoderOutput> {
    // Read existing files if specified
    let existingCode = '';
    if (payload.targetFiles?.length) {
      for (const file of payload.targetFiles) {
        try {
          const content = await services.tools.invoke<{ path: string }, string>('file_read', { path: file });
          existingCode += `\n// File: ${file}\n${content}`;
        } catch {
          services.logger.warn(`Could not read file: ${file}`);
        }
      }
    }

    const prompt = `Refactor this code according to the specification.

Specification: ${payload.specification}
${existingCode ? `\nExisting code:\n${existingCode}` : ''}

Provide the refactored code with explanations.`;

    const response = await services.model.complete(prompt);

    return {
      code: response.content,
      files: payload.targetFiles?.map((path) => ({
        path,
        action: 'modify' as const,
      })),
    };
  }

  private async reviewCode(payload: CoderInput, services: AgentServices): Promise<CoderOutput> {
    let codeToReview = payload.specification;

    if (payload.targetFiles?.length) {
      codeToReview = '';
      for (const file of payload.targetFiles) {
        try {
          const content = await services.tools.invoke<{ path: string }, string>('file_read', { path: file });
          codeToReview += `\n// File: ${file}\n${content}`;
        } catch {
          services.logger.warn(`Could not read file: ${file}`);
        }
      }
    }

    const prompt = `Review this code for quality, security, and best practices.

Code:
${codeToReview}

Provide a structured review with:
1. Overall score (1-10)
2. Issues (with severity, file, line if applicable, message)
3. Improvement suggestions
4. Whether you approve merging this code

Format as JSON.`;

    const response = await services.model.complete(prompt);
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const review = JSON.parse(jsonMatch[0]) as CodeReview;
      return { review };
    }

    return {
      review: {
        score: 5,
        issues: [],
        suggestions: [response.content],
        approved: false,
      },
    };
  }

  private async fixBug(payload: CoderInput, services: AgentServices): Promise<CoderOutput> {
    const prompt = `Fix this bug:

${payload.specification}

Provide:
1. Root cause analysis
2. The fix (code)
3. How to verify the fix`;

    const response = await services.model.complete(prompt);
    const codeMatch = response.content.match(/```[\w]*\n([\s\S]*?)```/);

    return {
      code: codeMatch ? codeMatch[1].trim() : response.content,
    };
  }
}
