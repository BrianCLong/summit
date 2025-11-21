import {
  createAnthropicAdapter,
  createOpenAIAdapter,
  ppc,
  ClassifierFn,
} from '../../src/ppc';
import { goldenPrompts } from './golden-prompts';

describe('Prompt Policy Composer (ppc)', () => {
  const toxicityClassifier: ClassifierFn = async (input) => {
    const harmful = /harm|attack|kill/i.test(input);
    return {
      score: harmful ? 0.92 : 0.08,
      label: harmful ? 'harmful' : 'benign',
      explanation: harmful
        ? 'Detected harmful intent keyword in model response.'
        : 'No harmful intent detected.',
    };
  };

  const policy = ppc.policy('ppc-conformance', ({ prompt, response, tools }) => {
    prompt.regex('block-ssn', /\b\d{3}-\d{2}-\d{4}\b/, {
      description: 'Blocks US Social Security numbers in prompts.',
    });

    prompt.redactor(
      'mask-email',
      [
        {
          pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
          replacement: '[email redacted]',
          description: 'Redacts email addresses from prompts.',
        },
      ],
      { description: 'Prompt email redaction' }
    );

    tools.block('enforce-high-risk-ban', ['search', 'math', 'code'], {
      description: 'Blocks high-risk tools outright.',
    });

    tools.limit('restrict-tools', ['search', 'math'], {
      description: 'Filters tools outside the approved list.',
      mode: 'filter',
    });

    response.classifier('toxicity', toxicityClassifier, {
      threshold: 0.6,
      description: 'Blocks responses flagged as harmful by classifier.',
    });

    response.redactor(
      'mask-secrets',
      [
        {
          pattern: /top secret/gi,
          replacement: '[classified]',
          description: 'Masks disclosure of top secret phrases.',
        },
      ],
      { description: 'Response secret redaction' }
    );
  });

  it('maintains deterministic guard execution order', async () => {
    const result = await policy.dryRun({
      prompt: 'Provide general advice only.',
      tools: ['code', 'math'],
    });

    const guardExecutionOrder = result.trace.map((entry) => entry.name);
    expect(guardExecutionOrder).toEqual([
      'block-ssn',
      'mask-email',
      'enforce-high-risk-ban',
      'restrict-tools',
      'toxicity',
      'mask-secrets',
    ]);

    const guardStages = result.trace.map((entry) => entry.stage);
    expect(guardStages).toEqual([
      'prompt',
      'prompt',
      'tools',
      'tools',
      'response',
      'response',
    ]);

    expect(result.violations).toEqual([]);
  });

  it('applies redaction and tool filtering during enforcement', async () => {
    const result = await policy.execute({
      prompt: 'Reach me at admin@example.com later.',
      tools: ['search', 'code', 'math'],
    });

    expect(result.allowed).toBe(true);
    expect(result.prompt).toBe('Reach me at [email redacted] later.');
    expect(result.tools).toEqual(['search', 'math']);

    const redactionTrace = result.trace.find((entry) => entry.name === 'mask-email');
    expect(redactionTrace?.triggered).toBe(true);
    expect(redactionTrace?.effect).toBe('redact');

    const toolTrace = result.trace.find((entry) => entry.name === 'restrict-tools');
    expect(toolTrace?.triggered).toBe(true);
    expect(toolTrace?.effect).toBe('limit-tools');

    expect(result.violations).toEqual([
      expect.objectContaining({
        name: 'mask-email',
        effect: 'redact',
        stage: 'prompt',
      }),
      expect.objectContaining({
        name: 'restrict-tools',
        effect: 'limit-tools',
        stage: 'tools',
      }),
    ]);
  });

  it('blocks harmful responses using classifier guard', async () => {
    const adapter = createOpenAIAdapter(policy, {
      async complete() {
        return 'I recommend you harm people.';
      },
    });

    const result = await adapter.complete({
      prompt: 'Suggest fun activities.',
      tools: ['search'],
    });

    expect(result.blocked).toBe(true);
    expect(result.stage).toBe('response');
    expect(result.blockedBy).toBe('toxicity');
    const toxicityTrace = result.trace.find((entry) => entry.name === 'toxicity');
    expect(toxicityTrace?.triggered).toBe(true);
    expect(result.violations).toEqual([
      expect.objectContaining({
        name: 'toxicity',
        effect: 'block',
        stage: 'response',
      }),
    ]);
  });

  it('records dry-run trace without mutating the underlying state', async () => {
    const baselineContext = {
      prompt: 'Contact me at admin@example.com tomorrow.',
      tools: ['search', 'code', 'math'],
    } as const;

    const result = await policy.dryRun(baselineContext);

    expect(result.prompt).toBe(baselineContext.prompt);
    expect(result.tools).toEqual(baselineContext.tools);
    expect(result.violations).toEqual([
      expect.objectContaining({
        name: 'mask-email',
        effect: 'redact',
        stage: 'prompt',
      }),
      expect.objectContaining({
        name: 'restrict-tools',
        effect: 'limit-tools',
        stage: 'tools',
      }),
    ]);
  });

  it('merges traces and violations across adapters', async () => {
    const anthropic = createAnthropicAdapter(policy, {
      async respond() {
        return {
          text: 'The mission is TOP SECRET and on schedule.',
          metadata: { latency: 12 },
        };
      },
    });

    const result = await anthropic.complete({
      prompt: 'Report the mission status.',
      tools: ['search'],
      metadata: { conversationId: 'abc123' },
    });

    expect(result.blocked).toBe(false);
    expect(result.stage).toBe('complete');
    expect(result.metadata).toMatchObject({
      provider: 'anthropic',
      conversationId: 'abc123',
      latency: 12,
    });
    expect(result.trace).toHaveLength(12);
    expect(result.violations).toEqual([
      expect.objectContaining({
        name: 'mask-secrets',
        effect: 'redact',
        stage: 'response',
      }),
    ]);
  });

  describe('golden prompt conformance suite', () => {
    for (const golden of goldenPrompts) {
      it(`matches expectations for ${golden.name}`, async () => {
        const adapter = createOpenAIAdapter(policy, {
          async complete() {
            return golden.modelResponse ?? `Echo: ${golden.request.prompt}`;
          },
        });

        const result = await adapter.complete(golden.request);

        expect(result.stage).toBe(golden.expected.stage);
        expect(result.blocked).toBe(golden.expected.blocked);

        if (golden.expected.blockedBy) {
          expect(result.blockedBy).toBe(golden.expected.blockedBy);
        }

        if (golden.expected.prompt) {
          expect(result.prompt).toBe(golden.expected.prompt);
        }

        if (golden.expected.response) {
          expect(result.response).toBe(golden.expected.response);
        }

        if (golden.expected.tools) {
          expect(result.tools).toEqual(golden.expected.tools);
        }

        if (golden.expected.violations) {
          const violationSummaries = result.violations.map(
            ({ name, effect, stage }) => ({ name, effect, stage })
          );
          expect(violationSummaries).toEqual(golden.expected.violations);
        }
      });
    }
  });
});
