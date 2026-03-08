"use strict";
/**
 * Alert and response types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertChannel = exports.AlertStatus = void 0;
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["NEW"] = "NEW";
    AlertStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    AlertStatus["IN_PROGRESS"] = "IN_PROGRESS";
    AlertStatus["RESOLVED"] = "RESOLVED";
    AlertStatus["FALSE_POSITIVE"] = "FALSE_POSITIVE";
    AlertStatus["ESCALATED"] = "ESCALATED";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
var AlertChannel;
(function (AlertChannel) {
    AlertChannel["EMAIL"] = "EMAIL";
    AlertChannel["SMS"] = "SMS";
    AlertChannel["SLACK"] = "SLACK";
    AlertChannel["PAGERDUTY"] = "PAGERDUTY";
    AlertChannel["WEBHOOK"] = "WEBHOOK";
    AlertChannel["SIEM"] = "SIEM";
    AlertChannel["SOAR"] = "SOAR";
})(AlertChannel || (exports.AlertChannel = AlertChannel = {}));
