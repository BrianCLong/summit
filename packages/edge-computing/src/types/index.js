"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeNodeMetadataSchema = exports.ResourceCapacitySchema = exports.GeoLocationSchema = exports.EdgeDeviceType = exports.HealthStatus = exports.EdgeNodeStatus = void 0;
const zod_1 = require("zod");
/**
 * Edge node status enumeration
 */
var EdgeNodeStatus;
(function (EdgeNodeStatus) {
    EdgeNodeStatus["ONLINE"] = "online";
    EdgeNodeStatus["OFFLINE"] = "offline";
    EdgeNodeStatus["DEGRADED"] = "degraded";
    EdgeNodeStatus["MAINTENANCE"] = "maintenance";
    EdgeNodeStatus["PROVISIONING"] = "provisioning";
    EdgeNodeStatus["DECOMMISSIONED"] = "decommissioned";
})(EdgeNodeStatus || (exports.EdgeNodeStatus = EdgeNodeStatus = {}));
/**
 * Edge node health status
 */
var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "healthy";
    HealthStatus["UNHEALTHY"] = "unhealthy";
    HealthStatus["WARNING"] = "warning";
    HealthStatus["UNKNOWN"] = "unknown";
})(HealthStatus || (exports.HealthStatus = HealthStatus = {}));
/**
 * Edge device types
 */
var EdgeDeviceType;
(function (EdgeDeviceType) {
    EdgeDeviceType["GATEWAY"] = "gateway";
    EdgeDeviceType["COMPUTE_NODE"] = "compute_node";
    EdgeDeviceType["IOT_DEVICE"] = "iot_device";
    EdgeDeviceType["SENSOR"] = "sensor";
    EdgeDeviceType["ACTUATOR"] = "actuator";
    EdgeDeviceType["EDGE_SERVER"] = "edge_server";
    EdgeDeviceType["JETSON"] = "jetson";
    EdgeDeviceType["CORAL"] = "coral";
    EdgeDeviceType["CUSTOM"] = "custom";
})(EdgeDeviceType || (exports.EdgeDeviceType = EdgeDeviceType = {}));
/**
 * Zod schemas for validation
 */
exports.GeoLocationSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    altitude: zod_1.z.number().optional(),
    accuracy: zod_1.z.number().optional(),
    country: zod_1.z.string().optional(),
    region: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    datacenter: zod_1.z.string().optional(),
    zone: zod_1.z.string().optional()
});
exports.ResourceCapacitySchema = zod_1.z.object({
    cpu: zod_1.z.object({
        cores: zod_1.z.number().int().positive(),
        frequency: zod_1.z.number().positive(),
        utilization: zod_1.z.number().min(0).max(100)
    }),
    memory: zod_1.z.object({
        total: zod_1.z.number().int().positive(),
        available: zod_1.z.number().int().nonnegative(),
        utilization: zod_1.z.number().min(0).max(100)
    }),
    storage: zod_1.z.object({
        total: zod_1.z.number().int().positive(),
        available: zod_1.z.number().int().nonnegative(),
        utilization: zod_1.z.number().min(0).max(100)
    }),
    network: zod_1.z.object({
        bandwidth: zod_1.z.number().nonnegative(),
        latency: zod_1.z.number().nonnegative(),
        packetLoss: zod_1.z.number().min(0).max(100)
    }),
    gpu: zod_1.z.object({
        model: zod_1.z.string(),
        memory: zod_1.z.number().int().positive(),
        utilization: zod_1.z.number().min(0).max(100)
    }).optional()
});
exports.EdgeNodeMetadataSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1),
    type: zod_1.z.nativeEnum(EdgeDeviceType),
    status: zod_1.z.nativeEnum(EdgeNodeStatus),
    health: zod_1.z.nativeEnum(HealthStatus),
    version: zod_1.z.string(),
    location: exports.GeoLocationSchema,
    capacity: exports.ResourceCapacitySchema,
    tags: zod_1.z.record(zod_1.z.string()),
    clusterId: zod_1.z.string().uuid().optional(),
    registeredAt: zod_1.z.date(),
    lastHeartbeat: zod_1.z.date(),
    uptime: zod_1.z.number().nonnegative()
});
