"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const GEOINTDashboard_js_1 = require("../ui/GEOINTDashboard.js");
const buildResponse = (data) => ({
    ok: true,
    json: async () => data,
});
describe('GEOINTDashboard clustering and pagination', () => {
    const threatDataResponse = {
        threatActors: [],
        iocs: [
            {
                id: 'ioc-1',
                type: 'IP',
                value: '10.0.0.1',
                severity: 'HIGH',
                confidence: 70,
                geolocation: { latitude: 1, longitude: 1 },
            },
        ],
        heatmap: [],
    };
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    afterEach(() => {
        if (typeof vi.unstubAllGlobals === 'function') {
            vi.unstubAllGlobals();
        }
        vi.clearAllMocks();
    });
    it('shows clustering toggle and expands clusters on zoom', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(buildResponse(threatDataResponse))
            .mockResolvedValueOnce(buildResponse({
            points: [
                { id: 'a', latitude: 1, longitude: 1, type: 'THREAT_ACTOR', name: 'Alpha' },
                { id: 'b', latitude: 1.05, longitude: 1.05, type: 'THREAT_ACTOR', name: 'Bravo' },
            ],
        }));
        vi.stubGlobal('fetch', fetchMock);
        (0, react_2.render)(<GEOINTDashboard_js_1.GEOINTDashboard initialBounds={{ minLon: -1, minLat: -1, maxLon: 2, maxLat: 2 }}/>);
        expect(await react_2.screen.findByLabelText('clustering-controls')).toBeInTheDocument();
        expect(await react_2.screen.findByText(/Cluster of 2 points/)).toBeInTheDocument();
        const zoomSlider = react_2.screen.getByRole('slider', { name: /zoom level/i });
        react_2.fireEvent.change(zoomSlider, { target: { value: '10' } });
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.queryByText(/Cluster of 2 points/)).not.toBeInTheDocument();
            expect(react_2.screen.getByText('Alpha')).toBeInTheDocument();
            expect(react_2.screen.getByText('Bravo')).toBeInTheDocument();
        });
    });
    it('paginates rendered points without affecting non-map tabs', async () => {
        const manyPoints = Array.from({ length: 12 }, (_, idx) => ({
            id: `point-${idx + 1}`,
            latitude: 10 + idx,
            longitude: -70 - idx,
            type: 'THREAT_ACTOR',
            name: `Point ${idx + 1}`,
        }));
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(buildResponse(threatDataResponse))
            .mockResolvedValueOnce(buildResponse({ points: manyPoints }));
        vi.stubGlobal('fetch', fetchMock);
        (0, react_2.render)(<GEOINTDashboard_js_1.GEOINTDashboard initialBounds={{ minLon: -180, minLat: -90, maxLon: 180, maxLat: 90 }}/>);
        expect(await react_2.screen.findByLabelText('rendered-points')).toBeInTheDocument();
        const zoomSlider = react_2.screen.getByRole('slider', { name: /zoom level/i });
        react_2.fireEvent.change(zoomSlider, { target: { value: '10' } });
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText(/Page 1 of/)).toBeInTheDocument();
        });
        const firstPageEntries = manyPoints.slice(0, 10);
        firstPageEntries.forEach((point) => {
            expect(react_2.screen.getByText(point.name)).toBeInTheDocument();
        });
        const nextButton = react_2.screen.getByRole('button', { name: /Next/i });
        react_2.fireEvent.click(nextButton);
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Point 11')).toBeInTheDocument();
            expect(react_2.screen.getByText('Point 12')).toBeInTheDocument();
        });
        react_2.fireEvent.click(react_2.screen.getByRole('button', { name: /Iocs/i }));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText(/10.0.0.1/)).toBeInTheDocument();
        });
    });
});
