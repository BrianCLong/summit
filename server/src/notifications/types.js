"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigestFrequency = exports.NotificationStatus = exports.NotificationPriority = exports.NotificationChannel = void 0;
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["SMS"] = "SMS";
    NotificationChannel["PUSH"] = "PUSH";
    NotificationChannel["IN_APP"] = "IN_APP";
    NotificationChannel["WEBHOOK"] = "WEBHOOK";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "LOW";
    NotificationPriority["MEDIUM"] = "MEDIUM";
    NotificationPriority["HIGH"] = "HIGH";
    NotificationPriority["CRITICAL"] = "CRITICAL";
})(NotificationPriority || (exports.NotificationPriority = NotificationPriority = {}));
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["PENDING"] = "PENDING";
    NotificationStatus["SENT"] = "SENT";
    NotificationStatus["FAILED"] = "FAILED";
    NotificationStatus["READ"] = "READ";
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
var DigestFrequency;
(function (DigestFrequency) {
    DigestFrequency["NONE"] = "NONE";
    DigestFrequency["DAILY"] = "DAILY";
    DigestFrequency["WEEKLY"] = "WEEKLY";
})(DigestFrequency || (exports.DigestFrequency = DigestFrequency = {}));
