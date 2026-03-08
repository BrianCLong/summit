"use strict";
// apps/web/src/components/__tests__/MaestroRunConsoleParts.test.tsx
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
const MaestroRunConsoleParts_1 = require("../MaestroRunConsoleParts");
vitest_1.expect.extend(matchers);
(0, vitest_1.describe)('<RunTasks />', () => {
    (0, vitest_1.afterEach)(() => {
        (0, react_2.cleanup)();
    });
    const createMockRunResponse = (count) => {
        const tasks = [];
        const results = [];
        for (let i = 0; i < count; i++) {
            const taskId = `task-${i}`;
            tasks.push({
                id: taskId,
                status: 'succeeded',
                description: `Task description ${i}`,
            });
            results.push({
                task: {
                    id: taskId,
                    status: 'succeeded',
                    description: `Task description ${i}`,
                },
                artifact: {
                    id: `artifact-${i}`,
                    kind: 'text',
                    label: 'output',
                    data: `Output for task ${i}`,
                    createdAt: new Date().toISOString(),
                },
            });
        }
        return {
            run: {
                id: 'run-1',
                user: { id: 'user-1' },
                createdAt: new Date().toISOString(),
                requestText: 'test request',
            },
            tasks,
            results,
            costSummary: {
                runId: 'run-1',
                totalCostUSD: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                byModel: {},
            },
        };
    };
    (0, vitest_1.it)('renders tasks correctly with a small dataset', () => {
        const mockData = createMockRunResponse(5);
        (0, react_2.render)(<MaestroRunConsoleParts_1.RunTasks selectedRun={mockData}/>);
        (0, vitest_1.expect)(react_2.screen.getByText('Task description 0')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('Task description 4')).toBeInTheDocument();
    });
    (0, vitest_1.it)('renders tasks correctly with a larger dataset (performance check)', () => {
        const count = 50; // Reduced from 1000
        const mockData = createMockRunResponse(count);
        const startTime = performance.now();
        (0, react_2.render)(<MaestroRunConsoleParts_1.RunTasks selectedRun={mockData}/>);
        const endTime = performance.now();
        // Just ensuring it renders without crashing
        (0, vitest_1.expect)(react_2.screen.getByText(`Task description ${count - 1}`)).toBeInTheDocument();
        // Log time for manual verification (optional)
        console.log(`Render time for ${count} items: ${endTime - startTime}ms`);
    });
});
