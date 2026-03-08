"use strict";
// @ts-nocheck
/**
 * Canonical Entity: Device
 *
 * Represents a device or hardware with bitemporal tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDevice = createDevice;
/**
 * Create a new Device entity
 */
function createDevice(data, baseFields, provenanceId) {
    return {
        ...baseFields,
        ...data,
        entityType: 'Device',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}
