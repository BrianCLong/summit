import { McpServer } from '../../src/mcp/server.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('MCP Abuse & Policy Regression', () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer();
  });

  it('should deny prompt injections or handle them safely', async () => {
    const abuseData = JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/abuse/mcp/prompt_injection.json'), 'utf-8'));

    for (const injection of abuseData.injections) {
      const request = {
        jsonrpc: "2.0",
        id: injection.name,
        method: "tools/call",
        params: {
          name: "read_evidence",
          arguments: { evidence_id: injection.prompt }
        }
      };

      const response = await server.handleRequest(request);
      expect(response.result.content[0].text).not.toContain("API_KEY");
      expect(response.result.content[0].text).not.toContain("PASSWORD");
      expect(response.result.content[0].text).not.toContain("<script>");
    }
  });

  it('should handle restricted path attempts safely', async () => {
     const request = {
        jsonrpc: "2.0",
        id: "traversal",
        method: "tools/call",
        params: {
          name: "run_dry_run_validation",
          arguments: { pack_path: "../../../etc/passwd" }
        }
      };

      const response = await server.handleRequest(request);
      expect(response.result.content[0].text).toContain("Dry-run validation successful");
      expect(response.result.content[0].text).not.toContain("root:x:0:0");
  });
});
