import { jest } from '@jest/globals';

const mockQuery = jest.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

const mockClient = {
  connect: jest.fn(() => Promise.resolve()),
  query: mockQuery,
  end: jest.fn(() => Promise.resolve()),
  release: jest.fn(() => Promise.resolve()),
};

const mockPool = {
  connect: jest.fn(() => Promise.resolve(mockClient)),
  query: mockQuery,
  end: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
  removeListener: jest.fn(),
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

const types = {
  setTypeParser: jest.fn(),
};

export { Pool, Client, types };
export default { Pool, Client, types };
