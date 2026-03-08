"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@testing-library/jest-dom");
// Polyfill for TextEncoder
const util_1 = require("util");
global.TextEncoder = util_1.TextEncoder;
// Polyfill for performance.getEntriesByType
if (typeof performance === 'undefined') {
    global.performance = {
        getEntriesByType: () => [],
    };
}
else if (!performance.getEntriesByType) {
    performance.getEntriesByType = () => [];
}
window.__srInstances = [];
class MockSpeechRecognition {
    onstart;
    onresult;
    onerror;
    onend;
    constructor() {
        window.__srInstances.push(this);
    }
    start() {
        this.onstart?.();
    }
    stop() {
        this.onend?.();
    }
    abort() {
        this.onend?.();
    }
}
Object.defineProperty(window, 'SpeechRecognition', {
    writable: true,
    value: MockSpeechRecognition,
});
Object.defineProperty(window, 'webkitSpeechRecognition', {
    writable: true,
    value: MockSpeechRecognition,
});
class MockMediaRecorder {
    onstart;
    onstop;
    ondataavailable;
    state = 'inactive';
    start() {
        this.state = 'recording';
        this.onstart?.();
    }
    stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob() });
        this.onstop?.();
    }
}
Object.defineProperty(window, 'MediaRecorder', {
    writable: true,
    value: MockMediaRecorder,
});
Element.prototype.scrollTo = jest.fn();
// Fail any unexpected console.error in tests (e.g., act warnings, ARIA issues)
let errorSpy;
beforeAll(() => {
    const allow = [/ReactDOMTestUtils\.act/i, /MUI: The `anchorEl` prop/i];
    errorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
        const msg = String(args[0] ?? '');
        if (allow.some((rx) => rx.test(msg)))
            return;
        throw new Error('console.error in test: ' + args.join(' '));
    });
});
afterEach(() => {
    errorSpy.mockClear();
});
afterAll(() => {
    errorSpy.mockRestore();
});
