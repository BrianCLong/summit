"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerializationFormat = exports.PartitionStrategy = exports.MessageMetadataSchema = void 0;
const zod_1 = require("zod");
/**
 * Message metadata schema
 */
exports.MessageMetadataSchema = zod_1.z.object({
    eventId: zod_1.z.string(),
    eventType: zod_1.z.string(),
    timestamp: zod_1.z.number(),
    source: zod_1.z.string(),
    correlationId: zod_1.z.string().optional(),
    causationId: zod_1.z.string().optional(),
    tenantId: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
    version: zod_1.z.string().default('1.0'),
    schemaVersion: zod_1.z.string().optional(),
});
/**
 * Partition strategy types
 */
var PartitionStrategy;
(function (PartitionStrategy) {
    PartitionStrategy["ROUND_ROBIN"] = "round_robin";
    PartitionStrategy["MURMUR2"] = "murmur2";
    PartitionStrategy["CONSISTENT_HASH"] = "consistent_hash";
    PartitionStrategy["CUSTOM"] = "custom";
})(PartitionStrategy || (exports.PartitionStrategy = PartitionStrategy = {}));
/**
 * Message serialization format
 */
var SerializationFormat;
(function (SerializationFormat) {
    SerializationFormat["JSON"] = "json";
    SerializationFormat["AVRO"] = "avro";
    SerializationFormat["PROTOBUF"] = "protobuf";
    SerializationFormat["STRING"] = "string";
})(SerializationFormat || (exports.SerializationFormat = SerializationFormat = {}));
