import { jest } from '@jest/globals';

const axiosGetMock = jest.fn();
jest.unstable_mockModule('axios', () => ({
    default: {
        get: axiosGetMock,
    },
}));

const setRegionStatusMock = jest.fn();
const getStatusMock = jest.fn();
jest.unstable_mockModule('../../../services/RegionalAvailabilityService.js', () => ({
    RegionalAvailabilityService: {
        getInstance: () => ({
            setRegionStatus: setRegionStatusMock,
            getStatus: getStatusMock,
        }),
    },
}));

jest.unstable_mockModule('../../../config/regional-config.js', () => ({
    getCurrentRegion: () => 'us-east-1',
    REGIONAL_CONFIG: {
        'us-east-1': { region: 'us-east-1', baseUrl: 'https://us-east.summit.io' },
        'us-west-2': { region: 'us-west-2', baseUrl: 'https://us-west.summit.io' },
    },
}));

const { FailoverOrchestrator } = await import('../FailoverOrchestrator.js');

describe('FailoverOrchestrator', () => {
    let orchestrator: InstanceType<typeof FailoverOrchestrator>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        orchestrator = FailoverOrchestrator.getInstance();

        getStatusMock.mockReturnValue({
            failoverMode: 'AUTOMATIC',
            regions: {
                'us-east-1': { status: 'HEALTHY' },
                'us-west-2': { status: 'HEALTHY' },
            }
        });
    });

    afterEach(() => {
        orchestrator.stop();
        jest.useRealTimers();
    });

    it('should mark region as DOWN after failure threshold', async () => {
        axiosGetMock.mockRejectedValue(new Error('Timeout'));

        orchestrator.start();

        // Trigger 3 checks
        for (let i = 0; i < 3; i++) {
            jest.advanceTimersByTime(30000);
            await Promise.resolve(); // allow promises to settle
        }

        expect(setRegionStatusMock).toHaveBeenCalledWith('us-west-2', 'DOWN');
    });

    it('should recover region if health check succeeds', async () => {
        axiosGetMock.mockResolvedValue({ status: 200 });

        // Simulate current state is failure (manually trigger one failure first)
        // We need to access private state or just run it multiple times.
        // Let's assume it was down and now recovers.

        // To test recovery, we first need to get it to a failed state.
        axiosGetMock.mockRejectedValueOnce(new Error('Fail'));
        orchestrator.start();
        jest.advanceTimersByTime(30000);
        await Promise.resolve();

        axiosGetMock.mockResolvedValue({ status: 200 });
        jest.advanceTimersByTime(30000);
        await Promise.resolve();

        expect(setRegionStatusMock).toHaveBeenCalledWith('us-west-2', 'HEALTHY');
    });
});
