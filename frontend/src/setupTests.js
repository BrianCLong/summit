import '@testing-library/jest-dom';

// @vitejs/plugin-react checks for this global at runtime; in jsdom it's never
// injected by Vite's dev-server HTML transform, so we set it manually.
window.__vite_plugin_react_preamble_installed__ = true;

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
