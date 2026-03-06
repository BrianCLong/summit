const jestObj = typeof jest !== 'undefined' ? jest : require('@jest/globals').jest;

const mockQuery = jestObj.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

const mockClient = {
  connect: jestObj.fn(() => Promise.resolve()),
  query: mockQuery,
  end: jestObj.fn(() => Promise.resolve()),
  release: jestObj.fn(() => Promise.resolve()),
};

const mockPool = {
  connect: jestObj.fn(() => Promise.resolve(mockClient)),
  query: mockQuery,
  end: jestObj.fn(() => Promise.resolve()),
  on: jestObj.fn(),
  removeListener: jestObj.fn(),
};

class Pool {
  constructor() {
    Object.assign(this, mockPool);
  }
}

class Client {
  constructor() {
    Object.assign(this, mockClient);
  }
}

exports.Pool = Pool;
exports.Client = Client;
exports.types = {
  setTypeParser: jestObj.fn(),
};
exports.default = {
  Pool,
  Client,
  types: exports.types
};
