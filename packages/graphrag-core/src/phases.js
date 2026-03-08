"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Phase = void 0;
/**
 * GraphRAG Phase definitions
 */
var Phase;
(function (Phase) {
    /**
     * High-recall graph expansion to generate candidate hypotheses/explanations.
     */
    Phase["DISCOVERY"] = "DISCOVERY";
    /**
     * Strict, minimal Cypher "evidence APIs" that return proof-grade subgraphs only.
     */
    Phase["JUSTIFICATION"] = "JUSTIFICATION";
})(Phase || (exports.Phase = Phase = {}));
