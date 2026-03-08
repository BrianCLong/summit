"use strict";
/**
 * Treaty Verification Package
 *
 * Monitors compliance with nuclear nonproliferation treaties
 * including NPT, CTBT, CWC, BWC, and IAEA safeguards.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CWCMonitor = exports.IAEASafeguardsMonitor = exports.CTBTMonitor = exports.NPTMonitor = exports.ComplianceStatus = exports.Treaty = void 0;
__exportStar(require("./types.js"), exports);
__exportStar(require("./npt-monitor.js"), exports);
__exportStar(require("./ctbt-monitor.js"), exports);
__exportStar(require("./iaea-safeguards.js"), exports);
__exportStar(require("./cwc-monitor.js"), exports);
var Treaty;
(function (Treaty) {
    Treaty["NPT"] = "npt";
    Treaty["CTBT"] = "ctbt";
    Treaty["CWC"] = "cwc";
    Treaty["BWC"] = "bwc";
    Treaty["IAEA_SAFEGUARDS"] = "iaea_safeguards";
    Treaty["ADDITIONAL_PROTOCOL"] = "additional_protocol";
    Treaty["START"] = "start";
    Treaty["INF"] = "inf"; // Intermediate-Range Nuclear Forces
})(Treaty || (exports.Treaty = Treaty = {}));
var ComplianceStatus;
(function (ComplianceStatus) {
    ComplianceStatus["COMPLIANT"] = "compliant";
    ComplianceStatus["NON_COMPLIANT"] = "non_compliant";
    ComplianceStatus["PARTIAL_COMPLIANCE"] = "partial_compliance";
    ComplianceStatus["UNDER_REVIEW"] = "under_review";
    ComplianceStatus["NOT_PARTY"] = "not_party";
    ComplianceStatus["WITHDRAWN"] = "withdrawn";
})(ComplianceStatus || (exports.ComplianceStatus = ComplianceStatus = {}));
class NPTMonitor {
    compliance = new Map();
    updateCompliance(data) {
        this.compliance.set(data.country, data);
    }
    getNonCompliantCountries() {
        return Array.from(this.compliance.values())
            .filter(c => c.status === ComplianceStatus.NON_COMPLIANT);
    }
    getWithdrawals() {
        return Array.from(this.compliance.values())
            .filter(c => c.status === ComplianceStatus.WITHDRAWN);
    }
}
exports.NPTMonitor = NPTMonitor;
class CTBTMonitor {
    detections = new Map();
    recordSeismicEvent(event) {
        this.detections.set(event.id, event);
    }
    getPotentialViolations() {
        return Array.from(this.detections.values()).filter(d => d.potential_test);
    }
}
exports.CTBTMonitor = CTBTMonitor;
class IAEASafeguardsMonitor {
    safeguards = new Map();
    updateSafeguards(data) {
        this.safeguards.set(data.country, data);
    }
    getCountriesWithBroaderConclusion() {
        return Array.from(this.safeguards.values())
            .filter(s => s.broader_conclusion)
            .map(s => s.country);
    }
    getCountriesWithoutAdditionalProtocol() {
        return Array.from(this.safeguards.values())
            .filter(s => !s.additional_protocol)
            .map(s => s.country);
    }
}
exports.IAEASafeguardsMonitor = IAEASafeguardsMonitor;
class CWCMonitor {
    compliance = new Map();
    assessCompliance(country, data) {
        const destruction_rate = data.declared_stockpile > 0 ?
            (data.destroyed / data.declared_stockpile) * 100 : 100;
        if (destruction_rate >= 90 && data.facilities_declared > 0) {
            return ComplianceStatus.COMPLIANT;
        }
        else if (destruction_rate >= 50) {
            return ComplianceStatus.PARTIAL_COMPLIANCE;
        }
        return ComplianceStatus.NON_COMPLIANT;
    }
}
exports.CWCMonitor = CWCMonitor;
