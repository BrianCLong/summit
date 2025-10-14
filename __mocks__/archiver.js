const archiver = jest.fn(() => {
  const api = {
    pipe: jest.fn(() => api),
    append: jest.fn(() => api),
    file: jest.fn(() => api),
    directory: jest.fn(() => api),
    finalize: jest.fn(async () => undefined),
    on: jest.fn(() => api),
  };
  return api;
});

archiver.create = archiver;

module.exports = archiver;
