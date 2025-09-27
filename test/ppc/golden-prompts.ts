import type { GuardStage } from '../../src/ppc';

export interface GoldenViolationExpectation {
  name: string;
  effect: string;
  stage: GuardStage;
}

export interface GoldenCase {
  name: string;
  request: {
    prompt: string;
    tools?: string[];
    metadata?: Record<string, unknown>;
  };
  modelResponse?: string;
  expected: {
    stage: 'prompt' | 'response' | 'complete';
    blocked: boolean;
    blockedBy?: string;
    prompt?: string;
    response?: string;
    tools?: string[];
    violations?: GoldenViolationExpectation[];
  };
}

export const goldenPrompts: GoldenCase[] = [
  {
    name: 'blocks ssn disclosure',
    request: {
      prompt: 'My SSN is 123-45-6789, please remember it.',
      tools: ['search'],
    },
    expected: {
      stage: 'prompt',
      blocked: true,
      blockedBy: 'block-ssn',
      violations: [
        { name: 'block-ssn', effect: 'block', stage: 'prompt' },
      ],
    },
  },
  {
    name: 'redacts email and filters tools',
    request: {
      prompt: 'Contact me at admin@example.com tomorrow.',
      tools: ['search', 'code', 'math'],
    },
    modelResponse: 'Sure, I will reach out tomorrow.',
    expected: {
      stage: 'complete',
      blocked: false,
      prompt: 'Contact me at [email redacted] tomorrow.',
      response: 'Sure, I will reach out tomorrow.',
      tools: ['search', 'math'],
      violations: [
        { name: 'mask-email', effect: 'redact', stage: 'prompt' },
        { name: 'restrict-tools', effect: 'limit-tools', stage: 'tools' },
      ],
    },
  },
  {
    name: 'blocks toxic response content',
    request: {
      prompt: 'Please give me suggestions for my weekend.',
      tools: ['math'],
    },
    modelResponse: 'You should harm others to have fun.',
    expected: {
      stage: 'response',
      blocked: true,
      blockedBy: 'toxicity',
      prompt: 'Please give me suggestions for my weekend.',
      response: 'You should harm others to have fun.',
      tools: ['math'],
      violations: [
        { name: 'toxicity', effect: 'block', stage: 'response' },
      ],
    },
  },
  {
    name: 'redacts top secret response disclosure',
    request: {
      prompt: 'Report the mission status.',
      tools: ['search'],
    },
    modelResponse: 'The mission is TOP SECRET and on schedule.',
    expected: {
      stage: 'complete',
      blocked: false,
      prompt: 'Report the mission status.',
      response: 'The mission is [classified] and on schedule.',
      tools: ['search'],
      violations: [
        { name: 'mask-secrets', effect: 'redact', stage: 'response' },
      ],
    },
  },
  {
    name: 'blocks high risk tools outright',
    request: {
      prompt: 'Enable admin access.',
      tools: ['search', 'root-shell'],
    },
    expected: {
      stage: 'prompt',
      blocked: true,
      blockedBy: 'enforce-high-risk-ban',
      prompt: 'Enable admin access.',
      tools: ['search', 'root-shell'],
      violations: [
        {
          name: 'enforce-high-risk-ban',
          effect: 'block',
          stage: 'tools',
        },
      ],
    },
  },
];
