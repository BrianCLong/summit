import { StdioClient } from '../../../src/mcp/client/stdio_client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('StdioClient', () => {
    let client: StdioClient;

    beforeAll(async () => {
        const serverPath = path.resolve(__dirname, '../fixtures/echo_server.ts');
        // Give it a bit more time to spawn
        client = new StdioClient('npx', ['tsx', serverPath]);
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
