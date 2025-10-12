// Archiver mock that records operations and emits finish event on finalize
const archiverMock = jest.fn(() => {
  const calls = { append: [], file: [], directory: [] };
  const listeners = {};
  
  return {
    calls, // Expose the recorded calls for assertions
    pipe: jest.fn(),
    append: jest.fn((x) => void calls.append.push(x)),
    file: jest.fn((x) => void calls.file.push(x)),
    directory: jest.fn((x) => void calls.directory.push(x)),
    on: jest.fn((evt, cb) => {
      if (!listeners[evt]) {
        listeners[evt] = [];
      }
      listeners[evt].push(cb);
      return undefined;
    }),
    finalize: jest.fn(async () => {
      // Trigger all 'finish' event listeners when finalize is called
      const finishCallbacks = listeners['finish'] || [];
      for (const callback of finishCallbacks) {
        callback();
      }
    }),
  };
});

// Add the create method that archiver typically exposes
archiverMock.create = archiverMock;

module.exports = archiverMock;