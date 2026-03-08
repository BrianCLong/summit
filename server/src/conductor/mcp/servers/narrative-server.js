"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NarrativeMCPServer = void 0;
const manager_js_1 = require("../../../narrative/manager.js");
const neo4j_loader_js_1 = require("../../../narrative/adapters/neo4j-loader.js");
const node_crypto_1 = require("node:crypto");
class NarrativeMCPServer {
    static tools = [
        {
            name: 'narrative.simulate',
            description: 'Run a predictive narrative simulation starting from a graph entity',
            schema: {
                type: 'object',
                properties: {
                    rootId: { type: 'string', description: 'Neo4j ID of the starting entity' },
                    ticks: { type: 'number', description: 'Number of simulation ticks to run', default: 5 },
                    themes: { type: 'array', items: { type: 'string' }, default: ['Security', 'Trust'] }
                },
                required: ['rootId']
            },
            scopes: ['simulation:run']
        },
        {
            name: 'narrative.inject',
            description: 'Inject an event into an active simulation',
            schema: {
                type: 'object',
                properties: {
                    simulationId: { type: 'string' },
                    actorId: { type: 'string' },
                    description: { type: 'string' },
                    intensity: { type: 'number', default: 0.5 }
                },
                required: ['simulationId', 'actorId', 'description']
            },
            scopes: ['simulation:write']
        },
        {
            name: 'narrative.get_state',
            description: 'Fetch the current state and summary of a simulation',
            schema: {
                type: 'object',
                properties: {
                    simulationId: { type: 'string' }
                },
                required: ['simulationId']
            },
            scopes: ['simulation:read']
        }
    ];
    async handleRequest(request) {
        const { method, params, id } = request;
        if (method !== 'tools/execute') {
            return { jsonrpc: '2.0', id, result: { tools: NarrativeMCPServer.tools } };
        }
        const { name, arguments: args } = params || {};
        try {
            let result;
            switch (name) {
                case 'narrative.simulate':
                    result = await this.runSimulation(args);
                    break;
                case 'narrative.inject':
                    result = await this.injectEvent(args);
                    break;
                case 'narrative.get_state':
                    result = await this.getState(args);
                    break;
                default:
                    return {
                        jsonrpc: '2.0',
                        id,
                        error: { code: -32601, message: `Tool '${name}' not found` }
                    };
            }
            return { jsonrpc: '2.0', id, result };
        }
        catch (error) {
            return {
                jsonrpc: '2.0',
                id,
                error: { code: -32000, message: error.message }
            };
        }
    }
    async runSimulation(args) {
        const { rootId, ticks = 5, themes = ['Security', 'Trust'] } = args;
        const initialEntities = await neo4j_loader_js_1.Neo4jNarrativeLoader.loadFromGraph(rootId, 2);
        if (initialEntities.length === 0) {
            throw new Error(`No graph data found for root entity ${rootId}`);
        }
        const simState = manager_js_1.narrativeSimulationManager.createSimulation({
            name: `Agent simulation ${(0, node_crypto_1.randomUUID)()}`,
            themes,
            initialEntities
        });
        const finalState = await manager_js_1.narrativeSimulationManager.tick(simState.id, ticks);
        return {
            simulationId: finalState.id,
            summary: finalState.narrative.summary,
            arcs: finalState.arcs,
            metrics: {
                tick: finalState.tick,
                entityCount: Object.keys(finalState.entities).length
            }
        };
    }
    async injectEvent(args) {
        const { simulationId, actorId, description, intensity } = args;
        manager_js_1.narrativeSimulationManager.injectActorAction(simulationId, actorId, description, { intensity });
        return { success: true };
    }
    async getState(args) {
        const { simulationId } = args;
        const state = manager_js_1.narrativeSimulationManager.getState(simulationId);
        if (!state)
            throw new Error(`Simulation ${simulationId} not found`);
        return state;
    }
}
exports.NarrativeMCPServer = NarrativeMCPServer;
