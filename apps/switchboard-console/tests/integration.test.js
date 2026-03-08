"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const ConsoleSession_1 = require("../src/session/ConsoleSession");
const FakeAdapter_1 = require("../src/adapters/FakeAdapter");
(0, vitest_1.describe)('console session integration', () => {
    (0, vitest_1.it)('streams deterministic output and logs events', async () => {
        const tempRoot = await (0, promises_1.mkdtemp)(node_path_1.default.join(node_os_1.default.tmpdir(), 'switchboard-'));
        const repoRoot = node_path_1.default.resolve(__dirname, '../../..');
        const skillsetDir = node_path_1.default.join(repoRoot, '.summit', 'skillsets');
        const session = new ConsoleSession_1.ConsoleSession({
            sessionRoot: tempRoot,
            skillsetDir,
            adapters: [new FakeAdapter_1.FakeAdapter()],
        });
        await session.init();
        await session.handleInput('/agent fake');
        await session.handleInput('/skillset senior-swe');
        const response = await session.handleInput('hello');
        (0, vitest_1.expect)(response).toContain('RESPONSE:ok');
        const eventsPath = node_path_1.default.join(tempRoot, session.id, 'events.jsonl');
        const events = await (0, promises_1.readFile)(eventsPath, 'utf-8');
        (0, vitest_1.expect)(events).toContain('session_start');
        (0, vitest_1.expect)(events).toContain('tool_exec');
    });
});
