"use strict";
/**
 * EventUpcaster - Event versioning and schema evolution
 *
 * Transform events from old versions to new versions
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpcastHelpers = exports.EventUpcasterChain = void 0;
const pino_1 = __importDefault(require("pino"));
class EventUpcasterChain {
    upcasters = new Map();
    logger;
    constructor() {
        this.logger = (0, pino_1.default)({ name: 'EventUpcasterChain' });
    }
    /**
     * Register an upcaster for an event type
     */
    register(eventType, upcaster) {
        if (!this.upcasters.has(eventType)) {
            this.upcasters.set(eventType, []);
        }
        const upcasters = this.upcasters.get(eventType);
        upcasters.push(upcaster);
        // Sort by fromVersion
        upcasters.sort((a, b) => a.fromVersion - b.fromVersion);
        this.logger.debug({ eventType, fromVersion: upcaster.fromVersion, toVersion: upcaster.toVersion }, 'Upcaster registered');
    }
    /**
     * Upcast an event to the latest version
     */
    upcast(event) {
        const upcasters = this.upcasters.get(event.eventType) || [];
        let currentEvent = event;
        let currentVersion = this.getEventSchemaVersion(event);
        for (const upcaster of upcasters) {
            if (currentVersion === upcaster.fromVersion) {
                currentEvent = upcaster.upcast(currentEvent);
                currentVersion = upcaster.toVersion;
                this.logger.debug({
                    eventType: event.eventType,
                    fromVersion: upcaster.fromVersion,
                    toVersion: upcaster.toVersion
                }, 'Event upcasted');
            }
        }
        return currentEvent;
    }
    /**
     * Upcast multiple events
     */
    upcastMany(events) {
        return events.map(event => this.upcast(event));
    }
    /**
     * Get event schema version from metadata
     */
    getEventSchemaVersion(event) {
        // Schema version can be stored in metadata
        return event.metadata?.schemaVersion || 1;
    }
    /**
     * Check if event needs upcasting
     */
    needsUpcast(event) {
        const upcasters = this.upcasters.get(event.eventType) || [];
        const currentVersion = this.getEventSchemaVersion(event);
        return upcasters.some(u => u.fromVersion === currentVersion);
    }
    /**
     * Get latest version for event type
     */
    getLatestVersion(eventType) {
        const upcasters = this.upcasters.get(eventType) || [];
        if (upcasters.length === 0) {
            return 1;
        }
        return Math.max(...upcasters.map(u => u.toVersion));
    }
}
exports.EventUpcasterChain = EventUpcasterChain;
/**
 * Helper functions for common upcasting scenarios
 */
class UpcastHelpers {
    /**
     * Rename a field in event payload
     */
    static renameField(oldName, newName) {
        return (event) => {
            const payload = { ...event.payload };
            if (oldName in payload) {
                payload[newName] = payload[oldName];
                delete payload[oldName];
            }
            return { ...event, payload };
        };
    }
    /**
     * Add a default field to event payload
     */
    static addField(fieldName, defaultValue) {
        return (event) => {
            const payload = {
                ...event.payload,
                [fieldName]: defaultValue
            };
            return { ...event, payload };
        };
    }
    /**
     * Remove a field from event payload
     */
    static removeField(fieldName) {
        return (event) => {
            const payload = { ...event.payload };
            delete payload[fieldName];
            return { ...event, payload };
        };
    }
    /**
     * Transform a field value
     */
    static transformField(fieldName, transform) {
        return (event) => {
            const payload = { ...event.payload };
            if (fieldName in payload) {
                payload[fieldName] = transform(payload[fieldName]);
            }
            return { ...event, payload };
        };
    }
    /**
     * Compose multiple upcasters
     */
    static compose(...upcasters) {
        return (event) => {
            return upcasters.reduce((e, upcaster) => upcaster(e), event);
        };
    }
}
exports.UpcastHelpers = UpcastHelpers;
