"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stdio_client_1 = require("../../../src/mcp/client/stdio_client");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
describe('StdioClient', () => {
    let client;
    beforeAll(async () => {
        const serverPath = path_1.default.resolve(__dirname, '../fixtures/echo_server.ts');
        // Give it a bit more time to spawn
        client = new stdio_client_1.StdioClient('npx', ['tsx', serverPath]);
        // Wait a small bit for process to be ready? initialize handles handshake.
    });
    afterAll(() => {
        client.close();
    });
    it('should initialize', async () => {
        const result = await client.initialize();
        expect(result.protocolVersion).toBe('2025-06-18');
        expect(result.serverInfo.name).toBe('echo-server');
    });
    it('should list tools', async () => {
        const result = await client.listTools();
        expect(result.tools).toHaveLength(1);
        expect(result.tools[0].name).toBe('echo');
    });
    it('should call tool', async () => {
        const result = await client.callTool('echo', { message: 'Hello MCP' });
        // @ts-ignore
        expect(result.content[0].text).toBe('Hello MCP');
    });
});
