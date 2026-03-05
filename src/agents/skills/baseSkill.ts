export interface SkillInputSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description: string;
    required?: boolean;
  }>;
  required?: string[];
}

export interface SkillOutputSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description?: string;
  }>;
}

export interface SkillMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  inputs: SkillInputSchema;
  outputs: SkillOutputSchema;
}

export interface EvidenceArtifact {
  id: string;
  type: string;
  timestamp: Date;
  data: any;
}

export class SkillError extends Error {
  constructor(public code: string, message: string, public details?: any) {
    super(message);
    this.name = 'SkillError';
  }
}

export abstract class BaseSkill<TInput = any, TOutput = any> {
  abstract readonly metadata: SkillMetadata;

  /**
   * Validate the input against the skill's input schema.
   * Override this for custom validation logic.
   */
  validateInput(input: TInput): boolean {
    if (!input) return false;

    // Basic required field validation
    if (this.metadata.inputs.required) {
      for (const field of this.metadata.inputs.required) {
        if ((input as any)[field] === undefined) {
          throw new SkillError('VALIDATION_ERROR', `Missing required input field: ${field}`);
        }
      }
    }

    return true;
  }

  /**
   * Generates evidence artifacts for audit trailing.
   */
  protected createEvidence(type: string, data: any): EvidenceArtifact {
    return {
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type,
      timestamp: new Date(),
      data,
    };
  }

  /**
   * The core execution logic of the skill.
   * Must return the expected output and optionally evidence artifacts.
   */
  abstract execute(input: TInput, context?: any): Promise<{ output: TOutput; evidence?: EvidenceArtifact[] }>;

  /**
   * Run the skill, including validation, execution, and error handling.
   */
  async run(input: TInput, context?: any): Promise<{ output: TOutput; evidence?: EvidenceArtifact[] }> {
    try {
      this.validateInput(input);
      return await this.execute(input, context);
    } catch (error) {
      if (error instanceof SkillError) {
        throw error;
      }
      throw new SkillError('EXECUTION_ERROR', `Failed to execute skill ${this.metadata.name}`, error);
    }
  }
}
