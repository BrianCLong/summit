import { describe, it, expect, jest } from '@jest/globals';
import { SplunkSIEMSink } from '../../src/integrations/splunk/exporter';
import axios from 'axios';

jest.mock('axios');

describe('SplunkSIEMSink', () => {
    it('should send events to Splunk HEC', async () => {
        const config = {
            type: 'splunk' as const,
            enabled: true,
            endpoint: 'https://splunk.example.com/services/collector',
            token: 'test-token'
        };
        const sink = new SplunkSIEMSink(config);
        const events = [{
            id: '1',
            timestamp: new Date(),
            eventType: 'audit',
            source: 'switchboard',
            severity: 'low' as const,
            message: 'test',
            details: {}
        }];

        await sink.send(events);

        expect(axios.post).toHaveBeenCalledWith(
            'https://splunk.example.com/services/collector',
            expect.stringContaining('"event":{"id":"1"'),
            expect.objectContaining({
                headers: expect.objectContaining({ 'Authorization': 'Splunk test-token' })
            })
        );
    });
});
