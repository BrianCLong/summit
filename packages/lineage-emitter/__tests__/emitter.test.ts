import { LineageEmitter, EventType } from "../src/openlineage";
import { z } from "zod";

describe("LineageEmitter", () => {
  it("should create a valid OpenLineage event", () => {
    const emitter = new LineageEmitter("https://github.com/intelgraph/summit");
    const runId = "123e4567-e89b-12d3-a456-426614174000";
    const event = emitter.createEvent(
      EventType.Enum.START,
      runId,
      "my-namespace",
      "my-job"
    );

    expect(event.eventType).toBe("START");
    expect(event.run.runId).toBe(runId);
    expect(event.job.namespace).toBe("my-namespace");
    expect(event.job.name).toBe("my-job");
    expect(event.producer).toBe("https://github.com/intelgraph/summit");
    expect(event.eventTime).toBeDefined();
  });

  it("should fail if runId is invalid", () => {
    const emitter = new LineageEmitter("https://github.com/intelgraph/summit");
    expect(() => {
      emitter.createEvent(
        EventType.Enum.START,
        "invalid-uuid",
        "my-namespace",
        "my-job"
      );
    }).toThrow(z.ZodError);
  });
});
