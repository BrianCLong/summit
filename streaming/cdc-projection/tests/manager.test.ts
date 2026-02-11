import { describe, test, expect, vi } from "vitest";
import { CDCManager } from "../src/manager";

describe("CDCManager", () => {
  test("should register a source", async () => {
    const manager = new CDCManager();
    await expect(manager.addSource({ sourceId: "s1", host: "localhost" })).resolves.not.toThrow();
  });

  test("should register a projection", async () => {
    const manager = new CDCManager();
    await manager.addSource({ sourceId: "s1", host: "localhost" });

    const projection = {
      name: "test-proj",
      handle: vi.fn().mockResolvedValue(undefined)
    };

    await manager.registerProjection("s1", projection);
    expect(projection.handle).not.toHaveBeenCalled();
  });
});
