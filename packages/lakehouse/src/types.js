"use strict";
/**
 * Data Lakehouse - Core Types
 * Types for lakehouse architecture with ACID transactions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartitionTransform = exports.TableConfigSchema = exports.TableSchema = exports.ColumnSchema = exports.CompressionCodec = exports.TableFormat = void 0;
const zod_1 = require("zod");
// Table Format Types
var TableFormat;
(function (TableFormat) {
    TableFormat["DELTA_LAKE"] = "delta";
    TableFormat["ICEBERG"] = "iceberg";
    TableFormat["HUDI"] = "hudi";
    TableFormat["PARQUET"] = "parquet";
})(TableFormat || (exports.TableFormat = TableFormat = {}));
var CompressionCodec;
(function (CompressionCodec) {
    CompressionCodec["NONE"] = "none";
    CompressionCodec["SNAPPY"] = "snappy";
    CompressionCodec["GZIP"] = "gzip";
    CompressionCodec["LZ4"] = "lz4";
    CompressionCodec["ZSTD"] = "zstd";
})(CompressionCodec || (exports.CompressionCodec = CompressionCodec = {}));
// Schema Types
exports.ColumnSchema = zod_1.z.object({
    name: zod_1.z.string(),
    type: zod_1.z.enum([
        'string',
        'int',
        'bigint',
        'float',
        'double',
        'boolean',
        'timestamp',
        'date',
        'binary',
        'array',
        'map',
        'struct'
    ]),
    nullable: zod_1.z.boolean().default(true),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional()
});
exports.TableSchema = zod_1.z.object({
    columns: zod_1.z.array(exports.ColumnSchema),
    partitionKeys: zod_1.z.array(zod_1.z.string()).optional(),
    sortKeys: zod_1.z.array(zod_1.z.string()).optional()
});
// Table Configuration
exports.TableConfigSchema = zod_1.z.object({
    name: zod_1.z.string(),
    format: zod_1.z.nativeEnum(TableFormat),
    schema: exports.TableSchema,
    location: zod_1.z.string(),
    compression: zod_1.z.nativeEnum(CompressionCodec).default(CompressionCodec.SNAPPY),
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional()
});
// Partitioning
var PartitionTransform;
(function (PartitionTransform) {
    PartitionTransform["IDENTITY"] = "identity";
    PartitionTransform["YEAR"] = "year";
    PartitionTransform["MONTH"] = "month";
    PartitionTransform["DAY"] = "day";
    PartitionTransform["HOUR"] = "hour";
    PartitionTransform["BUCKET"] = "bucket";
    PartitionTransform["TRUNCATE"] = "truncate";
})(PartitionTransform || (exports.PartitionTransform = PartitionTransform = {}));
