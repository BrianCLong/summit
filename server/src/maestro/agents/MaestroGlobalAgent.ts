import { globalTrafficSteering } from '../../runtime/global/GlobalTrafficSteering.js';
import { Task } from '../types.js';
import logger from '../../utils/logger.js';

export class MaestroGlobalAgent {
    private static instance: MaestroGlobalAgent;

    private constructor() { }

    public static getInstance(): MaestroGlobalAgent {
        if (!MaestroGlobalAgent.instance) {
            MaestroGlobalAgent.instance = new MaestroGlobalAgent();
        }
        return MaestroGlobalAgent.instance;
    }

    /**
     * Determines if a task can be executed in the current region for the given tenant.
     * If not, it provides steering advice.
     */
    async evaluateRouting(task: Task): Promise<{
        allowed: boolean;
        action: 'STAY' | 'REDIRECT' | 'STOP';
        advice?: string;
        reason: string;
    }> {
        const tenantId = (task.input as any)?.tenantId;
        if (!tenantId) {
            return {
                allowed: true,
                action: 'STAY',
                reason: 'System operation or missing tenant context'
            };
        }

        const decision = await globalTrafficSteering.resolveRegion(tenantId);

        if (!decision.isOptimal) {
            // Log the sub-optimal routing for observability
            logger.warn({
                taskId: task.id,
                tenantId,
                currentRegion: process.env.SUMMIT_REGION || 'us-east-1',
                optimalRegion: decision.targetRegion,
                reason: decision.reason
            }, 'Maestro Global Steering Advice: Sub-optimal region detected');

            return {
                allowed: false,
                action: 'REDIRECT',
                advice: decision.targetRegion,
                reason: decision.reason
            };
        }

        return {
            allowed: true,
            action: 'STAY',
            reason: 'Routing is optimal'
        };
    }
}

export const maestroGlobalAgent = MaestroGlobalAgent.getInstance();
