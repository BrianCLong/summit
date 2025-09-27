import { instantiatePolicy } from './policy';
import {
  ClassifierFn,
  ClassifierGuardOptions,
  GuardDefinition,
  Policy,
  RedactorGuardOptions,
  RedactorRule,
  RegexGuardOptions,
  ToolScopeGuardOptions,
} from './types';

type RegexGuardConfig = Omit<RegexGuardOptions, 'name' | 'pattern' | 'target'>;
type ClassifierGuardConfig = Omit<
  ClassifierGuardOptions,
  'name' | 'classifier' | 'target'
>;
type RedactorGuardConfig = Omit<
  RedactorGuardOptions,
  'name' | 'rules' | 'target'
>;
type ToolScopeGuardConfig = Omit<ToolScopeGuardOptions, 'name' | 'allowedTools'>;

interface PromptDSL {
  regex(name: string, pattern: RegExp, options?: RegexGuardConfig): void;
  classifier(
    name: string,
    classifier: ClassifierFn,
    options: ClassifierGuardConfig
  ): void;
  redactor(
    name: string,
    rules: RedactorRule[],
    options?: RedactorGuardConfig
  ): void;
}

interface ResponseDSL {
  regex(name: string, pattern: RegExp, options?: RegexGuardConfig): void;
  classifier(
    name: string,
    classifier: ClassifierFn,
    options: ClassifierGuardConfig
  ): void;
  redactor(
    name: string,
    rules: RedactorRule[],
    options?: RedactorGuardConfig
  ): void;
}

interface ToolsDSL {
  limit(name: string, allowedTools: string[], options?: ToolScopeGuardConfig): void;
  block(name: string, allowedTools: string[], options?: ToolScopeGuardConfig): void;
}

export interface DSL {
  prompt: PromptDSL;
  response: ResponseDSL;
  tools: ToolsDSL;
  use(definition: GuardDefinition): void;
}

const createDSL = (definitions: GuardDefinition[]): DSL => {
  const push = (definition: GuardDefinition) => {
    definitions.push(definition);
  };

  const prompt: PromptDSL = {
    regex(name, pattern, options) {
      push({
        kind: 'regex',
        options: {
          name,
          pattern,
          target: 'prompt',
          ...options,
        },
      });
    },
    classifier(name, classifier, options) {
      push({
        kind: 'classifier',
        options: {
          name,
          classifier,
          target: 'prompt',
          ...options,
        },
      });
    },
    redactor(name, rules, options) {
      push({
        kind: 'redactor',
        options: {
          name,
          rules,
          target: 'prompt',
          ...options,
        },
      });
    },
  };

  const response: ResponseDSL = {
    regex(name, pattern, options) {
      push({
        kind: 'regex',
        options: {
          name,
          pattern,
          target: 'response',
          ...options,
        },
      });
    },
    classifier(name, classifier, options) {
      push({
        kind: 'classifier',
        options: {
          name,
          classifier,
          target: 'response',
          ...options,
        },
      });
    },
    redactor(name, rules, options) {
      push({
        kind: 'redactor',
        options: {
          name,
          rules,
          target: 'response',
          ...options,
        },
      });
    },
  };

  const tools: ToolsDSL = {
    limit(name, allowedTools, options) {
      push({
        kind: 'tool-scope',
        options: {
          name,
          allowedTools,
          ...options,
        },
      });
    },
    block(name, allowedTools, options) {
      push({
        kind: 'tool-scope',
        options: {
          name,
          allowedTools,
          mode: 'block',
          ...options,
        },
      });
    },
  };

  return {
    prompt,
    response,
    tools,
    use: push,
  };
};

export const policy = (
  name: string,
  compose: (dsl: DSL) => void
): Policy => {
  const definitions: GuardDefinition[] = [];
  const dsl = createDSL(definitions);
  compose(dsl);
  return instantiatePolicy(name, definitions);
};
