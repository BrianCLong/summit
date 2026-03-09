import { describe, it, expect } from "vitest";
import { ChaosInjector } from "./index.js";

describe("ChaosInjector", () => {
  it("should not modify data if inactive", () => {
    const injector = new ChaosInjector({ probability: 1, active: false });
    expect(injector.inject("test")).toBe("test");
  });

  it("should modify string data if active", () => {
    const injector = new ChaosInjector({ probability: 1, active: true });
    expect(injector.inject("test")).toBe("test [POISONED]");
  });

  it("should modify array data if active", () => {
      const injector = new ChaosInjector({ probability: 1, active: true });
      expect(injector.inject(["a", "b"])).toEqual(["a", "b", "hallucinated_entity"]);
  });

  it("should modify object data if active", () => {
      const injector = new ChaosInjector({ probability: 1, active: true });
      expect(injector.inject({ key: "value" })).toEqual({ key: "value", _corrupted: true });
  });
});
