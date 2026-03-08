"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwinService = void 0;
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const index_js_1 = require("../types/index.js");
const logger = (0, pino_1.default)({ name: 'TwinService' });
class TwinService {
    repository;
    stateEstimator;
    eventBus;
    constructor(repository, stateEstimator, eventBus) {
        this.repository = repository;
        this.stateEstimator = stateEstimator;
        this.eventBus = eventBus;
    }
    async createTwin(request, userId) {
        const now = new Date();
        const id = (0, uuid_1.v4)();
        const metadata = {
            id,
            name: request.name,
            type: request.type,
            description: request.description,
            version: '1.0.0',
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            tags: request.tags ?? [],
        };
        const initialStateVector = {
            timestamp: now,
            confidence: 1.0,
            source: 'CREATION',
            properties: request.initialState ?? {},
        };
        const twin = index_js_1.DigitalTwinSchema.parse({
            metadata,
            state: 'INITIALIZING',
            currentStateVector: initialStateVector,
            stateHistory: [initialStateVector],
            dataBindings: (request.dataBindings ?? []).map((b) => ({
                ...b,
                id: (0, uuid_1.v4)(),
            })),
            relationships: [],
            provenanceChain: [`created:${userId}:${now.toISOString()}`],
        });
        await this.repository.save(twin);
        await this.repository.createNeo4jNode(twin);
        await this.eventBus.publish({
            id: (0, uuid_1.v4)(),
            twinId: id,
            type: 'STATE_CHANGE',
            timestamp: now,
            payload: { state: 'INITIALIZING', previousState: null },
            source: 'TwinService',
        });
        logger.info({ twinId: id, name: request.name }, 'Digital twin created');
        return twin;
    }
    async getTwin(twinId) {
        return this.repository.findById(twinId);
    }
    async listTwins(filters) {
        return this.repository.findAll(filters);
    }
    async updateState(request) {
        const twin = await this.repository.findById(request.twinId);
        if (!twin) {
            throw new Error(`Twin not found: ${request.twinId}`);
        }
        const estimatedState = await this.stateEstimator.estimate(twin, request.properties, request.confidence ?? 0.9);
        const newStateVector = {
            timestamp: new Date(),
            confidence: estimatedState.confidence,
            source: request.source,
            properties: estimatedState.properties,
            derived: estimatedState.derived,
        };
        twin.stateHistory.push(twin.currentStateVector);
        twin.currentStateVector = newStateVector;
        twin.metadata.updatedAt = new Date();
        twin.provenanceChain.push(`update:${request.source}:${newStateVector.timestamp.toISOString()}`);
        if (twin.stateHistory.length > 1000) {
            twin.stateHistory = twin.stateHistory.slice(-1000);
        }
        await this.repository.save(twin);
        await this.repository.updateNeo4jNode(twin);
        await this.eventBus.publish({
            id: (0, uuid_1.v4)(),
            twinId: request.twinId,
            type: 'DATA_SYNC',
            timestamp: newStateVector.timestamp,
            payload: { properties: request.properties, confidence: estimatedState.confidence },
            source: request.source,
        });
        return twin;
    }
    async setTwinState(twinId, state) {
        const twin = await this.repository.findById(twinId);
        if (!twin) {
            throw new Error(`Twin not found: ${twinId}`);
        }
        const previousState = twin.state;
        twin.state = state;
        twin.metadata.updatedAt = new Date();
        await this.repository.save(twin);
        await this.eventBus.publish({
            id: (0, uuid_1.v4)(),
            twinId,
            type: 'STATE_CHANGE',
            timestamp: new Date(),
            payload: { state, previousState },
            source: 'TwinService',
        });
    }
    async linkTwins(sourceTwinId, targetTwinId, relationshipType, properties) {
        const [source, target] = await Promise.all([
            this.repository.findById(sourceTwinId),
            this.repository.findById(targetTwinId),
        ]);
        if (!source || !target) {
            throw new Error('One or both twins not found');
        }
        source.relationships.push({
            targetTwinId,
            type: relationshipType,
            properties,
        });
        await this.repository.save(source);
        await this.repository.createNeo4jRelationship(sourceTwinId, targetTwinId, relationshipType, properties);
        logger.info({ sourceTwinId, targetTwinId, relationshipType }, 'Twins linked');
    }
    async deleteTwin(twinId) {
        await this.repository.delete(twinId);
        await this.repository.deleteNeo4jNode(twinId);
        logger.info({ twinId }, 'Digital twin deleted');
    }
}
exports.TwinService = TwinService;
