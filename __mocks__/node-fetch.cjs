const mockResponse = {
  ok: true,
  status: 200,
  statusText: 'OK',
  json: jest.fn(() => Promise.resolve({})),
  text: jest.fn(() => Promise.resolve('')),
  arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
  headers: new Map(),
};

const mockFetch = jest.fn(() => Promise.resolve(mockResponse));

module.exports = mockFetch;
module.exports.default = mockFetch;
module.exports.Response = jest.fn(() => mockResponse);
module.exports.Headers = Map;
