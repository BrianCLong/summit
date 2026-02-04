import '@testing-library/jest-dom';

// Mock Worker for JSDOM
class Worker {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = () => {};
  }
  postMessage(msg) {
    // In a real mock we might want to trigger onmessage, but for now just silence the error
    // console.log('Worker postMessage', msg);
  }
  terminate() {}
}

global.Worker = Worker;

// Mock URL.createObjectURL/revokeObjectURL if needed (often needed for Workers too)
if (typeof window.URL.createObjectURL === 'undefined') {
  window.URL.createObjectURL = () => {};
}
if (typeof window.URL.revokeObjectURL === 'undefined') {
  window.URL.revokeObjectURL = () => {};
}
