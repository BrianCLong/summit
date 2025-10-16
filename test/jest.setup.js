// Retry known flakey tests once based on tag
const retry = parseInt(process.env.JEST_RETRY_TIMES || '0', 10);
if (retry > 0 && global.jest) {
  // @ts-ignore
  jest.retryTimes(retry, { logErrorsBeforeRetry: true });
}

// ---- No .only guard ---------------------------------------------------------
const failFocus = (what) => {
  throw new Error(
    `[no-only-tests] Detected ${what}. Remove '.only' to keep coverage honest.`,
  );
};

Object.defineProperty(global.it, 'only', { get: () => failFocus('it.only') });
Object.defineProperty(global.describe, 'only', {
  get: () => failFocus('describe.only'),
});

// ---- console.error guard ----------------------------------------------------
const __origConsoleError = console.error;

beforeAll(() => {
  console.error = (...args) => {
    __origConsoleError(...args);
    throw new Error(
      '[console.error] used in tests — replace with assertions or throw',
    );
  };
});

afterAll(() => {
  console.error = __origConsoleError;
});
