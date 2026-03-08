"use strict";
/**
 * Pattern Genesis Engine - Core Engine
 * Predicts patterns that don't exist yet - future motifs of system behavior
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternGenesisEngine = void 0;
exports.createPatternGenesisEngine = createPatternGenesisEngine;
const ProtoPatternDetector_js_1 = require("./algorithms/ProtoPatternDetector.js");
const PatternEvolver_js_1 = require("./algorithms/PatternEvolver.js");
const CompetitionSimulator_js_1 = require("./algorithms/CompetitionSimulator.js");
const DominancePredictor_js_1 = require("./algorithms/DominancePredictor.js");
class PatternGenesisEngine {
    detector;
    evolver;
    simulator;
    predictor;
    protoPatterns = new Map();
    motifs = new Map();
    competitions = new Map();
    config;
    constructor(config) {
        this.config = {
            detectionSensitivity: 0.7,
            evolutionSteps: 10,
            competitionRounds: 5,
            dominanceThreshold: 0.6,
            ...config,
        };
        this.detector = new ProtoPatternDetector_js_1.ProtoPatternDetector(this.config.detectionSensitivity);
        this.evolver = new PatternEvolver_js_1.PatternEvolver(this.config.evolutionSteps);
        this.simulator = new CompetitionSimulator_js_1.CompetitionSimulator(this.config.competitionRounds);
        this.predictor = new DominancePredictor_js_1.DominancePredictor(this.config.dominanceThreshold);
    }
    async detectProtoPatterns(data, domain) {
        const result = await this.detector.detect(data, domain);
        for (const pattern of result.patterns) {
            this.protoPatterns.set(pattern.id, pattern);
        }
        return result;
    }
    async evolvePattern(patternId, environmentalFactors) {
        const pattern = this.protoPatterns.get(patternId);
        if (!pattern) {
            throw new Error(`Proto-pattern not found: ${patternId}`);
        }
        const result = await this.evolver.evolve(pattern, environmentalFactors);
        if (result.motif) {
            this.motifs.set(result.motif.id, result.motif);
        }
        return result;
    }
    async predictMotifs(domain, horizon) {
        // Get all proto-patterns for domain
        const domainPatterns = [...this.protoPatterns.values()].filter((p) => p.domain === domain);
        const evolvedMotifs = [];
        for (const pattern of domainPatterns) {
            const result = await this.evolver.evolve(pattern, { horizon });
            if (result.motif && result.motif.maturityScore >= 0.5) {
                evolvedMotifs.push(result.motif);
                this.motifs.set(result.motif.id, result.motif);
            }
        }
        return evolvedMotifs;
    }
    async runCompetition(patternIds) {
        const patterns = patternIds
            .map((id) => this.protoPatterns.get(id) || this.motifs.get(id))
            .filter((p) => p !== undefined);
        if (patterns.length < 2) {
            throw new Error('Competition requires at least 2 patterns');
        }
        const result = await this.simulator.simulate(patterns);
        if (result.competition) {
            this.competitions.set(result.competition.id, result.competition);
        }
        return result;
    }
    async getDominantPatterns(domain) {
        let patterns = [...this.motifs.values()];
        if (domain) {
            patterns = patterns.filter((p) => p.domain === domain);
        }
        return this.predictor.predict(patterns);
    }
    seedPattern(name, domain, signature) {
        const pattern = {
            id: crypto.randomUUID(),
            name,
            domain,
            signature,
            strength: 0.1,
            stability: 0.5,
            growthRate: 0.0,
            firstDetected: new Date(),
            lastUpdated: new Date(),
        };
        this.protoPatterns.set(pattern.id, pattern);
        return pattern;
    }
    getProtoPattern(patternId) {
        return this.protoPatterns.get(patternId);
    }
    getMotif(motifId) {
        return this.motifs.get(motifId);
    }
    getCompetition(competitionId) {
        return this.competitions.get(competitionId);
    }
    getAllProtoPatterns() {
        return [...this.protoPatterns.values()];
    }
    getAllMotifs() {
        return [...this.motifs.values()];
    }
    getCompetitions() {
        return [...this.competitions.values()];
    }
    async runFullAnalysis(data, domain, horizon) {
        // 1. Detect proto-patterns
        const detectionResult = await this.detectProtoPatterns(data, domain);
        // 2. Evolve patterns to motifs
        const evolvedMotifs = await this.predictMotifs(domain, horizon);
        // 3. Run competitions if multiple motifs
        const competitions = [];
        if (evolvedMotifs.length >= 2) {
            const compResult = await this.runCompetition(evolvedMotifs.map((m) => m.id));
            if (compResult.competition) {
                competitions.push(compResult.competition);
            }
        }
        // 4. Predict dominant patterns
        const dominantPatterns = await this.getDominantPatterns(domain);
        return {
            protoPatterns: detectionResult.patterns,
            evolvedMotifs,
            competitions,
            dominantPatterns,
        };
    }
}
exports.PatternGenesisEngine = PatternGenesisEngine;
function createPatternGenesisEngine(config) {
    return new PatternGenesisEngine(config);
}
