import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { prGateTool } from './tools/pr_gate.js';
import { getPrGateDashboard } from './resources/pr_gate_dashboard.js';

// Create an MCP server
const server = new McpServer({
  name: "summit-mcp",
  version: "1.0.0"
});

// Register the PR Gate tool
server.tool(
  prGateTool.name,
  prGateTool.description,
  prGateTool.parameters,
  prGateTool.execute
);

// Register the PR Gate Dashboard resource
server.resource(
  "pr-gate-dashboard",
  new ResourceTemplate("ui://summit/pr-gate/dashboard", { list: undefined }),
  async (uri, { prId }: { prId?: string } = {}) => {
    // Note: The ResourceTemplate matcher might need adjustment depending on how params are passed in the URI
    // But for now we assume the URI parsing or arguments passed separately handle it.
    // Actually, ResourceTemplate extracts variables.
    // Let's use a simpler resource definition or assume prId is passed as argument or query param if supported.
    // For UI resources in MCP Apps, it's often fetched by URI.
    // We'll extract prId from the uri query string manually if needed, or rely on the helper.
    // Given getPrGateDashboard takes prId, we extract it.
    const url = new URL(uri.href);
    const id = url.searchParams.get("prId") || "unknown";

    return {
      contents: [{
        uri: uri.href,
        text: await getPrGateDashboard(id),
        mimeType: "text/html" // Important for UI resources
      }]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Summit MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
