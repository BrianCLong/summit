import express from "express";
import z from "zod";
import { randomUUID } from "node:crypto";
import { narrativeSimulationManager } from "../narrative/manager.js";
import type { NarrativeEvent, SimulationEntity, LLMClient, LLMNarrativeRequest } from "../narrative/types.js";

const router = express.Router();

const relationshipSchema = z.object({
  targetId: z.string(),
  strength: z.number().min(0).max(1),
});

const entitySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.enum(["actor", "group"]),
  alignment: z.enum(["ally", "neutral", "opposition"]),
  influence: z.number().min(0).max(1.5),
  sentiment: z.number().min(-1).max(1),
  volatility: z.number().min(0).max(1),
  resilience: z.number().min(0).max(1),
  themes: z.record(z.number()),
  relationships: z.array(relationshipSchema).default([]),
  metadata: z.record(z.unknown()).optional(),
});

const parameterSchema = z.object({
  name: z.string(),
  value: z.number(),
});

const llmSchema = z
  .object({
    adapter: z.enum(["echo"]).default("echo"),
    promptTemplate: z.string().optional(),
  })
  .optional();

const createSimulationSchema = z.object({
  name: z.string().min(1),
  themes: z.array(z.string()).min(1),
  tickIntervalMinutes: z.number().positive().optional(),
  generatorMode: z.enum(["rule-based", "llm"]).optional(),
  initialEntities: z.array(entitySchema).min(1),
  initialParameters: z.array(parameterSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
  llm: llmSchema,
});

const eventSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["social", "political", "information", "intervention", "system"]),
  actorId: z.string().optional(),
  targetIds: z.array(z.string()).optional(),
  theme: z.string(),
  intensity: z.number().min(0).max(2).default(1),
  sentimentShift: z.number().optional(),
  influenceShift: z.number().optional(),
  parameterAdjustments: z
    .array(z.object({ name: z.string(), delta: z.number() }))
    .optional(),
  description: z.string().min(1),
  scheduledTick: z.number().int().nonnegative().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const tickSchema = z.object({
  steps: z.number().int().positive().default(1),
});

class EchoLLMClient implements LLMClient {
  constructor(private readonly template: string = "Tick {tick}: {arcs}. Recent: {events}.") {}

  async generateNarrative(request: LLMNarrativeRequest): Promise<string> {
    const arcSummary = request.state.arcs
      .map(
        (arc) => `${arc.theme} ${(arc.momentum * 100).toFixed(0)}% ${arc.outlook} (confidence ${(arc.confidence * 100).toFixed(0)}%)`,
      )
      .join("; ");

    const events = request.recentEvents
      .slice(-5)
      .map((event) => `${event.type}: ${event.description}`)
      .join("; ") || "no recent drivers";

    return this.template
      .replace("{tick}", request.state.tick.toString())
      .replace("{arcs}", arcSummary)
      .replace("{events}", events)
      .replace("{themes}", request.state.themes.join(", "));
  }
}

router.get("/simulations", (_req, res) => {
  res.json(narrativeSimulationManager.list());
});

router.post("/simulations", (req, res) => {
  try {
    const payload = createSimulationSchema.parse(req.body ?? {});
    const entities: SimulationEntity[] = payload.initialEntities.map((entity) => ({
      ...entity,
      id: entity.id ?? randomUUID(),
    }));

    const llmClient =
      payload.generatorMode === "llm"
        ? new EchoLLMClient(payload.llm?.promptTemplate)
        : undefined;

    const state = narrativeSimulationManager.createSimulation({
      name: payload.name,
      themes: payload.themes,
      tickIntervalMinutes: payload.tickIntervalMinutes,
      generatorMode: payload.generatorMode,
      initialEntities: entities,
      initialParameters: payload.initialParameters,
      llmClient,
      metadata: payload.metadata,
    });

    res.status(201).json(state);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "invalid-request", details: error.flatten() });
      return;
    }
    res.status(500).json({ error: "failed-to-create", details: (error as Error).message });
  }
});

router.get("/simulations/:id", (req, res) => {
  const state = narrativeSimulationManager.getState(req.params.id);
  if (!state) {
    res.status(404).json({ error: "not-found" });
    return;
  }
  res.json(state);
});

router.post("/simulations/:id/tick", async (req, res) => {
  try {
    const { steps } = tickSchema.parse(req.body ?? {});
    const state = await narrativeSimulationManager.tick(req.params.id, steps);
    res.json(state);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "invalid-request", details: error.flatten() });
      return;
    }
    res.status(404).json({ error: (error as Error).message });
  }
});

router.post("/simulations/:id/events", (req, res) => {
  try {
    const payload = eventSchema.parse(req.body ?? {});
    const event: NarrativeEvent = {
      ...payload,
      id: payload.id ?? randomUUID(),
    };
    narrativeSimulationManager.queueEvent(req.params.id, event);
    res.status(202).json({ status: "accepted", event });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "invalid-request", details: error.flatten() });
      return;
    }
    res.status(404).json({ error: (error as Error).message });
  }
});

router.post("/simulations/:id/actions", (req, res) => {
  try {
    const payload = eventSchema
      .omit({ type: true })
      .extend({ actorId: z.string(), description: z.string() })
      .parse(req.body ?? {});

    narrativeSimulationManager.injectActorAction(req.params.id, payload.actorId, payload.description, {
      targetIds: payload.targetIds,
      theme: payload.theme,
      intensity: payload.intensity,
      sentimentShift: payload.sentimentShift,
      influenceShift: payload.influenceShift,
      parameterAdjustments: payload.parameterAdjustments,
      metadata: payload.metadata,
      scheduledTick: payload.scheduledTick,
    });

    res.status(202).json({ status: "accepted" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "invalid-request", details: error.flatten() });
      return;
    }
    res.status(404).json({ error: (error as Error).message });
  }
});

router.delete("/simulations/:id", (req, res) => {
  const removed = narrativeSimulationManager.remove(req.params.id);
  if (!removed) {
    res.status(404).json({ error: "not-found" });
    return;
  }
  res.status(204).send();
});

export default router;
