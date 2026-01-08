import { describe, it, expect, vi } from "vitest";
import { ContextCompiler } from "../src/context/ContextCompiler.js";
import { HistoryProcessor } from "../src/context/processors/HistoryProcessor.js";
import { InstructionProcessor } from "../src/context/processors/InstructionProcessor.js";
import { MemoryProcessor } from "../src/context/processors/MemoryProcessor.js";
import { Session } from "../src/context/types.js";

describe("ContextCompiler", () => {
  // 1. Setup Mock Session
  const mockSession: Session = {
    id: "session-123",
    userId: "user-456",
    events: [
      {
        id: "1",
        type: "message",
        role: "user",
        content: "Hello, world!",
        timestamp: new Date(),
      },
      {
        id: "2",
        type: "message",
        role: "assistant",
        content: "Hello! How can I help you?",
        timestamp: new Date(),
      },
    ],
    metadata: {
      systemInstructions: "You are a helpful assistant.",
    },
    variables: {},
  };

  it("should compile a simple working context", async () => {
    const compiler = new ContextCompiler([
      new InstructionProcessor(["Base instruction"]),
      new HistoryProcessor(),
    ]);

    const result = await compiler.compile(mockSession, {
      model: "test-model",
      tokenLimit: 1000,
    });

    // Assertions
    expect(result.messages).toHaveLength(3); // System, User, Assistant
    expect(result.messages[0].role).toBe("system");
    expect(result.messages[0].content).toContain("Base instruction");
    expect(result.messages[0].content).toContain("You are a helpful assistant");

    expect(result.messages[1].role).toBe("user");
    expect(result.messages[1].content).toBe("Hello, world!");

    expect(result.messages[2].role).toBe("assistant");
    expect(result.messages[2].content).toBe("Hello! How can I help you?");
  });

  it("should handle memory injection", async () => {
    const sessionWithMemory: Session = {
      ...mockSession,
      metadata: {
        relevantMemories: [{ id: "mem1", content: "User likes pizza", score: 0.9 }],
      },
    };

    const compiler = new ContextCompiler([new MemoryProcessor(), new HistoryProcessor()]);

    const result = await compiler.compile(sessionWithMemory, { model: "test-model" });

    // MemoryProcessor injects memories as a system message
    expect(result.messages).toHaveLength(3); // System (Memory), User, Assistant
    expect(result.messages[0].role).toBe("system");
    expect(result.messages[0].content).toContain("Relevant Knowledge:");
    expect(result.messages[0].content).toContain("User likes pizza");
  });
});
