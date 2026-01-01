// Global browser API mocks for Jest tests
// ResizeObserver, IntersectionObserver, MutationObserver, and other DOM APIs

// ResizeObserver mock
global.ResizeObserver = class ResizeObserver {
    constructor(callback) { this.callback = callback; }
    observe() { }
    unobserve() { }
    disconnect() { }
};

// IntersectionObserver mock
global.IntersectionObserver = class IntersectionObserver {
    constructor(callback, options) { this.callback = callback; this.options = options; }
    observe() { }
    unobserve() { }
    disconnect() { }
};

// MutationObserver mock
global.MutationObserver = class MutationObserver {
    constructor(callback) { this.callback = callback; }
    observe() { }
    disconnect() { }
    takeRecords() { return []; }
};

// Add any other needed globals here
