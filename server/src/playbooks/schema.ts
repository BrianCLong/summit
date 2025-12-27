import { z } from 'zod/v4';

const StepIdSchema = z.string().min(1);

const LogStepSchema = z.object({
  id: StepIdSchema,
  type: z.literal('log'),
  message: z.string().min(1),
});

const DelayStepSchema = z.object({
  id: StepIdSchema,
  type: z.literal('delay'),
  durationMs: z.number().int().positive(),
});

export const PlaybookStepSchema = z.discriminatedUnion('type', [
  LogStepSchema,
  DelayStepSchema,
]);

export const PlaybookSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  steps: z.array(PlaybookStepSchema).min(1),
});

export const PlaybookRunSchema = z.object({
  runKey: z.string().min(1),
  playbook: PlaybookSchema,
});

export type PlaybookStep = z.infer<typeof PlaybookStepSchema>;
export type Playbook = z.infer<typeof PlaybookSchema>;
export type PlaybookRun = z.infer<typeof PlaybookRunSchema>;
export type LogStep = z.infer<typeof LogStepSchema>;
export type DelayStep = z.infer<typeof DelayStepSchema>;
