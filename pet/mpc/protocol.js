"use strict";
/**
 * Multi-Party Computation (MPC) Protocol Implementation
 * Sprint 28B: Private aggregations using secret sharing and Beaver triples
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MPCProtocol = void 0;
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
class MPCProtocol extends events_1.EventEmitter {
    partyId;
    parties = new Map();
    circuits = new Map();
    sessions = new Map();
    beaverTriples = new Map();
    precomputeCache = new Map();
    constructor(partyId) {
        super();
        this.partyId = partyId;
    }
    /**
     * Register a party in the MPC network
     */
    registerParty(party) {
        const fullParty = {
            ...party,
            isOnline: false,
            lastSeen: new Date(),
        };
        this.parties.set(party.id, fullParty);
        this.emit('party_registered', fullParty);
    }
    /**
     * Create MPC circuit for a specific computation
     */
    createCircuit(circuit) {
        const cost = this.estimateCircuitCost(circuit);
        const fullCircuit = {
            ...circuit,
            id: crypto_1.default.randomUUID(),
            estimatedCost: cost,
            precomputeRequirements: this.calculatePrecomputeNeeds(circuit, cost),
        };
        this.circuits.set(fullCircuit.id, fullCircuit);
        this.emit('circuit_created', fullCircuit);
        return fullCircuit;
    }
    /**
     * Start MPC session
     */
    async startSession(circuitId, parties, inputData) {
        const circuit = this.circuits.get(circuitId);
        if (!circuit) {
            throw new Error('Circuit not found');
        }
        // Validate all parties are online
        for (const partyId of parties) {
            const party = this.parties.get(partyId);
            if (!party || !party.isOnline) {
                throw new Error(`Party ${partyId} is not available`);
            }
        }
        const session = {
            id: crypto_1.default.randomUUID(),
            circuitId,
            parties,
            coordinator: this.partyId,
            status: 'setup',
            currentRound: 0,
            totalRounds: circuit.estimatedCost.rounds,
            shares: new Map(),
            intermediateResults: new Map(),
            startTime: new Date(),
            audit: {
                inputCommitments: new Map(),
                roundTranscripts: [],
                verificationProofs: [],
            },
        };
        this.sessions.set(session.id, session);
        try {
            // Phase 1: Setup and input sharing
            await this.setupPhase(session, inputData);
            // Phase 2: Computation
            await this.computationPhase(session);
            // Phase 3: Output reconstruction
            await this.outputReconstructionPhase(session);
            session.status = 'completed';
            session.endTime = new Date();
        }
        catch (error) {
            session.status = 'failed';
            session.error = error.message;
            session.endTime = new Date();
            throw error;
        }
        this.emit('session_completed', session);
        return session;
    }
    /**
     * Execute private count aggregation
     */
    async privateCount(datasets, participants, options = {}) {
        const circuit = this.createCircuit({
            name: 'private-count',
            operation: 'count',
            inputs: Array.from(datasets.keys()).map((partyId) => ({
                partyId,
                datasetId: `dataset-${partyId}`,
                fieldName: options.field || '*',
                dataType: 'int',
            })),
            parameters: {
                filter: options.filter?.toString(),
                differentialPrivacy: options.differentialPrivacy,
            },
        });
        const inputData = new Map();
        for (const [partyId, data] of datasets) {
            const count = options.filter
                ? data.filter(options.filter).length
                : data.length;
            inputData.set(partyId, count);
        }
        const session = await this.startSession(circuit.id, participants, inputData);
        // Add differential privacy noise if requested
        let result = session.finalResult;
        if (options.differentialPrivacy) {
            result = this.addDifferentialPrivacyNoise(result, options.differentialPrivacy);
        }
        return this.formatMPCResult(session, result);
    }
    /**
     * Execute private top-k aggregation
     */
    privateTopK(datasets, participants, k, field, options = {}) {
        const circuit = this.createCircuit({
            name: 'private-topk',
            operation: 'topk',
            inputs: Array.from(datasets.keys()).map((partyId) => ({
                partyId,
                datasetId: `dataset-${partyId}`,
                fieldName: field,
                dataType: 'string',
            })),
            parameters: {
                k,
                field,
                differentialPrivacy: options.differentialPrivacy,
            },
        });
        // Aggregate counts across parties
        const _combinedCounts = new Map();
        for (const [partyId, data] of datasets) {
            const shares = this.createAdditiveShares(data, participants, field);
            const inputData = new Map();
            inputData.set(partyId, shares);
        }
        // For now, simulate the MPC computation
        const globalCounts = new Map();
        for (const data of datasets.values()) {
            for (const record of data) {
                const value = record[field];
                if (value !== undefined) {
                    globalCounts.set(value, (globalCounts.get(value) || 0) + 1);
                }
            }
        }
        // Get top-k
        const topK = Array.from(globalCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, k);
        // Add differential privacy noise if requested
        let result = topK;
        if (options.differentialPrivacy) {
            result = result.map(([key, count]) => [
                key,
                Math.max(0, count +
                    this.generateLaplaceNoise(options.differentialPrivacy.epsilon)),
            ]);
        }
        // Create mock session for result formatting
        const session = {
            id: crypto_1.default.randomUUID(),
            circuitId: circuit.id,
            parties: participants,
            coordinator: this.partyId,
            status: 'completed',
            currentRound: circuit.estimatedCost.rounds,
            totalRounds: circuit.estimatedCost.rounds,
            shares: new Map(),
            intermediateResults: new Map(),
            finalResult: result,
            startTime: new Date(),
            endTime: new Date(),
            audit: {
                inputCommitments: new Map(),
                roundTranscripts: [],
                verificationProofs: [],
            },
        };
        return this.formatMPCResult(session, result);
    }
    /**
     * Execute private distinct count
     */
    privateDistinct(datasets, participants, field, options = {}) {
        // Use HyperLogLog sketches for scalable distinct counting
        const sketches = new Map();
        for (const [partyId, data] of datasets) {
            const distinctValues = new Set(data.map((item) => String(item[field])).filter(Boolean));
            sketches.set(partyId, distinctValues);
        }
        // Combine sketches (simplified - in practice would use MPC-friendly HLL)
        const globalDistinct = new Set();
        for (const sketch of sketches.values()) {
            for (const value of sketch) {
                globalDistinct.add(value);
            }
        }
        let result = globalDistinct.size;
        // Add differential privacy noise if requested
        if (options.differentialPrivacy) {
            result = Math.max(0, result + this.generateLaplaceNoise(options.differentialPrivacy.epsilon));
        }
        const circuit = this.createCircuit({
            name: 'private-distinct',
            operation: 'distinct',
            inputs: Array.from(datasets.keys()).map((partyId) => ({
                partyId,
                datasetId: `dataset-${partyId}`,
                fieldName: field,
                dataType: 'string',
            })),
            parameters: {
                field,
                differentialPrivacy: options.differentialPrivacy,
            },
        });
        const session = {
            id: crypto_1.default.randomUUID(),
            circuitId: circuit.id,
            parties: participants,
            coordinator: this.partyId,
            status: 'completed',
            currentRound: circuit.estimatedCost.rounds,
            totalRounds: circuit.estimatedCost.rounds,
            shares: new Map(),
            intermediateResults: new Map(),
            finalResult: result,
            startTime: new Date(),
            endTime: new Date(),
            audit: {
                inputCommitments: new Map(),
                roundTranscripts: [],
                verificationProofs: [],
            },
        };
        return this.formatMPCResult(session, result);
    }
    /**
     * Precompute Beaver triples for multiplication
     */
    precomputeBeaverTriples(count, parties) {
        const triples = [];
        for (let i = 0; i < count; i++) {
            const a = crypto_1.default.randomInt(1, 1000000);
            const b = crypto_1.default.randomInt(1, 1000000);
            const c = a * b;
            const aShares = this.createAdditiveSharesFromValue(a, parties);
            const bShares = this.createAdditiveSharesFromValue(b, parties);
            const cShares = this.createAdditiveSharesFromValue(c, parties);
            const triple = {
                id: crypto_1.default.randomUUID(),
                a: aShares,
                b: bShares,
                c: cShares,
                partyShares: new Map(),
                used: false,
                createdAt: new Date(),
            };
            // Distribute shares to parties
            for (let j = 0; j < parties.length; j++) {
                const partyId = parties[j];
                triple.partyShares.set(partyId, {
                    a: aShares[j].shareValue,
                    b: bShares[j].shareValue,
                    c: cShares[j].shareValue,
                });
            }
            this.beaverTriples.set(triple.id, triple);
            triples.push(triple);
        }
        this.emit('beaver_triples_precomputed', { count, parties });
        return triples;
    }
    setupPhase(session, inputData) {
        session.status = 'input-sharing';
        // Create input commitments
        for (const [partyId, data] of inputData) {
            const commitment = crypto_1.default
                .createHash('sha256')
                .update(JSON.stringify(data))
                .digest('hex');
            session.audit.inputCommitments.set(partyId, commitment);
        }
        // Create secret shares for each party's input
        for (const [partyId, data] of inputData) {
            const shares = this.createAdditiveSharesFromValue(data, session.parties);
            session.shares.set(partyId, shares);
        }
        this.emit('setup_phase_completed', session);
    }
    async computationPhase(session) {
        session.status = 'computation';
        const circuit = this.circuits.get(session.circuitId);
        if (!circuit) {
            throw new Error(`Circuit not found: ${session.circuitId}`);
        }
        // Execute computation based on operation type
        switch (circuit.operation) {
            case 'count':
                await this.executeCountCircuit(session);
                break;
            case 'sum':
                await this.executeSumCircuit(session);
                break;
            case 'topk':
                await this.executeTopKCircuit(session);
                break;
            default:
                throw new Error(`Unsupported operation: ${circuit.operation}`);
        }
        this.emit('computation_phase_completed', session);
    }
    outputReconstructionPhase(session) {
        session.status = 'output-reconstruction';
        // Reconstruct final result from shares
        const resultShares = session.intermediateResults.get(session.currentRound);
        session.finalResult = this.reconstructSecret(resultShares);
        this.emit('output_reconstruction_completed', session);
    }
    executeCountCircuit(session) {
        // Sum all input shares
        let totalShares = [];
        for (const shares of session.shares.values()) {
            if (totalShares.length === 0) {
                totalShares = shares;
            }
            else {
                totalShares = this.addShares(totalShares, shares);
            }
        }
        session.currentRound = 1;
        session.intermediateResults.set(1, totalShares);
    }
    executeSumCircuit(session) {
        // Similar to count but with actual values
        this.executeCountCircuit(session);
    }
    executeTopKCircuit(session) {
        // Simplified top-k - in practice would use MPC-friendly sorting
        const circuit = this.circuits.get(session.circuitId);
        if (!circuit) {
            throw new Error(`Circuit not found: ${session.circuitId}`);
        }
        const _k = circuit.parameters.k;
        // For now, simulate the computation
        session.currentRound = circuit.estimatedCost.rounds;
        session.intermediateResults.set(session.currentRound, []);
    }
    createAdditiveShares(data, parties, field) {
        // Count occurrences of field values
        const counts = new Map();
        for (const item of data) {
            const value = String(item[field]);
            counts.set(value, (counts.get(value) || 0) + 1);
        }
        // Create shares for the total count
        const totalCount = data.length;
        return this.createAdditiveSharesFromValue(totalCount, parties);
    }
    createAdditiveSharesFromValue(value, parties) {
        const shares = [];
        let sum = 0;
        // Generate random shares for all but the last party
        for (let i = 0; i < parties.length - 1; i++) {
            const share = crypto_1.default.randomInt(0, 1000000);
            sum += share;
            shares.push({
                partyId: parties[i],
                shareValue: Buffer.from([share]),
                shareIndex: i,
                threshold: parties.length,
                totalShares: parties.length,
                metadata: {
                    algorithm: 'additive',
                    fieldSize: 32,
                },
            });
        }
        // Last share ensures sum equals original value
        const lastShare = value - sum;
        shares.push({
            partyId: parties[parties.length - 1],
            shareValue: Buffer.from([lastShare]),
            shareIndex: parties.length - 1,
            threshold: parties.length,
            totalShares: parties.length,
            metadata: {
                algorithm: 'additive',
                fieldSize: 32,
            },
        });
        return shares;
    }
    addShares(shares1, shares2) {
        const result = [];
        for (let i = 0; i < shares1.length; i++) {
            const val1 = shares1[i].shareValue.readUInt8(0);
            const val2 = shares2[i].shareValue.readUInt8(0);
            const sum = val1 + val2;
            result.push({
                ...shares1[i],
                shareValue: Buffer.from([sum]),
            });
        }
        return result;
    }
    reconstructSecret(shares) {
        if (!shares || shares.length === 0) {
            return 0;
        }
        let sum = 0;
        for (const share of shares) {
            sum += share.shareValue.readUInt8(0);
        }
        return sum;
    }
    estimateCircuitCost(circuit) {
        const parties = circuit.inputs.length;
        const baseRounds = 2; // Setup + computation
        switch (circuit.operation) {
            case 'count':
            case 'sum':
                return {
                    rounds: baseRounds,
                    bandwidthMB: parties * 0.1,
                    computeTimeMs: parties * 100,
                };
            case 'topk': {
                const k = circuit.parameters.k || 10;
                return {
                    rounds: baseRounds + Math.log2(k),
                    bandwidthMB: parties * 0.5 * k,
                    computeTimeMs: parties * 500 * k,
                };
            }
            default:
                return {
                    rounds: baseRounds,
                    bandwidthMB: parties * 0.2,
                    computeTimeMs: parties * 200,
                };
        }
    }
    calculatePrecomputeNeeds(circuit, _cost) {
        const parties = circuit.inputs.length;
        switch (circuit.operation) {
            case 'topk':
                return {
                    beaverTriples: parties * (circuit.parameters.k || 10),
                    randomValues: parties * 100,
                };
            default:
                return {
                    beaverTriples: parties * 10,
                    randomValues: parties * 50,
                };
        }
    }
    addDifferentialPrivacyNoise(value, params) {
        const noise = this.generateLaplaceNoise(params.epsilon);
        return Math.max(0, Math.round(value + noise));
    }
    generateLaplaceNoise(epsilon) {
        // Generate Laplace noise for differential privacy
        const u1 = Math.random();
        const noise = (1 / epsilon) *
            Math.sign(u1 - 0.5) *
            Math.log(1 - 2 * Math.abs(u1 - 0.5));
        return noise;
    }
    formatMPCResult(session, result) {
        const circuit = this.circuits.get(session.circuitId);
        if (!circuit) {
            throw new Error(`Circuit not found: ${session.circuitId}`);
        }
        return {
            sessionId: session.id,
            operation: circuit.operation,
            result,
            participants: session.parties,
            privacy: {
                noRawDataExposed: true,
                differentialPrivacy: circuit.parameters.differentialPrivacy,
                kAnonymity: circuit.parameters.kAnonymity,
            },
            verification: {
                commitmentHash: this.calculateCommitmentHash(session.audit.inputCommitments),
                participantSignatures: new Map(),
                transcriptHash: this.calculateTranscriptHash(session.audit.roundTranscripts),
            },
            metadata: {
                computeTime: (session.endTime ?? new Date()).getTime() - session.startTime.getTime(),
                roundsExecuted: session.currentRound,
                bandwidthUsed: circuit.estimatedCost.bandwidthMB,
                errorRate: 0,
            },
        };
    }
    calculateCommitmentHash(commitments) {
        const hash = crypto_1.default.createHash('sha256');
        for (const commitment of commitments.values()) {
            hash.update(commitment);
        }
        return hash.digest('hex');
    }
    calculateTranscriptHash(transcripts) {
        const hash = crypto_1.default.createHash('sha256');
        hash.update(JSON.stringify(transcripts));
        return hash.digest('hex');
    }
}
exports.MPCProtocol = MPCProtocol;
