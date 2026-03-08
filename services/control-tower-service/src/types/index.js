"use strict";
/**
 * Control Tower Service - TypeScript Types
 * @module @intelgraph/control-tower-service/types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentStatus = exports.AlertStatus = exports.NotificationChannel = exports.AlertTriggerType = exports.TrendDirection = exports.EventCategory = exports.ActionStatus = exports.ActionType = exports.Priority = exports.SituationStatus = exports.EventStatus = exports.Severity = void 0;
// ============================================================================
// Enums
// ============================================================================
var Severity;
(function (Severity) {
    Severity["CRITICAL"] = "CRITICAL";
    Severity["WARNING"] = "WARNING";
    Severity["NORMAL"] = "NORMAL";
    Severity["INFO"] = "INFO";
    Severity["SUCCESS"] = "SUCCESS";
})(Severity || (exports.Severity = Severity = {}));
var EventStatus;
(function (EventStatus) {
    EventStatus["ACTIVE"] = "ACTIVE";
    EventStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    EventStatus["INVESTIGATING"] = "INVESTIGATING";
    EventStatus["RESOLVED"] = "RESOLVED";
    EventStatus["DISMISSED"] = "DISMISSED";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
var SituationStatus;
(function (SituationStatus) {
    SituationStatus["OPEN"] = "OPEN";
    SituationStatus["IN_PROGRESS"] = "IN_PROGRESS";
    SituationStatus["RESOLVED"] = "RESOLVED";
    SituationStatus["CLOSED"] = "CLOSED";
})(SituationStatus || (exports.SituationStatus = SituationStatus = {}));
var Priority;
(function (Priority) {
    Priority["P1"] = "P1";
    Priority["P2"] = "P2";
    Priority["P3"] = "P3";
    Priority["P4"] = "P4";
})(Priority || (exports.Priority = Priority = {}));
var ActionType;
(function (ActionType) {
    ActionType["ACKNOWLEDGE"] = "ACKNOWLEDGE";
    ActionType["ESCALATE"] = "ESCALATE";
    ActionType["RESOLVE"] = "RESOLVE";
    ActionType["REASSIGN"] = "REASSIGN";
    ActionType["SNOOZE"] = "SNOOZE";
    ActionType["COMMENT"] = "COMMENT";
    ActionType["RUN_PLAYBOOK"] = "RUN_PLAYBOOK";
    ActionType["NOTIFY"] = "NOTIFY";
    ActionType["LINK_EVENT"] = "LINK_EVENT";
    ActionType["UNLINK_EVENT"] = "UNLINK_EVENT";
})(ActionType || (exports.ActionType = ActionType = {}));
var ActionStatus;
(function (ActionStatus) {
    ActionStatus["PENDING"] = "PENDING";
    ActionStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ActionStatus["COMPLETED"] = "COMPLETED";
    ActionStatus["FAILED"] = "FAILED";
    ActionStatus["CANCELLED"] = "CANCELLED";
})(ActionStatus || (exports.ActionStatus = ActionStatus = {}));
var EventCategory;
(function (EventCategory) {
    EventCategory["PAYMENT"] = "PAYMENT";
    EventCategory["SUPPORT"] = "SUPPORT";
    EventCategory["SALES"] = "SALES";
    EventCategory["PRODUCT"] = "PRODUCT";
    EventCategory["INFRASTRUCTURE"] = "INFRASTRUCTURE";
    EventCategory["SECURITY"] = "SECURITY";
    EventCategory["CUSTOMER_HEALTH"] = "CUSTOMER_HEALTH";
    EventCategory["HR"] = "HR";
    EventCategory["COMPLIANCE"] = "COMPLIANCE";
    EventCategory["GENERAL"] = "GENERAL";
})(EventCategory || (exports.EventCategory = EventCategory = {}));
var TrendDirection;
(function (TrendDirection) {
    TrendDirection["UP"] = "UP";
    TrendDirection["DOWN"] = "DOWN";
    TrendDirection["STABLE"] = "STABLE";
})(TrendDirection || (exports.TrendDirection = TrendDirection = {}));
var AlertTriggerType;
(function (AlertTriggerType) {
    AlertTriggerType["EVENT_MATCH"] = "EVENT_MATCH";
    AlertTriggerType["THRESHOLD"] = "THRESHOLD";
    AlertTriggerType["ANOMALY"] = "ANOMALY";
    AlertTriggerType["SCHEDULE"] = "SCHEDULE";
})(AlertTriggerType || (exports.AlertTriggerType = AlertTriggerType = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["SLACK"] = "SLACK";
    NotificationChannel["PAGERDUTY"] = "PAGERDUTY";
    NotificationChannel["WEBHOOK"] = "WEBHOOK";
    NotificationChannel["IN_APP"] = "IN_APP";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["ACTIVE"] = "ACTIVE";
    AlertStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    AlertStatus["SNOOZED"] = "SNOOZED";
    AlertStatus["RESOLVED"] = "RESOLVED";
    AlertStatus["DISMISSED"] = "DISMISSED";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
var ComponentStatus;
(function (ComponentStatus) {
    ComponentStatus["HEALTHY"] = "HEALTHY";
    ComponentStatus["WARNING"] = "WARNING";
    ComponentStatus["CRITICAL"] = "CRITICAL";
    ComponentStatus["UNKNOWN"] = "UNKNOWN";
})(ComponentStatus || (exports.ComponentStatus = ComponentStatus = {}));
