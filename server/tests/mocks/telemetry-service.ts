import { jest } from '@jest/globals';

export const telemetryService = {
    track: jest.fn(),
};

export class TelemetryService {
    constructor() {
        return telemetryService;
    }
    track = telemetryService.track;
}

export default telemetryService;
