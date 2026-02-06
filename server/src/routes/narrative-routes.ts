import { Router, Request, Response } from 'express';
import { narrativeSimulationManager } from '../narrative/manager.js';
import { RedisService } from '../cache/redis.js';
import { trace, Span } from '@opentelemetry/api';

const router = Router();
const tracer = trace.getTracer('narrative-routes', '1.0.0');
const singleParam = (value: string | string[] | undefined): string =>
    Array.isArray(value) ? value[0] : value ?? '';

const redis = RedisService.getInstance();

/**
 * GET /api/narrative/:simId/arcs
 * Returns time-series arc data for visualization
 */
router.get('/:simId/arcs', async (req: Request, res: Response) => {
    return tracer.startActiveSpan('narrative.get_arcs', async (span: Span) => {
        try {
            const simId = singleParam(req.params.simId);
            span.setAttribute('simulation_id', simId);

            // Check cache first
            const cacheKey = `narrative:arcs:${simId}`;
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    span.setAttribute('cache_hit', true);
                    return res.json(JSON.parse(cached));
                }
            } catch (cacheError) {
                console.warn('Redis cache read failed:', cacheError);
                // Continue without cache
            }

            // Get simulation state
            const state = narrativeSimulationManager.getState(simId);
            if (!state) {
                span.setAttribute('error', 'simulation_not_found');
                return res.status(404).json({
                    error: 'Simulation not found',
                    simulationId: simId
                });
            }

            // Extract arc time-series data
            // For now, we return the current arc state
            // In a full implementation, we'd track arc history over time
            const arcData = {
                simulationId: simId,
                currentTick: state.tick,
                arcs: state.arcs.map(arc => ({
                    theme: arc.theme,
                    momentum: arc.momentum,
                    outlook: arc.outlook,
                    confidence: arc.confidence,
                    keyEntities: arc.keyEntities,
                    narrative: arc.narrative
                })),
                // TODO: Add historical arc data when we implement tick-by-tick tracking
                history: []
            };

            // Cache if simulation is not active (tick hasn't changed in a while)
            // For simplicity, we'll cache all responses with a short TTL
            try {
                await redis.set(cacheKey, JSON.stringify(arcData), 60); // 60 second TTL
            } catch (cacheError) {
                console.warn('Redis cache write failed:', cacheError);
            }

            span.setAttribute('arc_count', state.arcs.length);
            span.setAttribute('tick', state.tick);

            res.json(arcData);
        } catch (error: any) {
            span.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            console.error('Error fetching narrative arcs:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        } finally {
            span.end();
        }
    });
});

/**
 * GET /api/narrative/:simId/events
 * Returns all events that occurred during the simulation
 */
router.get('/:simId/events', async (req: Request, res: Response) => {
    return tracer.startActiveSpan('narrative.get_events', async (span: Span) => {
        try {
            const simId = singleParam(req.params.simId);
            span.setAttribute('simulation_id', simId);

            // Check cache
            const cacheKey = `narrative:events:${simId}`;
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    span.setAttribute('cache_hit', true);
                    return res.json(JSON.parse(cached));
                }
            } catch (cacheError) {
                console.warn('Redis cache read failed:', cacheError);
            }

            // Get simulation state
            const state = narrativeSimulationManager.getState(simId);
            if (!state) {
                span.setAttribute('error', 'simulation_not_found');
                return res.status(404).json({
                    error: 'Simulation not found',
                    simulationId: simId
                });
            }

            // Return recent events
            const eventData = {
                simulationId: simId,
                currentTick: state.tick,
                events: state.recentEvents.map(event => ({
                    id: event.id,
                    tick: event.scheduledTick || state.tick,
                    type: event.type,
                    actorId: event.actorId,
                    targetIds: event.targetIds,
                    theme: event.theme,
                    intensity: event.intensity,
                    description: event.description,
                    metadata: event.metadata
                }))
            };

            // Cache with short TTL
            try {
                await redis.set(cacheKey, JSON.stringify(eventData), 60);
            } catch (cacheError) {
                console.warn('Redis cache write failed:', cacheError);
            }

            span.setAttribute('event_count', state.recentEvents.length);

            res.json(eventData);
        } catch (error: any) {
            span.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            console.error('Error fetching narrative events:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        } finally {
            span.end();
        }
    });
});

/**
 * GET /api/narrative/:simId/summary
 * Returns a summary of the simulation state
 */
router.get('/:simId/summary', async (req: Request, res: Response) => {
    return tracer.startActiveSpan('narrative.get_summary', async (span: Span) => {
        try {
            const simId = singleParam(req.params.simId);
            span.setAttribute('simulation_id', simId);

            const summary = narrativeSimulationManager.getState(simId);
            if (!summary) {
                return res.status(404).json({
                    error: 'Simulation not found',
                    simulationId: simId
                });
            }

            res.json({
                id: summary.id,
                name: summary.name,
                tick: summary.tick,
                themes: summary.themes,
                entityCount: Object.keys(summary.entities).length,
                arcCount: summary.arcs.length,
                recentEventCount: summary.recentEvents.length,
                narrative: summary.narrative
            });
        } catch (error: any) {
            span.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            console.error('Error fetching simulation summary:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        } finally {
            span.end();
        }
    });
});

export default router;
