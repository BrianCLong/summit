const neo4j = {
  driver: jest.fn(() => ({
    session: jest.fn(() => ({
      run: jest.fn(() => ({ records: [] })),
      close: jest.fn(),
    })),
    verifyConnectivity: jest.fn(async () => undefined),
    close: jest.fn(async () => undefined),
  })),
  types: {
    Node: jest.fn(),
    Relationship: jest.fn(),
    Path: jest.fn(),
  },
  auth: {
    basic: jest.fn((username, password) => ({ username, password })),
  },
  Integer: jest.fn(),
  isInt: jest.fn(),
  int: jest.fn((val) => val),
};

export default neo4j;
module.exports = neo4j;