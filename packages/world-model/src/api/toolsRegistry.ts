export const tools = [
  {
    name: "get_entity_state",
    description: "Return current state of an entity",
    input_schema: {
      type: "object",
      properties: {
        entity_id: { type: "string" },
        type: { type: "string" }
      },
      required: ["entity_id", "type"]
    }
  },
  {
    name: "get_entity_history",
    description: "Return event history of an entity",
    input_schema: {
      type: "object",
      properties: {
        entity_id: { type: "string" }
      },
      required: ["entity_id"]
    }
  },
  {
    name: "get_next_actions",
    description: "Return policy-allowed next actions for an entity",
    input_schema: {
      type: "object",
      properties: {
        entity_id: { type: "string" },
        type: { type: "string" }
      },
      required: ["entity_id", "type"]
    }
  },
  {
    name: "simulate_transition",
    description: "Simulate a state transition without saving",
    input_schema: {
      type: "object",
      properties: {
        entity_id: { type: "string" },
        type: { type: "string" },
        event: {
          type: "object"
        }
      },
      required: ["entity_id", "type", "event"]
    }
  }
];
