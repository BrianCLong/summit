// Mock for neo4j-driver - using plain functions since jest may not be available
const mockSession = () => ({
  run: () => Promise.resolve({ records: [] }),
  close: () => Promise.resolve(undefined),
  beginTransaction: () => ({
    run: () => Promise.resolve({ records: [] }),
    commit: () => Promise.resolve(),
    rollback: () => Promise.resolve(),
  }),
});

const mockDriver = () => ({
  session: () => mockSession(),
  close: () => Promise.resolve(undefined),
  verifyConnectivity: () => Promise.resolve(),
});

const neo4j = {
  driver: () => mockDriver(),
  auth: {
    basic: () => ({ principal: '', credentials: '' }),
    custom: () => ({}),
  },
  session: {
    READ: 'READ',
    WRITE: 'WRITE',
  },
  int: (value: number) => value,
  isInt: () => false,
  integer: {
    inSafeRange: () => true,
    toNumber: (v: unknown) => v,
  },
  types: {
    Node: class {},
    Relationship: class {},
    Path: class {},
    Point: class {},
    Date: class {},
    DateTime: class {},
    Duration: class {},
    LocalDateTime: class {},
    LocalTime: class {},
    Time: class {},
  },
};

export default neo4j;
export const driver = neo4j.driver;
export const auth = neo4j.auth;
export const session = neo4j.session;
export const int = neo4j.int;
export const isInt = neo4j.isInt;
export const integer = neo4j.integer;
export const types = neo4j.types;
