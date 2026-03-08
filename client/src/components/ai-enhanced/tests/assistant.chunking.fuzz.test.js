"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const fast_check_1 = __importDefault(require("fast-check"));
const EnhancedAIAssistant_1 = __importDefault(require("../EnhancedAIAssistant"));
const fakes_1 = require("../test-utils/fakes");
const text_1 = require("../test-utils/text");
const flush_1 = require("../test-utils/flush");
const target = 'I understand your query';
function chunkByIndices(s, cuts) {
    const indices = [
        0,
        ...cuts.filter((n) => n > 0 && n < s.length),
        s.length,
    ].sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < indices.length - 1; i++)
        out.push(s.slice(indices[i], indices[i + 1]));
    return out;
}
test('chunking invariance (fuzz)', async () => {
    jest.useRealTimers();
    await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.uniqueArray(fast_check_1.default.integer({ min: 0, max: target.length }), {
        minLength: 0,
        maxLength: Math.min(8, target.length),
    }), async (cuts) => {
        const chunks = chunkByIndices(target, cuts);
        const script = [
            ...chunks.map((v) => ({ type: 'token', value: v })),
            { type: 'done' },
        ];
        const transport = (0, fakes_1.makeFakeTransport)(script);
        (0, react_1.render)(<EnhancedAIAssistant_1.default transport={transport} typingDelayMs={0} debounceMs={0}/>);
        await user_event_1.default.type(react_1.screen.getByRole('textbox', { name: /assistant-input/i }), 'go{enter}');
        await (0, flush_1.flushMicrotasks)();
        await (0, text_1.expectLastAssistantMessageToContain)(/I understand your query/i);
    }), { numRuns: 25 });
});
