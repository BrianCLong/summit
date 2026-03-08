"use strict";
/**
 * Threat hunting types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HuntStatus = exports.HuntType = void 0;
var HuntType;
(function (HuntType) {
    HuntType["HYPOTHESIS_DRIVEN"] = "HYPOTHESIS_DRIVEN";
    HuntType["INDICATOR_BASED"] = "INDICATOR_BASED";
    HuntType["TTP_BASED"] = "TTP_BASED";
    HuntType["ANOMALY_BASED"] = "ANOMALY_BASED";
    HuntType["INTELLIGENCE_DRIVEN"] = "INTELLIGENCE_DRIVEN";
})(HuntType || (exports.HuntType = HuntType = {}));
var HuntStatus;
(function (HuntStatus) {
    HuntStatus["PLANNING"] = "PLANNING";
    HuntStatus["IN_PROGRESS"] = "IN_PROGRESS";
    HuntStatus["PAUSED"] = "PAUSED";
    HuntStatus["COMPLETED"] = "COMPLETED";
    HuntStatus["CANCELLED"] = "CANCELLED";
})(HuntStatus || (exports.HuntStatus = HuntStatus = {}));
