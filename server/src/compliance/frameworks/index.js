"use strict";
/**
 * Compliance Frameworks Module
 *
 * Exports all compliance framework implementations:
 * - FedRAMP (Moderate Baseline)
 * - PCI-DSS v4.0
 * - NIST CSF 2.0
 * - CMMC 2.0
 *
 * SOC 2 Controls: CC3.1 (Risk Assessment), CC5.1 (Control Environment)
 *
 * @module compliance/frameworks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOMAIN_METADATA = exports.LEVEL_DESCRIPTIONS = exports.getCMMCControlsService = exports.CMMCControlsService = exports.TIER_DESCRIPTIONS = exports.CATEGORY_METADATA = exports.FUNCTION_METADATA = exports.getNISTCSFControlsService = exports.NISTCSFControlsService = exports.GOAL_DESCRIPTIONS = exports.REQUIREMENT_METADATA = exports.getPCIDSSControlsService = exports.PCIDSSControlsService = exports.getFedRAMPControlsService = exports.FedRAMPControlsService = void 0;
exports.getFrameworkMetadata = getFrameworkMetadata;
// FedRAMP Exports
var FedRAMPControls_js_1 = require("./FedRAMPControls.js");
Object.defineProperty(exports, "FedRAMPControlsService", { enumerable: true, get: function () { return FedRAMPControls_js_1.FedRAMPControlsService; } });
Object.defineProperty(exports, "getFedRAMPControlsService", { enumerable: true, get: function () { return FedRAMPControls_js_1.getFedRAMPControlsService; } });
// PCI-DSS Exports
var PCIDSSControls_js_1 = require("./PCIDSSControls.js");
Object.defineProperty(exports, "PCIDSSControlsService", { enumerable: true, get: function () { return PCIDSSControls_js_1.PCIDSSControlsService; } });
Object.defineProperty(exports, "getPCIDSSControlsService", { enumerable: true, get: function () { return PCIDSSControls_js_1.getPCIDSSControlsService; } });
Object.defineProperty(exports, "REQUIREMENT_METADATA", { enumerable: true, get: function () { return PCIDSSControls_js_1.REQUIREMENT_METADATA; } });
Object.defineProperty(exports, "GOAL_DESCRIPTIONS", { enumerable: true, get: function () { return PCIDSSControls_js_1.GOAL_DESCRIPTIONS; } });
// NIST CSF Exports
var NISTCSFControls_js_1 = require("./NISTCSFControls.js");
Object.defineProperty(exports, "NISTCSFControlsService", { enumerable: true, get: function () { return NISTCSFControls_js_1.NISTCSFControlsService; } });
Object.defineProperty(exports, "getNISTCSFControlsService", { enumerable: true, get: function () { return NISTCSFControls_js_1.getNISTCSFControlsService; } });
Object.defineProperty(exports, "FUNCTION_METADATA", { enumerable: true, get: function () { return NISTCSFControls_js_1.FUNCTION_METADATA; } });
Object.defineProperty(exports, "CATEGORY_METADATA", { enumerable: true, get: function () { return NISTCSFControls_js_1.CATEGORY_METADATA; } });
Object.defineProperty(exports, "TIER_DESCRIPTIONS", { enumerable: true, get: function () { return NISTCSFControls_js_1.TIER_DESCRIPTIONS; } });
// CMMC Exports
var CMMCControls_js_1 = require("./CMMCControls.js");
Object.defineProperty(exports, "CMMCControlsService", { enumerable: true, get: function () { return CMMCControls_js_1.CMMCControlsService; } });
Object.defineProperty(exports, "getCMMCControlsService", { enumerable: true, get: function () { return CMMCControls_js_1.getCMMCControlsService; } });
Object.defineProperty(exports, "LEVEL_DESCRIPTIONS", { enumerable: true, get: function () { return CMMCControls_js_1.LEVEL_DESCRIPTIONS; } });
Object.defineProperty(exports, "DOMAIN_METADATA", { enumerable: true, get: function () { return CMMCControls_js_1.DOMAIN_METADATA; } });
/**
 * Get metadata for all implemented frameworks
 */
function getFrameworkMetadata() {
    return [
        {
            id: 'FedRAMP',
            name: 'Federal Risk and Authorization Management Program',
            version: 'Moderate Baseline (Rev 5)',
            description: 'Standardized approach to security assessment for cloud products and services used by federal agencies.',
            controlCount: 325,
            applicableTo: ['Federal Agencies', 'Cloud Service Providers'],
            certificationRequired: true,
        },
        {
            id: 'PCI-DSS',
            name: 'Payment Card Industry Data Security Standard',
            version: '4.0',
            description: 'Information security standard for organizations that handle branded credit cards.',
            controlCount: 250,
            applicableTo: ['Merchants', 'Payment Processors', 'Service Providers'],
            certificationRequired: true,
        },
        {
            id: 'NIST-CSF',
            name: 'NIST Cybersecurity Framework',
            version: '2.0',
            description: 'Voluntary framework for managing cybersecurity risk based on industry standards and best practices.',
            controlCount: 106,
            applicableTo: ['All Organizations', 'Critical Infrastructure'],
            certificationRequired: false,
        },
        {
            id: 'CMMC',
            name: 'Cybersecurity Maturity Model Certification',
            version: '2.0',
            description: 'DoD cybersecurity requirements for defense contractors to protect Controlled Unclassified Information.',
            controlCount: 130,
            applicableTo: ['Defense Contractors', 'DoD Supply Chain'],
            certificationRequired: true,
        },
    ];
}
