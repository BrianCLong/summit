import '@testing-library/jest-dom';

// Mock CanvasRenderingContext2D for jsdom tests
Object.defineProperty(global.HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  writable: true,
  value: jest.fn(() => ({
    // state
    globalAlpha: 1,
    // drawing
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    arc: jest.fn(),
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    // text
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 50 })),
  })),
});

// Polyfill requestAnimationFrame/cancelAnimationFrame
if (!global.requestAnimationFrame) {
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}
if (!global.cancelAnimationFrame) {
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

// Mock scrollTo on elements used by components
if (!global.HTMLElement.prototype.scrollTo) {
  // eslint-disable-next-line no-empty-function
  global.HTMLElement.prototype.scrollTo = jest.fn();
}
