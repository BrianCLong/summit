"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfidenceBands = exports.AttributionBand = void 0;
var AttributionBand;
(function (AttributionBand) {
    AttributionBand["LOW"] = "C1";
    AttributionBand["MODERATE"] = "C2";
    AttributionBand["HIGH"] = "C3";
})(AttributionBand || (exports.AttributionBand = AttributionBand = {}));
class ConfidenceBands {
    static calculateBand(score) {
        if (score.technicalCertainty > 0.8 && score.politicalRisk < 0.3) {
            return AttributionBand.HIGH;
        }
        else if (score.technicalCertainty > 0.5) {
            return AttributionBand.MODERATE;
        }
        return AttributionBand.LOW;
    }
    static getDisclosureReadiness(band) {
        switch (band) {
            case AttributionBand.HIGH: return "Public / Legal";
            case AttributionBand.MODERATE: return "Partner Sharing";
            case AttributionBand.LOW: return "Internal Only";
        }
    }
}
exports.ConfidenceBands = ConfidenceBands;
