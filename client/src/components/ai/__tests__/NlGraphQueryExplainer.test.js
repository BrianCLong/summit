"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const react_2 = require("@testing-library/react");
const NlGraphQueryExplainer_1 = __importDefault(require("../NlGraphQueryExplainer"));
describe('NlGraphQueryExplainer', () => {
    const mockResponse = {
        cypher: 'MATCH (p:Person)-[:ASSOCIATED_WITH]->(o:Organization) RETURN p, o LIMIT 5',
        explanationDetails: {
            summary: 'Finds people and organizations',
            rationale: ['Identifying graph pattern 1 to satisfy the request.'],
            evidence: [
                {
                    source: 'MATCH clause',
                    snippet: '(p:Person)-[:ASSOCIATED_WITH]->(o:Organization)',
                    reason: 'Defines the core entities and relationships to investigate.',
                },
            ],
            confidence: 0.87,
        },
        estimatedCost: {
            nodesScanned: 10,
            edgesScanned: 20,
            costClass: 'low',
            estimatedTimeMs: 5,
            estimatedMemoryMb: 2,
            costDrivers: ['uses index'],
        },
        explanation: 'Finds patterns matching multiple graph structures',
        requiredParameters: [],
        isSafe: true,
        warnings: [],
        queryId: '123',
        timestamp: new Date().toISOString(),
    };
    beforeEach(() => {
        jest.resetAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.__telemetry = { nlGraphExplanation: [] };
    });
    it('renders explanation details, toggles panels, and records telemetry', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
        });
        (0, react_2.render)(<NlGraphQueryExplainer_1.default />);
        react_2.fireEvent.change(react_2.screen.getByLabelText(/ask the copilot/i), {
            target: { value: 'Find relationships' },
        });
        react_2.fireEvent.click(react_2.screen.getByText(/explain/i));
        await (0, react_2.waitFor)(() => expect(react_2.screen.getByTestId('confidence-chip').textContent).toContain('Confidence'));
        expect(react_2.screen.getAllByTestId('rationale-item')).toHaveLength(1);
        expect(react_2.screen.getAllByTestId('evidence-item')).toHaveLength(1);
        react_2.fireEvent.click(react_2.screen.getByText(/Evidence with sources/i));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(window.__telemetry.nlGraphExplanation).toEqual(expect.arrayContaining([
            expect.objectContaining({ event: 'explanation_generated' }),
            expect.objectContaining({ section: 'evidence', event: 'explanation_toggled' }),
        ]));
        expect(react_2.screen.getByText(/Generated Cypher/i)).toBeInTheDocument();
    });
    it('shows error state when compile fails and avoids telemetry', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            json: async () => ({ code: 'BAD_REQUEST', message: 'Unable to compile prompt' }),
        });
        (0, react_2.render)(<NlGraphQueryExplainer_1.default />);
        react_2.fireEvent.click(react_2.screen.getByText(/explain/i));
        await (0, react_2.waitFor)(() => expect(react_2.screen.getByTestId('compile-error')).toHaveTextContent('Unable to compile prompt'));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(window.__telemetry.nlGraphExplanation).toHaveLength(0);
        expect(react_2.screen.queryByText(/Generated Cypher/i)).not.toBeInTheDocument();
    });
    it('renders fallback messaging when explanation details are missing', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                ...mockResponse,
                explanationDetails: {
                    summary: 'Fallback summary',
                    rationale: [],
                    evidence: [],
                    confidence: 0.6,
                },
            }),
        });
        (0, react_2.render)(<NlGraphQueryExplainer_1.default />);
        react_2.fireEvent.click(react_2.screen.getByText(/explain/i));
        await (0, react_2.waitFor)(() => expect(react_2.screen.getByText(/No rationale provided/i)).toBeInTheDocument());
        expect(react_2.screen.getByText(/No evidence captured/i)).toBeInTheDocument();
    });
    it('disables explain when prompt is blank and shows loading indicator while pending', async () => {
        jest.useFakeTimers();
        const jsonPromise = new Promise((resolve) => setTimeout(() => resolve(mockResponse), 20));
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => jsonPromise,
        });
        (0, react_2.render)(<NlGraphQueryExplainer_1.default />);
        react_2.fireEvent.change(react_2.screen.getByLabelText(/ask the copilot/i), {
            target: { value: '   ' },
        });
        expect(react_2.screen.getByText(/explain/i)).toBeDisabled();
        react_2.fireEvent.change(react_2.screen.getByLabelText(/ask the copilot/i), {
            target: { value: 'Explain loading state' },
        });
        react_2.fireEvent.click(react_2.screen.getByText(/explain/i));
        expect(react_2.screen.getByRole('progressbar')).toBeInTheDocument();
        await (0, react_1.act)(async () => {
            jest.runAllTimers();
            await jsonPromise;
        });
        await (0, react_2.waitFor)(() => expect(react_2.screen.getByText(/Generated Cypher/i)).toBeInTheDocument());
        jest.useRealTimers();
    });
});
