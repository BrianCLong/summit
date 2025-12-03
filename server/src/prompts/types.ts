export interface PromptConfig {
  meta: {
    id: string;
    owner: string;
    purpose: string;
    tags?: string[];
    guardrails?: string[];
  };
  modelConfig: {
    model: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    stop?: string[];
  };
  inputs: Record<string, string>;
  template: string;
  outputSchema?: Record<string, any>;
  examples?: Array<{
    name: string;
    inputs: Record<string, any>;
    expected_contains?: string[];
    expected_output?: string;
  }>;
}
