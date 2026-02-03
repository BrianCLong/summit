import { MCPRequest, MCPResponse, MCPTool } from '../../types.js';
import { narrativeSimulationManager } from '../../../narrative/manager.js';
import { Neo4jNarrativeLoader } from '../../../narrative/adapters/neo4j-loader.js';
import { randomUUID } from 'node:crypto';

export class NarrativeMCPServer {
    public static readonly tools: MCPTool[] = [
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

    public async handleRequest(request: MCPRequest): Promise<MCPResponse> {
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
        } catch (error: any) {
            return {
                jsonrpc: '2.0',
                id,
                error: { code: -32000, message: error.message }
            };
        }
    }

    private async runSimulation(args: any): Promise<any> {
        const { rootId, ticks = 5, themes = ['Security', 'Trust'] } = args;
        const initialEntities = await Neo4jNarrativeLoader.loadFromGraph(rootId, 2);

        if (initialEntities.length === 0) {
            throw new Error(`No graph data found for root entity ${rootId}`);
        }

        const simState = narrativeSimulationManager.createSimulation({
            name: `Agent simulation ${randomUUID()}`,
            themes,
            initialEntities
        });

        const finalState = await narrativeSimulationManager.tick(simState.id, ticks);

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

    private async injectEvent(args: any): Promise<any> {
        const { simulationId, actorId, description, intensity } = args;
        narrativeSimulationManager.injectActorAction(simulationId, actorId, description, { intensity });
        return { success: true };
    }

    private async getState(args: any): Promise<any> {
        const { simulationId } = args;
        const state = narrativeSimulationManager.getState(simulationId);
        if (!state) throw new Error(`Simulation ${simulationId} not found`);
        return state;
    }
}
