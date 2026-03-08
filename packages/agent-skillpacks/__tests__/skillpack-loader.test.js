"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:fs/promises"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const skillpack_loader_js_1 = require("../src/skillpack-loader.js");
describe('skillpack loader', () => {
    it('injects distilled tools for selected shard', async () => {
        const tempDir = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'skillpack-'));
        const skillDir = node_path_1.default.join(tempDir, 'ui-preview');
        await promises_1.default.mkdir(skillDir, { recursive: true });
        await promises_1.default.writeFile(node_path_1.default.join(skillDir, 'SKILL.md'), `---\nname: ui-preview\ndescription: UI tooling\ntriggers:\n  tasks: [review]\nshards: [default, deep]\n---\nDocs`);
        await promises_1.default.writeFile(node_path_1.default.join(skillDir, 'mcp.json'), JSON.stringify({
            servers: {
                playwright: {
                    includeTools: ['screenshot'],
                    shards: {
                        default: ['screenshot'],
                        deep: ['screenshot', 'trace'],
                    },
                },
            },
        }, null, 2));
        await (0, skillpack_loader_js_1.cacheToolSchema)({
            cacheDir: node_path_1.default.join(tempDir, 'cache'),
            serverName: 'playwright',
            toolName: 'screenshot',
            schema: {
                name: 'screenshot',
                description: 'Capture UI screenshot',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string' },
                    },
                },
            },
        });
        const { distilledTools, report } = await (0, skillpack_loader_js_1.injectSkillpackTools)({
            skillpackDir: skillDir,
            shardContext: { taskType: 'review', governanceMode: 'pr' },
            availableTools: { playwright: ['screenshot', 'trace'] },
            cacheDir: node_path_1.default.join(tempDir, 'cache'),
            policy: { allow: ['screenshot'], defaultBehavior: 'deny' },
        });
        expect(distilledTools).toHaveLength(1);
        expect(distilledTools[0].name).toBe('screenshot');
        expect(report.totals.toolsInjected).toBe(1);
    });
});
