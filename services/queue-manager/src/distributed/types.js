"use strict";
/**
 * Distributed Queue Types
 *
 * Type definitions for the resilient distributed queue system with Redis failover.
 * Supports agent fleets, air-gapped environments, and parallel task orchestration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedPriority = void 0;
// ============================================================================
// Distributed Queue Types
// ============================================================================
var DistributedPriority;
(function (DistributedPriority) {
    DistributedPriority[DistributedPriority["CRITICAL"] = 1] = "CRITICAL";
    DistributedPriority[DistributedPriority["URGENT"] = 2] = "URGENT";
    DistributedPriority[DistributedPriority["HIGH"] = 3] = "HIGH";
    DistributedPriority[DistributedPriority["NORMAL"] = 5] = "NORMAL";
    DistributedPriority[DistributedPriority["LOW"] = 7] = "LOW";
    DistributedPriority[DistributedPriority["BACKGROUND"] = 10] = "BACKGROUND";
})(DistributedPriority || (exports.DistributedPriority = DistributedPriority = {}));
