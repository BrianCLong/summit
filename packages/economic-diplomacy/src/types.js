"use strict";
/**
 * Economic Diplomacy Types
 * Comprehensive types for monitoring trade negotiations, economic partnerships, and economic statecraft
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartnershipType = exports.NegotiationPhase = exports.NegotiationType = void 0;
var NegotiationType;
(function (NegotiationType) {
    NegotiationType["BILATERAL_TRADE"] = "BILATERAL_TRADE";
    NegotiationType["MULTILATERAL_TRADE"] = "MULTILATERAL_TRADE";
    NegotiationType["FREE_TRADE_AGREEMENT"] = "FREE_TRADE_AGREEMENT";
    NegotiationType["INVESTMENT_TREATY"] = "INVESTMENT_TREATY";
    NegotiationType["TAX_TREATY"] = "TAX_TREATY";
    NegotiationType["ECONOMIC_PARTNERSHIP"] = "ECONOMIC_PARTNERSHIP";
    NegotiationType["CUSTOMS_UNION"] = "CUSTOMS_UNION";
    NegotiationType["SINGLE_MARKET"] = "SINGLE_MARKET";
    NegotiationType["PREFERENTIAL_TRADE"] = "PREFERENTIAL_TRADE";
    NegotiationType["SECTOR_SPECIFIC"] = "SECTOR_SPECIFIC";
})(NegotiationType || (exports.NegotiationType = NegotiationType = {}));
var NegotiationPhase;
(function (NegotiationPhase) {
    NegotiationPhase["PRELIMINARY"] = "PRELIMINARY";
    NegotiationPhase["EXPLORATORY"] = "EXPLORATORY";
    NegotiationPhase["SCOPING"] = "SCOPING";
    NegotiationPhase["FORMAL_NEGOTIATION"] = "FORMAL_NEGOTIATION";
    NegotiationPhase["TECHNICAL_TALKS"] = "TECHNICAL_TALKS";
    NegotiationPhase["FINALIZATION"] = "FINALIZATION";
    NegotiationPhase["LEGAL_SCRUBBING"] = "LEGAL_SCRUBBING";
    NegotiationPhase["SIGNATURE"] = "SIGNATURE";
    NegotiationPhase["RATIFICATION"] = "RATIFICATION";
    NegotiationPhase["IMPLEMENTATION"] = "IMPLEMENTATION";
    NegotiationPhase["SUSPENDED"] = "SUSPENDED";
    NegotiationPhase["CONCLUDED"] = "CONCLUDED";
    NegotiationPhase["FAILED"] = "FAILED";
})(NegotiationPhase || (exports.NegotiationPhase = NegotiationPhase = {}));
var PartnershipType;
(function (PartnershipType) {
    PartnershipType["STRATEGIC_ECONOMIC_PARTNERSHIP"] = "STRATEGIC_ECONOMIC_PARTNERSHIP";
    PartnershipType["COMPREHENSIVE_PARTNERSHIP"] = "COMPREHENSIVE_PARTNERSHIP";
    PartnershipType["DEVELOPMENT_PARTNERSHIP"] = "DEVELOPMENT_PARTNERSHIP";
    PartnershipType["INVESTMENT_PARTNERSHIP"] = "INVESTMENT_PARTNERSHIP";
    PartnershipType["TECHNOLOGY_PARTNERSHIP"] = "TECHNOLOGY_PARTNERSHIP";
    PartnershipType["ENERGY_PARTNERSHIP"] = "ENERGY_PARTNERSHIP";
    PartnershipType["INFRASTRUCTURE_PARTNERSHIP"] = "INFRASTRUCTURE_PARTNERSHIP";
    PartnershipType["DIGITAL_PARTNERSHIP"] = "DIGITAL_PARTNERSHIP";
    PartnershipType["GREEN_PARTNERSHIP"] = "GREEN_PARTNERSHIP";
})(PartnershipType || (exports.PartnershipType = PartnershipType = {}));
