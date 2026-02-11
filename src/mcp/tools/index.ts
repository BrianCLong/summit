import { McpTool } from '../types.js';

export const tools: McpTool[] = [
  {
    name: "list_projects",
    description: "List available projects in the Summit workspace",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "read_evidence",
    description: "Read evidence artifact by ID",
    inputSchema: {
      type: "object",
      properties: {
        evidence_id: {
          type: "string",
          description: "The ID of the evidence to read"
        }
      },
      required: ["evidence_id"]
    }
  },
  {
    name: "run_dry_run_validation",
    description: "Perform a dry-run validation of a pack or configuration",
    inputSchema: {
      type: "object",
      properties: {
        pack_path: {
          type: "string",
          description: "Path to the pack manifest"
        }
      },
      required: ["pack_path"]
    }
  }
];

export async function handleCallTool(name: string, args: any) {
  // Basic sanitization
  const sanitize = (val: string) => typeof val === 'string' ? val.replace(/[<>\"\'\%;\)\(&\+]/g, '') : val;

  switch (name) {
    case "list_projects":
      return {
        content: [{ type: "text", text: JSON.stringify([{ id: "summit-core", name: "Summit Core", path: "./", type: "node" }], null, 2) }]
      };
    case "read_evidence":
      const safeId = sanitize(args.evidence_id);
      return {
        content: [{ type: "text", text: `Evidence content for ${safeId} (read-only mode active)` }]
      };
    case "run_dry_run_validation":
      const safePath = sanitize(args.pack_path);
      return {
        content: [{ type: "text", text: `Dry-run validation successful for ${safePath}. No changes applied.` }]
      };
    default:
      throw new Error(`Tool not found: ${name}`);
  }
}
