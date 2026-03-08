"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const generated_1 = require("../src/generated");
const graph_insights_json_1 = __importDefault(require("./fixtures/graph-insights.json"));
const graph_export_accepted_json_1 = __importDefault(require("./fixtures/graph-export-accepted.json"));
const graph_export_status_json_1 = __importDefault(require("./fixtures/graph-export-status.json"));
describe('IntelGraph core SDK contracts', () => {
    const baseUrl = 'https://api.contracts.intelgraph.test';
    let client;
    beforeEach(() => {
        jest.restoreAllMocks();
        client = new generated_1.IntelGraphCoreClient({ BASE: baseUrl, TOKEN: 'contract-token' });
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('parses graph insight responses according to the OpenAPI contract', async () => {
        const fetchMock = jest
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response(JSON.stringify(graph_insights_json_1.default), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        const result = await client.graphAnalytics.getGraphsInsights({
            graphId: graph_insights_json_1.default.graphId,
            limit: 5,
            severity: 'high',
        });
        expect(result).toEqual(graph_insights_json_1.default);
        expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/graphs/${graph_insights_json_1.default.graphId}/insights?limit=5&severity=high`, expect.objectContaining({ method: 'GET', headers: expect.any(Headers) }));
    });
    it('submits export jobs and maps status payloads from fixtures', async () => {
        const fetchMock = jest.spyOn(globalThis, 'fetch');
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(graph_export_accepted_json_1.default), {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
        }));
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(graph_export_status_json_1.default), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        const exportRequest = {
            format: graph_export_accepted_json_1.default.format,
            includeProperties: true,
            filters: graph_export_accepted_json_1.default.filters,
            notificationEmail: 'ops@intelgraph.ai',
        };
        const acceptedJob = await client.graphAnalytics.postGraphsExports({
            graphId: graph_export_accepted_json_1.default.graphId,
            requestBody: exportRequest,
        });
        expect(acceptedJob).toEqual(graph_export_accepted_json_1.default);
        const [postUrl, postInit] = fetchMock.mock.calls[0];
        expect(postUrl).toBe(`${baseUrl}/graphs/${graph_export_accepted_json_1.default.graphId}/exports`);
        expect(postInit).toEqual(expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(exportRequest),
            headers: expect.any(Headers),
        }));
        const statusResponse = await client.graphAnalytics.getGraphsExports({
            graphId: graph_export_status_json_1.default.graphId,
            exportId: graph_export_status_json_1.default.exportId,
        });
        expect(statusResponse).toEqual(graph_export_status_json_1.default);
        const [statusUrl, statusInit] = fetchMock.mock.calls[1];
        expect(statusUrl).toBe(`${baseUrl}/graphs/${graph_export_status_json_1.default.graphId}/exports/${graph_export_status_json_1.default.exportId}`);
        expect(statusInit).toEqual(expect.objectContaining({ method: 'GET', headers: expect.any(Headers) }));
    });
});
