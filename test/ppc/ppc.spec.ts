import { createOpenAIAdapter, ppc, ClassifierFn } from '../../src/ppc';
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
      'restrict-tools',
      'toxicity',
      'mask-secrets',
    ]);
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
      });
    }
  });
});
