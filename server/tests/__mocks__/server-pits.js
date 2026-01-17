export default {
  PITSEngine: jest.fn().mockImplementation(() => ({
    run: jest.fn(),
    evaluate: jest.fn(),
    getResults: jest.fn(),
  })),
};
