// Stub for PR gate tool
export const prGateTool = {
  name: "pr_gate",
  description: "Check PR gate status",
  parameters: {
    type: "object",
    properties: {
      prId: { type: "string" }
    },
    required: ["prId"]
  },
  execute: async (args: { prId: string }) => {
    return {
      content: [
        {
          type: "text",
          text: `PR Gate status for ${args.prId}: PASS`
        }
      ],
      _meta: {
        ui: {
          resourceUri: `ui://summit/pr-gate/dashboard?prId=${args.prId}`
        }
      }
    };
  }
};
