"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const exporter_1 = require("../../src/integrations/splunk/exporter");
const axios_1 = __importDefault(require("axios"));
globals_1.jest.mock('axios');
(0, globals_1.describe)('SplunkSIEMSink', () => {
    (0, globals_1.it)('should send events to Splunk HEC', async () => {
        const config = {
            type: 'splunk',
            enabled: true,
            endpoint: 'https://splunk.example.com/services/collector',
            token: 'test-token'
        };
        const sink = new exporter_1.SplunkSIEMSink(config);
        const events = [{
                id: '1',
                timestamp: new Date(),
                eventType: 'audit',
                source: 'switchboard',
                severity: 'low',
                message: 'test',
                details: {}
            }];
        await sink.send(events);
        (0, globals_1.expect)(axios_1.default.post).toHaveBeenCalledWith('https://splunk.example.com/services/collector', globals_1.expect.stringContaining('"event":{"id":"1"'), globals_1.expect.objectContaining({
            headers: globals_1.expect.objectContaining({ 'Authorization': 'Splunk test-token' })
        }));
    });
});
