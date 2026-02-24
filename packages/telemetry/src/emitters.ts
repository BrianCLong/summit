import { z } from 'zod';
import {
  AIInteractionEventSchema,
  AIActionEventSchema,
  ModelUsageEventSchema,
  ControlTestRunEventSchema,
  IncidentEventSchema,
  AIInteractionEvent,
  AIActionEvent,
  ModelUsageEvent,
  ControlTestRunEvent,
  IncidentEvent,
} from './events/schemas';

// Simple in-memory emitter for now (can be replaced with Kafka/HTTP)
type EventHandler<T> = (event: T) => void | Promise<void>;

const handlers: { [key: string]: EventHandler<any>[] } = {
  interaction: [],
  action: [],
  usage: [],
  control: [],
  incident: [],
};

export function onInteraction(handler: EventHandler<AIInteractionEvent>) {
  handlers.interaction.push(handler);
}

export function onAction(handler: EventHandler<AIActionEvent>) {
  handlers.action.push(handler);
}

export function onUsage(handler: EventHandler<ModelUsageEvent>) {
  handlers.usage.push(handler);
}

export function onControl(handler: EventHandler<ControlTestRunEvent>) {
  handlers.control.push(handler);
}

export function onIncident(handler: EventHandler<IncidentEvent>) {
  handlers.incident.push(handler);
}

export function emitInteraction(event: AIInteractionEvent) {
  const result = AIInteractionEventSchema.safeParse(event);
  if (!result.success) {
    console.error('Invalid Interaction Event:', result.error);
    return;
  }
  handlers.interaction.forEach(h => h(event));
}

export function emitAction(event: AIActionEvent) {
  const result = AIActionEventSchema.safeParse(event);
  if (!result.success) {
    console.error('Invalid Action Event:', result.error);
    return;
  }
  handlers.action.forEach(h => h(event));
}

export function emitUsage(event: ModelUsageEvent) {
  const result = ModelUsageEventSchema.safeParse(event);
  if (!result.success) {
    console.error('Invalid Usage Event:', result.error);
    return;
  }
  handlers.usage.forEach(h => h(event));
}

export function emitControl(event: ControlTestRunEvent) {
  const result = ControlTestRunEventSchema.safeParse(event);
  if (!result.success) {
    console.error('Invalid Control Event:', result.error);
    return;
  }
  handlers.control.forEach(h => h(event));
}

export function emitIncident(event: IncidentEvent) {
  const result = IncidentEventSchema.safeParse(event);
  if (!result.success) {
    console.error('Invalid Incident Event:', result.error);
    return;
  }
  handlers.incident.forEach(h => h(event));
}
