"use strict";
/**
 * Red Team Simulation Package
 *
 * Comprehensive red team capabilities including:
 * - MITRE ATT&CK technique library
 * - Attack scenario generation
 * - Social engineering simulation
 * - Attack surface mapping
 * - Campaign management
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
exports.AttackSurfaceMapper = exports.SocialEngineeringEngine = exports.ScenarioGenerator = exports.MITRELibrary = void 0;
// Types
__exportStar(require("./types"), exports);
// MITRE ATT&CK
var mitre_library_1 = require("./mitre/mitre-library");
Object.defineProperty(exports, "MITRELibrary", { enumerable: true, get: function () { return mitre_library_1.MITRELibrary; } });
Object.defineProperty(exports, "ScenarioGenerator", { enumerable: true, get: function () { return mitre_library_1.ScenarioGenerator; } });
// Social Engineering
var social_engineering_1 = require("./social/social-engineering");
Object.defineProperty(exports, "SocialEngineeringEngine", { enumerable: true, get: function () { return social_engineering_1.SocialEngineeringEngine; } });
// Reconnaissance
var attack_surface_1 = require("./recon/attack-surface");
Object.defineProperty(exports, "AttackSurfaceMapper", { enumerable: true, get: function () { return attack_surface_1.AttackSurfaceMapper; } });
