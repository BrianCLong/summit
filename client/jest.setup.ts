import '@testing-library/jest-dom';

declare global {
  interface Window {
    __srInstances?: any[];
  }
}
window.__srInstances = [];

class MockSpeechRecognition {
  onstart?: () => void;
  onresult?: (e: { results: any[][] }) => void;
  onerror?: (e: any) => void;
  onend?: () => void;
  constructor() {
    window.__srInstances!.push(this);
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
  onstart?: () => void;
  onstop?: () => void;
  ondataavailable?: (e: any) => void;
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
let errorSpy: jest.SpyInstance;

beforeAll(() => {
  const allow = [/ReactDOMTestUtils\.act/i, /MUI: The `anchorEl` prop/i];
  errorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
    const msg = String(args[0] ?? '');
    if (allow.some((rx) => rx.test(msg))) return;
    throw new Error('console.error in test: ' + args.join(' '));
  });
});

afterEach(() => {
  errorSpy.mockClear();
});

afterAll(() => {
  errorSpy.mockRestore();
});
