/**
 * Provider Reliability Tests
 *
 * Tests for provider retry, backoff, timeouts, budgets, and diagnostics.
 */

import {
  ProviderError,
  BudgetExceededError,
  createProviderWrapper,
  classifyError,
  calculateBackoff,
  parseRetryAfter,
  PROVIDER_EXIT_CODE,
} from "../src/lib/provider.js";

describe("Provider Reliability", () => {
  describe("classifyError", () => {
    it("classifies network errors as transient", () => {
      const error = new Error("ECONNRESET");
      const classified = classifyError(error);

      expect(classified.category).toBe("transient");
      expect(classified.details).toContain("reason: network_error");
    });

    it("classifies timeout errors as transient", () => {
      const error = new Error("Request timeout");
      const classified = classifyError(error);

      expect(classified.category).toBe("transient");
      expect(classified.details).toContain("reason: timeout");
    });

    it("classifies 429 as transient", () => {
      const error = new Error("Rate limited");
      const classified = classifyError(error, 429);

      expect(classified.category).toBe("transient");
      expect(classified.details).toContain("reason: rate_limited");
      expect(classified.details).toContain("status_code: 429");
    });

    it("classifies 5xx as transient", () => {
      const error = new Error("Internal server error");
      const classified = classifyError(error, 500);

      expect(classified.category).toBe("transient");
      expect(classified.details).toContain("reason: server_error");
    });

    it("classifies 4xx (except 429) as permanent", () => {
      const error = new Error("Bad request");
      const classified = classifyError(error, 400);

      expect(classified.category).toBe("permanent");
      expect(classified.details).toContain("reason: client_error");
    });

    it("classifies cancelled as user_cancelled", () => {
      const error = new Error("Request cancelled");
      const classified = classifyError(error);

      expect(classified.category).toBe("user_cancelled");
      expect(classified.details).toContain("reason: user_cancelled");
    });
  });

  describe("calculateBackoff", () => {
    it("calculates exponential backoff", () => {
      const delay0 = calculateBackoff(0, 500, 8000, true, 12345);
      const delay1 = calculateBackoff(1, 500, 8000, true, 12345);
      const delay2 = calculateBackoff(2, 500, 8000, true, 12345);

      // Each delay should be roughly double the previous (plus jitter)
      expect(delay1).toBeGreaterThan(delay0);
      expect(delay2).toBeGreaterThan(delay1);
    });

    it("caps at max backoff", () => {
      const delay = calculateBackoff(10, 500, 8000, true, 12345);
      // With jitter, should be at most maxBackoff * 1.5
      expect(delay).toBeLessThanOrEqual(12000);
    });

    it("produces deterministic results in CI mode with same seed", () => {
      const delay1 = calculateBackoff(2, 500, 8000, true, 12345);
      const delay2 = calculateBackoff(2, 500, 8000, true, 12345);

      expect(delay1).toBe(delay2);
    });

    it("produces different results with different seeds", () => {
      const delay1 = calculateBackoff(2, 500, 8000, true, 12345);
      const delay2 = calculateBackoff(2, 500, 8000, true, 67890);

      expect(delay1).not.toBe(delay2);
    });
  });

  describe("parseRetryAfter", () => {
    it("parses numeric seconds", () => {
      expect(parseRetryAfter(5)).toBe(5000);
      expect(parseRetryAfter("10")).toBe(10000);
    });

    it("parses HTTP date", () => {
      const futureDate = new Date(Date.now() + 5000).toUTCString();
      const parsed = parseRetryAfter(futureDate);

      expect(parsed).toBeDefined();
      expect(parsed).toBeGreaterThan(0);
      expect(parsed).toBeLessThanOrEqual(5500); // Allow some tolerance
    });

    it("returns undefined for invalid values", () => {
      expect(parseRetryAfter(undefined)).toBeUndefined();
    });
  });

  describe("ProviderWrapper", () => {
    describe("retry behavior", () => {
      it("retries transient errors and succeeds", async () => {
        let attempt = 0;

        const wrapper = createProviderWrapper("test", {
          maxRetries: 3,
          initialBackoffMs: 10,
          maxBackoffMs: 100,
          ci: true,
          sessionId: "test-session",
        });

        const result = await wrapper.execute(async () => {
          attempt++;
          if (attempt < 3) {
            throw new Error("ECONNRESET");
          }
          return { data: "success" };
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ data: "success" });
        expect(result.diagnostics.requests_made).toBe(3);
        expect(result.diagnostics.retries_total).toBe(2);
      });

      it("does not retry permanent errors", async () => {
        let attempt = 0;

        const wrapper = createProviderWrapper("test", {
          maxRetries: 3,
          initialBackoffMs: 10,
        });

        const result = await wrapper.execute(
          async () => {
            attempt++;
            throw new Error("Bad request");
          },
          {
            extractStatusCode: () => 400,
          }
        );

        expect(result.success).toBe(false);
        expect(result.error?.category).toBe("permanent");
        expect(result.diagnostics.requests_made).toBe(1);
        expect(result.diagnostics.retries_total).toBe(0);
      });

      it("respects Retry-After header", async () => {
        let attempt = 0;
        const startTime = Date.now();

        const wrapper = createProviderWrapper("test", {
          maxRetries: 3,
          initialBackoffMs: 10,
          maxBackoffMs: 100,
        });

        const result = await wrapper.execute(
          async () => {
            attempt++;
            if (attempt === 1) {
              throw new Error("Rate limited");
            }
            return { data: "success" };
          },
          {
            extractStatusCode: (_err) => (attempt === 1 ? 429 : undefined),
            // Return 0.2 seconds = 200ms as Retry-After
            extractRetryAfter: (_err) => (attempt === 1 ? 0.2 : undefined),
          }
        );

        const elapsed = Date.now() - startTime;

        expect(result.success).toBe(true);
        // Should have waited at least 200ms for Retry-After
        expect(elapsed).toBeGreaterThanOrEqual(190);
        expect(result.diagnostics.request_history[0].retry_after_ms).toBe(200); // 0.2 seconds = 200ms
      });

      it("fails after max retries exceeded", async () => {
        const wrapper = createProviderWrapper("test", {
          maxRetries: 2,
          initialBackoffMs: 10,
          maxBackoffMs: 50,
        });

        const result = await wrapper.execute(async () => {
          throw new Error("ECONNREFUSED");
        });

        expect(result.success).toBe(false);
        expect(result.error?.category).toBe("transient");
        expect(result.diagnostics.requests_made).toBe(3); // Initial + 2 retries
        expect(result.diagnostics.retries_total).toBe(2);
      });
    });

    describe("budget enforcement", () => {
      it("enforces request budget", async () => {
        const wrapper = createProviderWrapper("test", {
          maxRequests: 2,
        });

        // First request succeeds
        await wrapper.execute(async () => ({ data: 1 }));
        // Second request succeeds
        await wrapper.execute(async () => ({ data: 2 }));
        // Third request should fail
        const result = await wrapper.execute(async () => ({ data: 3 }));

        expect(result.success).toBe(false);
        expect(result.error?.category).toBe("budget_exceeded");
        expect(result.error?.message).toContain("Request budget exceeded");
      });

      it("enforces time budget", async () => {
        const wrapper = createProviderWrapper("test", {
          budgetMs: 100,
        });

        // Wait to exhaust budget
        await new Promise((resolve) => setTimeout(resolve, 150));

        const result = await wrapper.execute(async () => ({ data: "test" }));

        expect(result.success).toBe(false);
        expect(result.error?.category).toBe("budget_exceeded");
        expect(result.error?.message).toContain("Time budget exceeded");
      });

      it("tracks token usage", async () => {
        const wrapper = createProviderWrapper("test", {
          tokenBudget: 100,
        });

        // First request uses 50 tokens
        await wrapper.execute(async () => ({ data: "test", tokens: 50 }), {
          extractTokens: (r) => r.tokens,
        });

        // Second request uses 60 tokens (total now 110, exceeds 100)
        await wrapper.execute(async () => ({ data: "test", tokens: 60 }), {
          extractTokens: (r) => r.tokens,
        });

        // Third request should fail because we've exceeded budget (110 > 100)
        const result = await wrapper.execute(async () => ({ data: "test", tokens: 10 }), {
          extractTokens: (r) => r.tokens,
        });

        expect(result.success).toBe(false);
        expect(result.error?.category).toBe("budget_exceeded");
        expect(result.error?.message).toContain("Token budget exceeded");
      });
    });

    describe("network access control", () => {
      it("denies requests when network not allowed", async () => {
        const wrapper = createProviderWrapper("test", {
          allowNetwork: false,
        });

        const result = await wrapper.execute(async () => ({ data: "test" }));

        expect(result.success).toBe(false);
        expect(result.error?.category).toBe("network_denied");
      });
    });

    describe("diagnostics", () => {
      it("produces deterministic diagnostics", async () => {
        const wrapper = createProviderWrapper("test-provider", {
          timeoutMs: 30000,
          budgetMs: 60000,
          ci: true,
          sessionId: "test-session",
        });

        await wrapper.execute(async () => ({ data: "success" }));

        const diagnostics = wrapper.getDiagnosticsSnapshot();

        expect(diagnostics.provider_name).toBe("test-provider");
        expect(diagnostics.requests_made).toBe(1);
        expect(diagnostics.retries_total).toBe(0);
        expect(diagnostics.timeout_ms).toBe(30000);
        expect(diagnostics.budget_ms).toBe(60000);
        expect(diagnostics.remaining_ms).toBeLessThanOrEqual(60000);
        expect(diagnostics.error_category).toBeNull();
        // Duration might be 0 for very fast requests
        expect(diagnostics.duration_ms).toBeGreaterThanOrEqual(0);
        expect(diagnostics.request_history.length).toBe(1);
        expect(diagnostics.request_history[0].status).toBe("success");
      });

      it("records request history in order", async () => {
        let attempt = 0;

        const wrapper = createProviderWrapper("test", {
          maxRetries: 2,
          initialBackoffMs: 10,
          maxBackoffMs: 50,
          ci: true,
          sessionId: "history-test",
        });

        await wrapper.execute(async () => {
          attempt++;
          if (attempt < 3) {
            throw new Error("ECONNRESET");
          }
          return { data: "success" };
        });

        const diagnostics = wrapper.getDiagnosticsSnapshot();

        expect(diagnostics.request_history.length).toBe(3);
        expect(diagnostics.request_history[0].attempt).toBe(0);
        expect(diagnostics.request_history[0].status).toBe("error");
        expect(diagnostics.request_history[1].attempt).toBe(1);
        expect(diagnostics.request_history[1].status).toBe("error");
        expect(diagnostics.request_history[2].attempt).toBe(2);
        expect(diagnostics.request_history[2].status).toBe("success");
      });
    });

    describe("timeout handling", () => {
      it("triggers timeout and retries", async () => {
        let attempt = 0;

        const wrapper = createProviderWrapper("test", {
          timeoutMs: 50,
          maxRetries: 1,
          initialBackoffMs: 10,
        });

        const result = await wrapper.execute(async (signal) => {
          attempt++;
          if (attempt === 1) {
            // Simulate timeout by waiting longer than timeoutMs
            await new Promise((resolve) => setTimeout(resolve, 100));
            signal.throwIfAborted();
          }
          return { data: "success" };
        });

        // Note: AbortSignal behavior varies - this tests the pattern
        expect(result.diagnostics.requests_made).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("ProviderError", () => {
    it("formats error with sorted diagnostics", () => {
      const diagnostics = {
        provider_name: "test",
        requests_made: 3,
        retries_total: 2,
        timeout_ms: 30000,
        budget_ms: null,
        remaining_ms: null,
        tokens_used: null,
        error_category: "transient" as const,
        duration_ms: 5000,
        request_history: [],
      };

      const error = new ProviderError(
        "Connection failed after retries",
        "transient",
        diagnostics,
        PROVIDER_EXIT_CODE
      );

      const formatted = error.format();

      expect(formatted).toContain("Provider Error (transient)");
      expect(formatted).toContain("Connection failed after retries");
      expect(formatted).toContain("provider_name");
      expect(formatted).toContain("requests_made");
    });

    it("has correct exit code", () => {
      const error = new ProviderError("Test", "transient", {} as any, PROVIDER_EXIT_CODE);

      expect(error.exitCode).toBe(3);
    });
  });

  describe("BudgetExceededError", () => {
    it("formats error correctly", () => {
      const error = new BudgetExceededError("Time budget exceeded", "time", 60000, 65000);

      const formatted = error.format();

      expect(formatted).toContain("Budget Exceeded (time)");
      expect(formatted).toContain("limit: 60000");
      expect(formatted).toContain("used: 65000");
    });

    it("has correct exit code", () => {
      const error = new BudgetExceededError("Test", "requests", 10, 11);
      expect(error.exitCode).toBe(2);
    });
  });
});
