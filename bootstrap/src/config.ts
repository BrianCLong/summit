import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { z } from 'zod';
import { SummitConfig, EventsConfig } from './types.js';

const AgentConfigSchema = z.object({
  path: z.string(),
  enabled: z.boolean(),
});

const RuntimeConfigSchema = z.object({
  enable_observability: z.boolean(),
  enable_event_triggers: z.boolean(),
  logs_dir: z.string(),
  state_dir: z.string(),
});

const SummitConfigSchema = z.object({
  version: z.union([z.number(), z.string()]),
  agents: z.record(AgentConfigSchema),
  flows: z.array(z.string()),
  governance: z.record(z.string()),
  analytics: z.record(z.string()),
  runtime: RuntimeConfigSchema,
});

const EventTriggerSchema = z.object({
  agent: z.string(),
  flow: z.string(),
});

const EventDefinitionSchema = z.object({
  cron: z.string().optional(),
  triggers: z.array(EventTriggerSchema),
});

const EventsConfigSchema = z.object({
  events: z.record(EventDefinitionSchema),
});

export async function loadConfig(configPath: string): Promise<SummitConfig> {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  const content = await fs.readFile(configPath, 'utf-8');
  const parsed = yaml.load(content);
  return SummitConfigSchema.parse(parsed);
}

export async function loadEvents(eventsPath: string): Promise<EventsConfig> {
  if (!fs.existsSync(eventsPath)) {
     // Return empty if not found, or throw? The file is expected in the architecture.
     // For robustness, if missing, return empty triggers or log warning.
     console.warn(`Events file not found at ${eventsPath}, assuming no events.`);
     return { events: {} };
  }
  const content = await fs.readFile(eventsPath, 'utf-8');
  const parsed = yaml.load(content);
  return EventsConfigSchema.parse(parsed);
}
