"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignerProtocol = exports.Partitioners = exports.logLevel = exports.CompressionCodecs = exports.CompressionTypes = exports.Kafka = exports.mockKafkaInstance = exports.mockAdmin = exports.mockConsumer = exports.mockProducer = void 0;
const globals_1 = require("@jest/globals");
// Mock producer
exports.mockProducer = {
    connect: globals_1.jest.fn().mockResolvedValue(undefined),
    disconnect: globals_1.jest.fn().mockResolvedValue(undefined),
    send: globals_1.jest.fn().mockResolvedValue(undefined),
    sendBatch: globals_1.jest.fn().mockResolvedValue(undefined),
    on: globals_1.jest.fn(),
    transaction: globals_1.jest.fn(),
    events: {},
};
// Mock consumer
exports.mockConsumer = {
    connect: globals_1.jest.fn().mockResolvedValue(undefined),
    disconnect: globals_1.jest.fn().mockResolvedValue(undefined),
    subscribe: globals_1.jest.fn().mockResolvedValue(undefined),
    run: globals_1.jest.fn().mockResolvedValue(undefined),
    stop: globals_1.jest.fn().mockResolvedValue(undefined),
    pause: globals_1.jest.fn(),
    resume: globals_1.jest.fn(),
    seek: globals_1.jest.fn(),
    describeGroup: globals_1.jest.fn().mockResolvedValue({ members: [] }),
    commitOffsets: globals_1.jest.fn().mockResolvedValue(undefined),
    on: globals_1.jest.fn(),
    events: {},
};
// Mock admin client
exports.mockAdmin = {
    connect: globals_1.jest.fn().mockResolvedValue(undefined),
    disconnect: globals_1.jest.fn().mockResolvedValue(undefined),
    createTopics: globals_1.jest.fn().mockResolvedValue(true),
    deleteTopics: globals_1.jest.fn().mockResolvedValue(undefined),
    listTopics: globals_1.jest.fn().mockResolvedValue([]),
    listGroups: globals_1.jest.fn().mockResolvedValue({ groups: [] }),
    describeGroups: globals_1.jest.fn().mockResolvedValue({ groups: [] }),
    fetchOffsets: globals_1.jest.fn().mockResolvedValue([]),
    resetOffsets: globals_1.jest.fn().mockResolvedValue(undefined),
    setOffsets: globals_1.jest.fn().mockResolvedValue(undefined),
    fetchTopicMetadata: globals_1.jest.fn().mockResolvedValue({ topics: [] }),
    describeCluster: globals_1.jest.fn().mockResolvedValue({ brokers: [], clusterId: 'test' }),
};
// Mock Kafka client instance
exports.mockKafkaInstance = {
    producer: globals_1.jest.fn(() => exports.mockProducer),
    consumer: globals_1.jest.fn(() => exports.mockConsumer),
    admin: globals_1.jest.fn(() => exports.mockAdmin),
    logger: globals_1.jest.fn(() => ({
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
    })),
};
// Kafka constructor as jest.fn()
exports.Kafka = globals_1.jest.fn(() => exports.mockKafkaInstance);
// Additional exports
exports.CompressionTypes = {
    None: 0,
    GZIP: 1,
    Snappy: 2,
    LZ4: 3,
    ZSTD: 4,
};
exports.CompressionCodecs = {};
exports.logLevel = {
    NOTHING: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 4,
    DEBUG: 5,
};
exports.Partitioners = {
    DefaultPartitioner: globals_1.jest.fn(),
    LegacyPartitioner: globals_1.jest.fn(),
    JavaCompatiblePartitioner: globals_1.jest.fn(),
};
exports.AssignerProtocol = {
    MemberMetadata: {
        encode: globals_1.jest.fn(),
        decode: globals_1.jest.fn(),
    },
    MemberAssignment: {
        encode: globals_1.jest.fn(),
        decode: globals_1.jest.fn(),
    },
};
exports.default = {
    Kafka: exports.Kafka,
    CompressionTypes: exports.CompressionTypes,
    CompressionCodecs: exports.CompressionCodecs,
    logLevel: exports.logLevel,
    Partitioners: exports.Partitioners,
    AssignerProtocol: exports.AssignerProtocol,
    mockKafkaInstance: exports.mockKafkaInstance,
    mockProducer: exports.mockProducer,
    mockConsumer: exports.mockConsumer,
    mockAdmin: exports.mockAdmin,
};
