"use strict";
/**
 * Alert type definitions for deepfake detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationChannel = exports.AlertStatus = exports.AlertSeverity = void 0;
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["LOW"] = "LOW";
    AlertSeverity["MEDIUM"] = "MEDIUM";
    AlertSeverity["HIGH"] = "HIGH";
    AlertSeverity["CRITICAL"] = "CRITICAL";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["OPEN"] = "OPEN";
    AlertStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    AlertStatus["IN_PROGRESS"] = "IN_PROGRESS";
    AlertStatus["RESOLVED"] = "RESOLVED";
    AlertStatus["FALSE_POSITIVE"] = "FALSE_POSITIVE";
    AlertStatus["DISMISSED"] = "DISMISSED";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["UI"] = "UI";
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["WEBHOOK"] = "WEBHOOK";
    NotificationChannel["SLACK"] = "SLACK";
    NotificationChannel["SMS"] = "SMS";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
