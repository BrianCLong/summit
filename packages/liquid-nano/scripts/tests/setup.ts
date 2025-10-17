beforeAll(() => {
  process.env.LIQUID_NANO_ENV ??= 'test';
});

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});
