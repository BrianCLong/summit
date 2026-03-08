"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../src/index.js");
const errors_js_1 = require("../src/errors.js");
describe('RPTC prompt compiler', () => {
    const prompt = (0, index_js_1.createPromptTemplate)({
        name: 'release-brief',
        description: 'Summarize capability updates for analyst briefings.',
        template: 'Create a {{format}} update for {{audience}} about {{topic}} with {{count}} highlights. Include summary? {{includeSummary}}',
        slots: {
            audience: (0, index_js_1.stringSlot)({
                constraints: { minLength: 3, maxLength: 40 },
                example: 'intelligence leads',
            }),
            topic: (0, index_js_1.stringSlot)({
                constraints: { minLength: 5, pattern: /^[A-Za-z\s]+$/ },
                example: 'Network defense readiness',
                counterExamples: ['###'],
            }),
            count: (0, index_js_1.numberSlot)({ constraints: { min: 1, max: 5 }, example: 3 }),
            includeSummary: (0, index_js_1.booleanSlot)({ defaultValue: true }),
            format: (0, index_js_1.enumSlot)(['bulleted', 'narrative'], {
                defaultValue: 'bulleted',
            }),
        },
    });
    const validValues = {
        audience: 'field officers',
        topic: 'Advanced network hardening',
        count: 3,
        includeSummary: false,
        format: 'narrative',
    };
    it('renders prompts when validation passes', () => {
        const output = prompt.render(validValues);
        expect(output).toContain('field officers');
        expect(output).toContain('Advanced network hardening');
        expect(output).toContain('3 highlights');
    });
    it('exposes compiled adapters for multiple providers', () => {
        const openai = new index_js_1.OpenAIChatAdapter({
            model: 'gpt-test',
            systemPrompt: 'You are a release agent.',
        });
        const anthropic = new index_js_1.AnthropicAdapter({ model: 'claude-test' });
        const vertex = new index_js_1.VertexAIAdapter({ model: 'gemini-test' });
        const compiled = prompt.compile(validValues);
        const openaiPayload = openai.format(compiled);
        expect(openaiPayload).toMatchObject({ model: 'gpt-test' });
        expect(Array.isArray(openaiPayload.messages)).toBe(true);
        const anthropicPayload = anthropic.format(compiled);
        expect(anthropicPayload).toMatchObject({ model: 'claude-test' });
        expect(anthropicPayload.messages[0].content[0].text).toContain('Advanced network hardening');
        const vertexPayload = vertex.format(compiled);
        expect(vertexPayload).toMatchObject({ model: 'gemini-test' });
        expect(vertexPayload.contents[0].parts[0].text).toContain('field officers');
    });
    it('fails validation with descriptive errors', () => {
        const validation = prompt.validate({ ...validValues, topic: 'bad' });
        expect(validation.valid).toBe(false);
        expect(validation.errors[0].details[0].code).toBe('string.minLength');
        expect(() => prompt.render({ ...validValues, topic: 'bad' })).toThrow(errors_js_1.PromptValidationError);
    });
    it('rejects extraneous slot data', () => {
        const validation = prompt.validate({
            ...validValues,
            unknown: 'nope',
        });
        expect(validation.valid).toBe(false);
        expect(validation.errors.some((error) => error.details[0].code === 'slot.unexpected')).toBe(true);
    });
    it('produces CI-friendly summaries', () => {
        const validation = prompt.validate({ ...validValues, topic: 'bad' });
        const summary = (0, index_js_1.formatValidationResultForCI)(prompt, validation);
        expect(summary).toContain('FAILED');
        expect(summary).toContain('string.minLength');
        const suite = (0, index_js_1.generateTestSuite)(prompt, { validExample: validValues });
        expect(suite.cases.some((testCase) => testCase.description.includes('counterexample'))).toBe(true);
        const run = suite.run();
        expect(run.passed).toBe(true);
        const suiteSummary = (0, index_js_1.formatTestRunForCI)(suite.name, run);
        expect(suiteSummary).toContain('PASSED');
    });
});
