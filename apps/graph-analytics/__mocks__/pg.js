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

export class Pool {
  constructor() {
    Object.assign(this, mockPool);
  }
}

export class Client {
  constructor() {
    Object.assign(this, mockClient);
  }
}

export const types = {
  setTypeParser: jest.fn(),
};

export default { Pool, Client, types };
