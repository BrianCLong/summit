import { ChatMessage, ToolCall } from "./types.js";

export function normalizeToolCallIdsInHistory(messages: ChatMessage[]): ChatMessage[] {
  const idMapping = new Map<string, string>();

  return messages.map((m) => {
    // Handle Assistant Tool Calls (Populate Map)
    if (m.role === "assistant" && Array.isArray(m.tool_calls)) {
       const newMessage = { ...m };
       const tool_calls = m.tool_calls!.map((tc: ToolCall, idx: number) => {
         const newId = `functions.${tc.function.name}:${idx}`;
         idMapping.set(tc.id, newId);
         return { ...tc, id: newId };
       });
       newMessage.tool_calls = tool_calls;
       return newMessage;
    }

    // Handle Tool Results (Use Map)
    if (m.role === "tool" && m.tool_call_id) {
        if (idMapping.has(m.tool_call_id)) {
            return {
                ...m,
                tool_call_id: idMapping.get(m.tool_call_id)
            };
        }
    }

    return m;
  });
}
