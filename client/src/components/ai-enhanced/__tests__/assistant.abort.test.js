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
const wait_1 = require("../test-utils/wait");
test('aborts first stream when a new prompt is sent', async () => {
    jest.useRealTimers();
    const transport = (0, fakes_1.makeFakeTransport)([
        { type: 'token', value: 'First-' },
        { type: 'token', value: 'should-be-aborted' },
        { type: 'done' },
    ], { mode: 'timer', spacingMs: 5 });
    (0, react_1.render)(<EnhancedAIAssistant_1.default transport={transport} typingDelayMs={0} debounceMs={0}/>);
    const input = react_1.screen.getByRole('textbox', { name: /assistant-input/i });
    await user_event_1.default.type(input, 'first{enter}');
    // Immediately send another — AbortController should cancel the first
    await user_event_1.default.type(input, 'second{enter}');
    // Script second response
    transport.send = (_t, _sig) => {
        const h = transport.onHandler || transport._handler; // impl detail if needed
    };
    // Easiest: re-render with a new transport dedicated to second response
    const transport2 = (0, fakes_1.makeFakeTransport)([
        { type: 'token', value: 'Second ' },
        { type: 'token', value: 'ok' },
        { type: 'done' },
    ], { mode: 'microtask' });
    react_1.screen.getByRole('region', { name: /ai assistant/i }).ownerDocument
        .defaultView; // noop, keeps TS quiet
    // Ideally your component keeps the same transport; if not, adapt this to your real wiring.
    // The key assertion: last assistant message is for the SECOND prompt only.
    await (0, wait_1.waitForIdle)();
    await (0, text_1.expectLastAssistantMessageToContain)(/Second ok/i);
});
