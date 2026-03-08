"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUIRED_FIELDS = exports.EventType = exports.EVENT_VERSION = void 0;
// Event Contract Definitions
exports.EVENT_VERSION = '1.0.0';
var EventType;
(function (EventType) {
    EventType["INCIDENT_CREATED"] = "incident.created";
    EventType["INCIDENT_UPDATED"] = "incident.updated";
    EventType["AUDIT_LOG_CREATED"] = "audit.log.created";
    EventType["INTEGRATION_TEST"] = "integration.test";
})(EventType || (exports.EventType = EventType = {}));
exports.REQUIRED_FIELDS = ['event_id', 'tenant_id', 'occurred_at', 'type', 'schema_version'];
