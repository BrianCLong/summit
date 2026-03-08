"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRiskRegistry = void 0;
const ingestor_js_1 = require("./ingestor.js");
const scoring_js_1 = require("./scoring.js");
function profileKey(tool, version) {
    return `${tool}@${version}`.toLowerCase();
}
class ToolRiskRegistry {
    profiles = new Map();
    riskOptions;
    constructor(options = {}) {
        this.riskOptions = options.riskComputation ?? {};
    }
    registerTool(input) {
        const key = profileKey(input.tool, input.version);
        const now = new Date().toISOString();
        const profile = {
            tool: input.tool,
            version: input.version,
            sbomDigest: input.sbomDigest,
            dataAccessScope: input.dataAccessScope,
            networkEgressClasses: [...input.networkEgressClasses],
            cves: [],
            riskScore: 0,
            lastUpdated: now,
        };
        this.profiles.set(key, profile);
        return this.recalculate(profile);
    }
    getProfile(tool, version) {
        const key = profileKey(tool, version);
        const profile = this.profiles.get(key);
        return profile
            ? {
                ...profile,
                networkEgressClasses: [...profile.networkEgressClasses],
                cves: [...profile.cves],
            }
            : undefined;
    }
    allProfiles() {
        return Array.from(this.profiles.values()).map((profile) => ({
            ...profile,
            networkEgressClasses: [...profile.networkEgressClasses],
            cves: [...profile.cves],
        }));
    }
    ingestNvdFeed(feed) {
        for (const profile of this.profiles.values()) {
            const cves = (0, ingestor_js_1.collectRelevantCves)(feed, profile.tool);
            const updated = (0, ingestor_js_1.applyCvesToProfile)(profile, cves);
            this.recalculate(updated);
        }
    }
    updateProfile(profile) {
        const key = profileKey(profile.tool, profile.version);
        this.profiles.set(key, this.recalculate(profile));
    }
    recalculate(profile) {
        const updated = {
            ...profile,
            riskScore: (0, scoring_js_1.computeRiskScore)(profile, this.riskOptions),
            lastUpdated: new Date().toISOString(),
        };
        this.profiles.set(profileKey(profile.tool, profile.version), updated);
        return updated;
    }
    generateAllowlistManifest(signer, options) {
        const include = options.includeTools?.map((tool) => tool.toLowerCase());
        const exclude = new Set(options.excludeTools?.map((tool) => tool.toLowerCase()) ?? []);
        const entries = this.allProfiles()
            .filter((profile) => profile.riskScore <= options.riskThreshold)
            .filter((profile) => {
            const toolId = profile.tool.toLowerCase();
            if (exclude.has(toolId)) {
                return false;
            }
            if (!include) {
                return true;
            }
            return include.includes(toolId);
        })
            .map((profile) => ({
            tool: profile.tool,
            version: profile.version,
            riskScore: profile.riskScore,
            sbomDigest: profile.sbomDigest,
            dataAccessScope: profile.dataAccessScope,
            networkEgressClasses: [...profile.networkEgressClasses],
        }))
            .sort((a, b) => {
            const toolCompare = a.tool.localeCompare(b.tool);
            if (toolCompare !== 0) {
                return toolCompare;
            }
            return a.version.localeCompare(b.version);
        });
        const manifestPayload = {
            environment: options.environment,
            entries,
        };
        return signer.sign(manifestPayload);
    }
}
exports.ToolRiskRegistry = ToolRiskRegistry;
