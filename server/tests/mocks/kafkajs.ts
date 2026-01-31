import { jest } from '@jest/globals';

// Mock producer
export const mockProducer = {
  connect: jest.fn().mockResolvedValue(undefined as never),
  disconnect: jest.fn().mockResolvedValue(undefined as never),
  send: jest.fn().mockResolvedValue(undefined as never),
  sendBatch: jest.fn().mockResolvedValue(undefined as never),
  on: jest.fn(),
  transaction: jest.fn(),
  events: {},
};

// Mock consumer
export const mockConsumer = {
  connect: jest.fn().mockResolvedValue(undefined as never),
  disconnect: jest.fn().mockResolvedValue(undefined as never),
  subscribe: jest.fn().mockResolvedValue(undefined as never),
  run: jest.fn().mockResolvedValue(undefined as never),
  stop: jest.fn().mockResolvedValue(undefined as never),
  pause: jest.fn(),
  resume: jest.fn(),
  seek: jest.fn(),
  describeGroup: jest.fn().mockResolvedValue({ members: [] }),
  commitOffsets: jest.fn().mockResolvedValue(undefined as never),
  on: jest.fn(),
  events: {},
};

// Mock admin client
export const mockAdmin = {
  connect: jest.fn().mockResolvedValue(undefined as never),
  disconnect: jest.fn().mockResolvedValue(undefined as never),
  createTopics: jest.fn().mockResolvedValue(true as never),
  deleteTopics: jest.fn().mockResolvedValue(undefined as never),
  listTopics: jest.fn().mockResolvedValue([] as never),
  listGroups: jest.fn().mockResolvedValue({ groups: [] }),
  describeGroups: jest.fn().mockResolvedValue({ groups: [] }),
  fetchOffsets: jest.fn().mockResolvedValue([]),
  resetOffsets: jest.fn().mockResolvedValue(undefined as never),
  setOffsets: jest.fn().mockResolvedValue(undefined as never),
  fetchTopicMetadata: jest.fn().mockResolvedValue({ topics: [] }),
  describeCluster: jest.fn().mockResolvedValue({ brokers: [], clusterId: 'test' }),
};

// Mock Kafka client instance
export const mockKafkaInstance = {
  producer: jest.fn(() => mockProducer),
  consumer: jest.fn(() => mockConsumer),
  admin: jest.fn(() => mockAdmin),
  logger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
};

// Kafka constructor as jest.fn()
export const Kafka = jest.fn(() => mockKafkaInstance);

// Additional exports
export const CompressionTypes = {
  None: 0,
  GZIP: 1,
  Snappy: 2,
  LZ4: 3,
  ZSTD: 4,
};

export const CompressionCodecs = {};

export const logLevel = {
  NOTHING: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 4,
  DEBUG: 5,
};

export const Partitioners = {
  DefaultPartitioner: jest.fn(),
  LegacyPartitioner: jest.fn(),
  JavaCompatiblePartitioner: jest.fn(),
};

export const AssignerProtocol = {
  MemberMetadata: {
    encode: jest.fn(),
    decode: jest.fn(),
  },
  MemberAssignment: {
    encode: jest.fn(),
    decode: jest.fn(),
  },
};

export default {
  Kafka,
  CompressionTypes,
  CompressionCodecs,
  logLevel,
  Partitioners,
  AssignerProtocol,
  mockKafkaInstance,
  mockProducer,
  mockConsumer,
  mockAdmin,
};
