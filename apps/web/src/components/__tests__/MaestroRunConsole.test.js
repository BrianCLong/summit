"use strict";
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// apps/web/src/components/__tests__/MaestroRunConsole.test.tsx
/**
 * @vitest-environment jsdom
 */
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
const react_1 = __importDefault(require("react"));
const vitest_1 = require("vitest");
const react_2 = require("@testing-library/react");
const matchers = __importStar(require("@testing-library/jest-dom/matchers"));
const MaestroRunConsole_1 = require("../MaestroRunConsole");
vitest_1.expect.extend(matchers);
const api = __importStar(require("../../lib/api/maestro"));
(0, vitest_1.describe)('<MaestroRunConsole />', () => {
    (0, vitest_1.afterEach)(() => {
        (0, react_2.cleanup)();
    });
    const mockRunResponse = {
        run: {
            id: 'run-1',
            user: { id: 'user-123' },
            createdAt: new Date().toISOString(),
            requestText: 'test request',
        },
        tasks: [
            {
                id: 'task-1',
                status: 'succeeded',
                description: 'Execute user request: test request',
            },
        ],
        results: [
            {
                task: {
                    id: 'task-1',
                    status: 'succeeded',
                    description: 'Execute user request: test request',
                },
                artifact: {
                    id: 'artifact-1',
                    kind: 'text',
                    label: 'task-output',
                    data: 'hello world',
                    createdAt: new Date().toISOString(),
                },
            },
        ],
        costSummary: {
            runId: 'run-1',
            totalCostUSD: 0.0012,
            totalInputTokens: 42,
            totalOutputTokens: 84,
            byModel: {
                'openai:gpt-4.1': {
                    costUSD: 0.0012,
                    inputTokens: 42,
                    outputTokens: 84,
                },
            },
        },
    };
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.spyOn(api, 'runMaestroRequest').mockResolvedValue(mockRunResponse);
    });
    vitest_1.it.skip('renders quick prompts and runs Maestro pipeline on submit', async () => {
        (0, react_2.render)(<MaestroRunConsole_1.MaestroRunConsole userId="user-123"/>);
        (0, vitest_1.expect)(react_2.screen.getByText(/Maestro Run Console/i)).toBeInTheDocument();
        // Verify quick prompts
        (0, vitest_1.expect)(react_2.screen.getByText('Try:')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('Analyze the last 3 PRs for security risks')).toBeInTheDocument();
        const textarea = react_2.screen.getByPlaceholderText(/describe what you want/i);
        react_2.fireEvent.change(textarea, { target: { value: 'test request' } });
        const button = react_2.screen.getByRole('button', { name: /run with maestro/i });
        react_2.fireEvent.click(button);
        await (0, react_2.waitFor)(() => (0, vitest_1.expect)(api.runMaestroRequest).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
            userId: 'user-123',
            requestText: 'test request',
        })));
        // Summary
        (0, vitest_1.expect)(await react_2.screen.findByText(/run-1/)).toBeInTheDocument();
        // The component displays it with 4 decimals (appears twice: total and per-model)
        (0, vitest_1.expect)(react_2.screen.getAllByText(/\$0.0012/)[0]).toBeInTheDocument();
        // Task description & artifact output
        const descriptions = react_2.screen.getAllByText('Execute user request: test request');
        (0, vitest_1.expect)(descriptions.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(descriptions[0]).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('hello world')).toBeInTheDocument();
    });
    (0, vitest_1.it)('copies artifact to clipboard', async () => {
        const writeTextMock = vitest_1.vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        });
        (0, react_2.render)(<MaestroRunConsole_1.MaestroRunConsole userId="user-123"/>);
        const textarea = react_2.screen.getByPlaceholderText(/describe what you want/i);
        react_2.fireEvent.change(textarea, { target: { value: 'test request' } });
        react_2.fireEvent.click(react_2.screen.getByRole('button', { name: /run with maestro/i }));
        await (0, react_2.waitFor)(() => (0, vitest_1.expect)(react_2.screen.getByText('hello world')).toBeInTheDocument());
        // The copy button is initially hidden/opacity 0 but present in DOM
        const copyButton = react_2.screen.getByRole('button', { name: /copy to clipboard/i });
        (0, vitest_1.expect)(copyButton).toBeInTheDocument();
        react_2.fireEvent.click(copyButton);
        (0, vitest_1.expect)(writeTextMock).toHaveBeenCalledWith('hello world');
        // Check for success state (aria-label changes)
        await (0, react_2.waitFor)(() => {
            (0, vitest_1.expect)(react_2.screen.getByRole('button', { name: /copied/i })).toBeInTheDocument();
        });
    });
    (0, vitest_1.it)('shows error when API fails', async () => {
        api.runMaestroRequest.mockRejectedValueOnce(new Error('API down'));
        (0, react_2.render)(<MaestroRunConsole_1.MaestroRunConsole userId="user-123"/>);
        const textarea = react_2.screen.getByPlaceholderText(/describe what you want/i);
        react_2.fireEvent.change(textarea, { target: { value: 'test request' } });
        const button = react_2.screen.getByRole('button', { name: /run with maestro/i });
        react_2.fireEvent.click(button);
        await (0, react_2.waitFor)(() => (0, vitest_1.expect)(react_2.screen.getByText(/API down/i)).toBeInTheDocument());
    });
});
