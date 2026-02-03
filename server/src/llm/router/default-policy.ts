// @ts-nocheck

import { RoutingPolicy, RoutingContext, RoutingDecision, ProviderId, ModelId } from '../types.js';

export class DefaultRoutingPolicy implements RoutingPolicy {

  chooseModel(ctx: RoutingContext): RoutingDecision {
    // Basic logic mirroring providerRouter.js logic

    // 1. High Risk / Agent / Tool Call -> Powerful model
    if (ctx.riskLevel === 'high' || ctx.purpose === 'agent' || ctx.purpose === 'tool_call') {
       if (process.env.OPENAI_API_KEY) {
           return { provider: 'openai', model: 'gpt-4o', reason: 'high_risk_requires_strong_model' };
       }
       if (process.env.ANTHROPIC_API_KEY) {
           return { provider: 'anthropic', model: 'claude-3-5-sonnet-20240620', reason: 'fallback_strong_model' };
       }
    }

    // 2. RAG Answer -> Balanced
    if (ctx.purpose === 'rag_answer') {
        if (process.env.OPENAI_API_KEY) {
            return { provider: 'openai', model: 'gpt-4o-mini', reason: 'rag_balanced' };
        }
    }

    // 3. Low Risk / Summarization -> Cheap/Fast
    if (ctx.riskLevel === 'low' || ctx.purpose === 'summarization' || ctx.purpose === 'classification') {
        if (process.env.OPENAI_API_KEY) {
             return { provider: 'openai', model: 'gpt-4o-mini', reason: 'cost_optimized' };
        }
        if (process.env.ANTHROPIC_API_KEY) {
             return { provider: 'anthropic', model: 'claude-3-haiku-20240307', reason: 'cost_optimized' };
        }
    }

    // 4. Trial Innovation Lane -> NVIDIA NIM Kimi K2.5
    if (process.env.NVIDIA_NIM_API_KEY && (ctx.purpose === 'agent' || ctx.purpose === 'tool_call')) {
        return { provider: 'nvidia-nim', model: 'moonshotai/kimi-k2.5', reason: 'innovation_lane_reasoning' };
    }

    // Fallback to Mock if no keys
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.NVIDIA_NIM_API_KEY) {
        return { provider: 'mock', model: 'mock-model', reason: 'no_api_keys_configured' };
    }

    // Default Fallback
    return { provider: 'openai', model: 'gpt-4o-mini', reason: 'default_fallback' };
  }
}
