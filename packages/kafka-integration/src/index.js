"use strict";
/**
 * Kafka Integration Layer
 *
 * Enterprise-grade Kafka integration with:
 * - Exactly-once semantics (EOS)
 * - Schema registry integration
 * - Multi-topic partitioning strategies
 * - Dead letter queues
 * - Message compression and batching
 * - High-throughput optimization
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./producer.js"), exports);
__exportStar(require("./consumer.js"), exports);
__exportStar(require("./admin.js"), exports);
__exportStar(require("./schema-registry.js"), exports);
__exportStar(require("./partitioner.js"), exports);
__exportStar(require("./dlq.js"), exports);
__exportStar(require("./config.js"), exports);
__exportStar(require("./types.js"), exports);
