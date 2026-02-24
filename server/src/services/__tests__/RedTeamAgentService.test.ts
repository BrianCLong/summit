import { redTeamAgentService } from '../RedTeamAgentService.js';
import { narrativeSimulationManager, SimulationEngineService } from '../SimulationEngineService.js';

// Mock the SimulationEngineService
jest.mock('../SimulationEngineService.js', () => {
    return {
        narrativeSimulationManager: {
            getState: jest.fn(),
            injectActorAction: jest.fn(),
            engines: new Map()
        }
    };
});

describe('RedTeamAgentService', () => {
    const simId = 'test-sim-123';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should successfully loop and hit the win condition', async () => {
        // 1. Mock the state to start below target, then hit target on tick 2
        let callCount = 0;
        (narrativeSimulationManager.getState as jest.Mock).mockImplementation(() => {
            callCount++;
            return {
                id: simId,
                tick: callCount,
                themes: ['Panic'],
                entities: {
                    'e1': {
                        id: 'e1',
                        name: 'Target Group',
                        themes: { 'Panic': 1.0 },
                        history: [
                            { tick: callCount, sentiment: callCount === 1 ? -0.5 : 0.8, influence: 1.0 }
                        ]
                    }
                }
            };
        });

        // We need a dummy engine to mock `.tick()`
        const mockEngine = { tick: jest.fn() };
        (narrativeSimulationManager as any).engines.set(simId, mockEngine);

        // 2. Start campaign
        const campaignId = await redTeamAgentService.startCampaign({
            simulationId: simId,
            targetTheme: 'Panic',
            targetMomentum: 0.8,
            maxTicks: 5
        });

        expect(campaignId).toBeDefined();

        // 3. Advance timers so the setInterval runs
        // First tick (momentum will be below 0.8)
        jest.advanceTimersByTime(2100);

        // It should have injected an event
        expect(narrativeSimulationManager.injectActorAction).toHaveBeenCalled();
        expect(mockEngine.tick).toHaveBeenCalled();

        // Second tick (momentum goes to 0.9, > 0.8)
        jest.advanceTimersByTime(2100);

        // 4. Verify report
        const report = redTeamAgentService.getReport(campaignId);
        expect(report).toBeDefined();
        expect(report!.status).toBe('success');
        expect(report!.ticksElapsed).toBe(2);
        expect(report!.markdownDoc).toContain('Status:** SUCCESS');
        expect(report!.markdownDoc).toContain('The agent injected 1 adversarial events.');
    });
});
