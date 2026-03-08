"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const EnhancedAIAssistant_1 = __importDefault(require("../EnhancedAIAssistant"));
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const fakes_1 = require("../test-utils/fakes");
const text_1 = require("../test-utils/text");
const flush_1 = require("../test-utils/flush");
function chunksFrom(text, cuts) {
    const idxs = [0, ...cuts, text.length].sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < idxs.length - 1; i++)
        out.push(text.slice(idxs[i], idxs[i + 1]));
    return out;
}
const target = 'I understand your query';
describe('chunk-boundary invariance', () => {
    beforeAll(() => jest.useRealTimers());
    const cases = [
        [], // whole string
        [1], // minimal head split
        [2, 12], // a couple of interior splits
        [1, 2, 3, 4], // many tiny chunks
        [5, 7, 14, 18],
    ];
    for (const cuts of cases) {
        it(`renders correctly for cuts=${JSON.stringify(cuts)}`, async () => {
            const transport = (0, fakes_1.makeFakeTransport)([
                ...chunksFrom(target, cuts).map((v) => ({ type: 'token', value: v })),
                { type: 'done' },
            ]);
            (0, react_1.render)(<EnhancedAIAssistant_1.default transport={transport} typingDelayMs={0} debounceMs={0}/>);
            await user_event_1.default.type(react_1.screen.getByRole('textbox', { name: /assistant-input/i }), 'go{enter}');
            await (0, flush_1.flushMicrotasks)();
            await (0, text_1.expectLastAssistantMessageToContain)(/I understand your query/i);
        });
    }
});
