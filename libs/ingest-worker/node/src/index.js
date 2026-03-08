"use strict";
/**
 * @intelgraph/ingest-worker
 *
 * Standard worker library for ingest/ETL pipelines with:
 * - Concurrency tokens and semaphores
 * - Token bucket rate limiting with per-tenant limits
 * - Exponential backoff with jitter and bounded retries
 * - Circuit breakers for sink protection
 * - Dead-letter routing after K retries
 * - Drain mode and brownout support
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
__exportStar(require("./backpressure.js"), exports);
__exportStar(require("./retry.js"), exports);
__exportStar(require("./circuit-breaker.js"), exports);
__exportStar(require("./idempotency.js"), exports);
__exportStar(require("./rate-limiter.js"), exports);
__exportStar(require("./worker.js"), exports);
