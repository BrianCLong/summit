import {
  AnthropicAdapter,
  OpenAIChatAdapter,
  VertexAIAdapter,
  createPromptTemplate,
  enumSlot,
  formatTestRunForCI,
  formatValidationResultForCI,
  generateTestSuite,
  numberSlot,
  stringSlot,
  booleanSlot
} from '../src/index.js';
import { PromptValidationError } from '../src/errors.js';

describe('RPTC prompt compiler', () => {
  const prompt = createPromptTemplate({
    name: 'release-brief',
    description: 'Summarize capability updates for analyst briefings.',
    template:
      'Create a {{format}} update for {{audience}} about {{topic}} with {{count}} highlights. Include summary? {{includeSummary}}',
    slots: {
      audience: stringSlot({
        constraints: { minLength: 3, maxLength: 40 },
        example: 'intelligence leads'
      }),
      topic: stringSlot({
        constraints: { minLength: 5, pattern: /^[A-Za-z\s]+$/ },
        example: 'Network defense readiness',
        counterExamples: ['###']
      }),
      count: numberSlot({ constraints: { min: 1, max: 5 }, example: 3 }),
      includeSummary: booleanSlot({ defaultValue: true }),
      format: enumSlot(['bulleted', 'narrative'] as const, { defaultValue: 'bulleted' })
    }
  });

  const validValues = {
    audience: 'field officers',
    topic: 'Advanced network hardening',
    count: 3,
    includeSummary: false,
    format: 'narrative' as const
  };

  it('renders prompts when validation passes', () => {
    const output = prompt.render(validValues);
    expect(output).toContain('field officers');
    expect(output).toContain('Advanced network hardening');
    expect(output).toContain('3 highlights');
  });

  it('exposes compiled adapters for multiple providers', () => {
    const openai = new OpenAIChatAdapter({ model: 'gpt-test', systemPrompt: 'You are a release agent.' });
    const anthropic = new AnthropicAdapter({ model: 'claude-test' });
    const vertex = new VertexAIAdapter({ model: 'gemini-test' });

    const compiled = prompt.compile(validValues);

    const openaiPayload = openai.format(compiled);
    expect(openaiPayload).toMatchObject({ model: 'gpt-test' });
    expect(Array.isArray((openaiPayload as any).messages)).toBe(true);

    const anthropicPayload = anthropic.format(compiled);
    expect(anthropicPayload).toMatchObject({ model: 'claude-test' });
    expect((anthropicPayload as any).messages[0].content[0].text).toContain('Advanced network hardening');

    const vertexPayload = vertex.format(compiled);
    expect(vertexPayload).toMatchObject({ model: 'gemini-test' });
    expect((vertexPayload as any).contents[0].parts[0].text).toContain('field officers');
  });

  it('fails validation with descriptive errors', () => {
    const validation = prompt.validate({ ...validValues, topic: 'bad' });
    expect(validation.valid).toBe(false);
    expect(validation.errors[0].details[0].code).toBe('string.minLength');

    expect(() => prompt.render({ ...validValues, topic: 'bad' })).toThrow(PromptValidationError);
  });

  it('rejects extraneous slot data', () => {
    const validation = prompt.validate({ ...validValues, unknown: 'nope' } as any);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.details[0].code === 'slot.unexpected')).toBe(true);
  });

  it('produces CI-friendly summaries', () => {
    const validation = prompt.validate({ ...validValues, topic: 'bad' });
    const summary = formatValidationResultForCI(prompt, validation);
    expect(summary).toContain('FAILED');
    expect(summary).toContain('string.minLength');

    const suite = generateTestSuite(prompt, { validExample: validValues });
    expect(suite.cases.some((testCase) => testCase.description.includes('counterexample'))).toBe(true);
    const run = suite.run();
    expect(run.passed).toBe(true);
    const suiteSummary = formatTestRunForCI(suite.name, run);
    expect(suiteSummary).toContain('PASSED');
  });
});
