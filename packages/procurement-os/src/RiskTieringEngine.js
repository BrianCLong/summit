"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskTieringEngine = void 0;
const date_fns_1 = require("date-fns");
const HIGH_RISK_DATA = ['pii', 'phi', 'regulated'];
class RiskTieringEngine {
    now;
    constructor(now = () => new Date()) {
        this.now = now;
    }
    calculateTier(intake) {
        if (intake.handlesProductionTraffic || intake.criticality === 'customer-impacting') {
            return 0;
        }
        if (this.containsHighRiskData(intake.dataCategories) || intake.apiAccess) {
            return 1;
        }
        if (intake.integrationNeeds.length > 0 || intake.criticality === 'core-operations') {
            return 2;
        }
        if (intake.spendEstimate >= 50000 || intake.termMonths >= 12) {
            return 2;
        }
        return 3;
    }
    isExpiringRenewal(intake) {
        const daysUntilRenewal = (0, date_fns_1.differenceInCalendarDays)(new Date(intake.renewalDate), this.now());
        return daysUntilRenewal <= 90;
    }
    containsHighRiskData(categories) {
        return categories.some((category) => HIGH_RISK_DATA.includes(category));
    }
}
exports.RiskTieringEngine = RiskTieringEngine;
