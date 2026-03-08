"use strict";
/**
 * WMD Program Development Tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeaponsDevelopmentTracker = void 0;
const types_js_1 = require("./types.js");
class WeaponsDevelopmentTracker {
    programs;
    constructor() {
        this.programs = new Map();
    }
    registerProgram(program) {
        this.programs.set(program.id, program);
    }
    updateMilestone(programId, milestone) {
        const program = this.programs.get(programId);
        if (!program)
            return;
        program.milestones.push(milestone);
        this.programs.set(programId, program);
    }
    getProgramsByCountry(country) {
        return Array.from(this.programs.values()).filter(p => p.country === country);
    }
    getActivePrograms() {
        return Array.from(this.programs.values())
            .filter(p => p.status === types_js_1.ProgramStatus.ACTIVE || p.status === types_js_1.ProgramStatus.COVERT);
    }
    assessProgramMaturity(programId) {
        const program = this.programs.get(programId);
        if (!program) {
            return { maturity_level: 0, achieved_milestones: 0, total_milestones: 0 };
        }
        const achieved = program.milestones.filter(m => m.achieved).length;
        const total = program.milestones.length;
        const maturity = total > 0 ? (achieved / total) * 100 : 0;
        return {
            maturity_level: maturity,
            achieved_milestones: achieved,
            total_milestones: total
        };
    }
    identifyKeyCapabilities(programId) {
        const program = this.programs.get(programId);
        if (!program)
            return [];
        const capabilities = [];
        const tech = program.technical_capability;
        if (tech.design_capability)
            capabilities.push('Design');
        if (tech.production_capability)
            capabilities.push('Production');
        if (tech.testing_capability)
            capabilities.push('Testing');
        if (tech.deployment_capability)
            capabilities.push('Deployment');
        if (tech.miniaturization)
            capabilities.push('Miniaturization');
        return capabilities;
    }
    comparePrograms(programId1, programId2) {
        const p1 = this.programs.get(programId1);
        const p2 = this.programs.get(programId2);
        if (!p1 || !p2) {
            return { more_advanced: 'unknown', capability_gap: [] };
        }
        const caps1 = this.identifyKeyCapabilities(programId1);
        const caps2 = this.identifyKeyCapabilities(programId2);
        const gap = caps1.filter(c => !caps2.includes(c));
        return {
            more_advanced: caps1.length > caps2.length ? programId1 : programId2,
            capability_gap: gap
        };
    }
}
exports.WeaponsDevelopmentTracker = WeaponsDevelopmentTracker;
