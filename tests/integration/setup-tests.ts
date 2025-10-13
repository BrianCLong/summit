// Integration harness adjustments

beforeAll(() => {
  jest.setTimeout(60000);
});

afterAll(() => {
  jest.useRealTimers();
});
