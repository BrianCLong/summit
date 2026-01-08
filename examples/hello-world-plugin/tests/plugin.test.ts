/**
 * Hello World Plugin Tests
 *
 * Demonstrates how to test Summit plugins using the PluginTestHarness.
 */

import { createTestHarness, createTestSuite } from "@intelgraph/plugin-sdk";
import { createHelloWorldPlugin } from "../src/index";

describe("Hello World Plugin", () => {
  // Create a test harness for the plugin
  const harness = createTestHarness({
    pluginId: "hello-world",
    version: "1.0.0",
  });

  beforeEach(async () => {
    // Load a fresh plugin instance before each test
    const plugin = createHelloWorldPlugin({
      greeting: "Test greeting",
      enableEventLogging: false,
    });
    await harness.load(plugin);
  });

  afterEach(async () => {
    // Reset the harness state after each test
    await harness.reset();
  });

  describe("Lifecycle", () => {
    it("should initialize successfully", async () => {
      await harness.initialize();

      // Check that initialization logged the greeting
      const logs = harness.getLogger().getLogs();
      expect(logs).toContainEqual(
        expect.objectContaining({
          level: "info",
          message: "Test greeting",
        })
      );
      expect(logs).toContainEqual(
        expect.objectContaining({
          level: "info",
          message: "Plugin initialized",
        })
      );
    });

    it("should start successfully after initialization", async () => {
      await harness.initialize();
      await harness.start();

      const logs = harness.getLogger().getLogs();
      expect(logs).toContainEqual(
        expect.objectContaining({
          level: "info",
          message: "Plugin started",
        })
      );
    });

    it("should stop gracefully", async () => {
      await harness.initialize();
      await harness.start();
      await harness.stop();

      const logs = harness.getLogger().getLogs();
      expect(logs).toContainEqual(
        expect.objectContaining({
          level: "info",
          message: "Plugin stopping",
        })
      );
    });

    it("should run full lifecycle test", async () => {
      const result = await harness.runLifecycleTest();

      expect(result.passed).toBe(true);
      expect(result.stages.initialize.success).toBe(true);
      expect(result.stages.start.success).toBe(true);
      expect(result.stages.healthCheck.success).toBe(true);
      expect(result.stages.stop.success).toBe(true);
      expect(result.stages.destroy.success).toBe(true);
    });
  });

  describe("Health Check", () => {
    it("should report healthy when started", async () => {
      await harness.initialize();
      await harness.start();

      const health = await harness.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.details?.initialized).toBe(true);
      expect(health.details?.started).toBe(true);
    });
  });

  describe("Storage", () => {
    it("should store initialization timestamp", async () => {
      await harness.initialize();

      const storage = harness.getStorage();
      const storedData = storage.getAll();
      expect(storedData.has("initialized_at")).toBe(true);
    });

    it("should store start timestamp", async () => {
      await harness.initialize();
      await harness.start();

      const storage = harness.getStorage();
      const storedData = storage.getAll();
      expect(storedData.has("started_at")).toBe(true);
    });
  });
});

// Example of using the test suite runner for more comprehensive tests
describe("Hello World Plugin - Test Suite", () => {
  it("should pass all standard tests", async () => {
    const plugin = createHelloWorldPlugin();
    const suite = createTestSuite({
      pluginId: "hello-world",
      version: "1.0.0",
    });

    suite.addTest("lifecycle", "Lifecycle test", async (harness) => {
      await harness.load(plugin);
      const result = await harness.runLifecycleTest();
      return result.passed;
    });

    suite.addTest("health", "Health check test", async (harness) => {
      await harness.load(plugin);
      await harness.initialize();
      await harness.start();
      const health = await harness.healthCheck();
      return health.healthy === true;
    });

    const results = await suite.run();
    expect(results.passed).toBe(true);
    expect(results.results.every((r) => r.passed)).toBe(true);
  });
});
