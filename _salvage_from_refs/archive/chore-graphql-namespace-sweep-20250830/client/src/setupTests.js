require('@testing-library/jest-dom');

// Polyfill TextEncoder/TextDecoder if missing in Node test env
if (typeof global.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  global.TextEncoder = require('util').TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  global.TextDecoder = require('util').TextDecoder;
}

// Stable mocks for browser APIs
Object.defineProperty(window, "SpeechRecognition", {
  writable: true,
  value: class {
    onstart; onresult; onerror; onend;
    start() { 
      this.onstart?.(); 
      setTimeout(() => { 
        this.onresult?.({ results: [[{ transcript: "test voice" }]] }); 
        this.onend?.(); 
      }, 10); 
    }
    stop() { this.onend?.(); }
    abort() { this.onend?.(); }
  },
});

Object.defineProperty(window, "webkitSpeechRecognition", { 
  writable: true, 
  value: window.SpeechRecognition 
});

class MockMediaRecorder {
  onstart; onstop; ondataavailable; state = "inactive";
  start() { 
    this.state = "recording"; 
    this.onstart?.(); 
  }
  stop() { 
    this.state = "inactive"; 
    this.ondataavailable?.({ data: new Blob() }); 
    this.onstop?.(); 
  }
}
Object.defineProperty(window, "MediaRecorder", { 
  writable: true, 
  value: MockMediaRecorder 
});

// Mock scrollTo to prevent jsdom errors
Element.prototype.scrollTo = jest.fn();

// Mock fetch for deterministic legacy fallback behavior
const encoder = new (require('util').TextEncoder)();

class MockReadableStream {
  constructor(chunks) {
    this.chunks = chunks;
    this.index = 0;
  }
  
  getReader() {
    return {
      read: () => Promise.resolve(
        this.index < this.chunks.length
          ? { value: encoder.encode(this.chunks[this.index++]), done: false }
          : { value: undefined, done: true }
      ),
      releaseLock() {},
    };
  }
}

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  body: new MockReadableStream(["I ", "understand ", "your ", "query"]),
  headers: new Map([["Content-Type", "text/plain"]]),
});
