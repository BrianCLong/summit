import {
  BoostPattern,
  BoostedEvent,
  BoostContext,
  EventRecord,
} from './types.js';

const DEFAULT_FIELD = 'signal';

const ensureNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const clonePayload = (event: EventRecord): Record<string, unknown> => ({
  ...event.payload,
});

export interface AmplifyPatternConfig {
  name?: string;
  field?: string;
  intensities?: number[];
  minimumSignal?: number;
}

export const createAmplifyPattern = (
  config: AmplifyPatternConfig = {},
): BoostPattern => {
  const field = config.field ?? DEFAULT_FIELD;
  const intensities = (config.intensities ?? [1.2, 1.5, 1.9]).filter(
    (value) => value > 0,
  );
  const minimumSignal = config.minimumSignal ?? 0;
  const patternName = config.name ?? `amplify-${field}`;

  return {
    name: patternName,
    description: `Amplifies ${field} using multipliers ${intensities.join(', ')}.`,
    boost(event, _context) {
      const baseValue = ensureNumber(event.payload[field]);
      if (baseValue === undefined) {
        return [];
      }
      const derivatives: BoostedEvent[] = [];
      intensities.forEach((intensity, index) => {
        const boostedValue = baseValue * intensity;
        if (boostedValue < minimumSignal) {
          return;
        }
        derivatives.push({
          id: `${event.id}-${patternName}-${index}`,
          timestamp: event.timestamp,
          payload: {
            ...clonePayload(event),
            [field]: boostedValue,
            boostIntensity: intensity,
          },
          tags: event.tags ? [...event.tags, patternName] : [patternName],
          sourceEventId: event.id,
          boostPattern: patternName,
          boostScore: intensity,
          metadata: {
            field,
            intensity,
            base: baseValue,
          },
        });
      });
      return derivatives;
    },
  };
};

export interface TemporalShiftPatternConfig {
  name?: string;
  offsetsMs?: number[];
  decay?: number;
}

export const createTemporalShiftPattern = (
  config: TemporalShiftPatternConfig = {},
): BoostPattern => {
  const offsets = config.offsetsMs ?? [-60000, 60000, 300000];
  const decay = Math.max(1, config.decay ?? 120000);
  const patternName = config.name ?? 'temporal-cluster';

  return {
    name: patternName,
    description:
      'Clones events forward and backward in time to simulate correlated detections.',
    boost(event, _context) {
      const derivatives: BoostedEvent[] = [];
      offsets.forEach((offset, index) => {
        const score = Math.exp(-Math.abs(offset) / decay);
        derivatives.push({
          id: `${event.id}-${patternName}-${index}`,
          timestamp: event.timestamp + offset,
          payload: {
            ...clonePayload(event),
            temporalOffsetMs: offset,
          },
          tags: event.tags ? [...event.tags, patternName] : [patternName],
          sourceEventId: event.id,
          boostPattern: patternName,
          boostScore: score,
          metadata: {
            offset,
            decay,
          },
        });
      });
      return derivatives;
    },
  };
};

export interface NoisePatternConfig {
  name?: string;
  field?: string;
  maxNoise?: number;
}

export const createNoisePattern = (
  config: NoisePatternConfig = {},
): BoostPattern => {
  const field = config.field ?? DEFAULT_FIELD;
  const maxNoise = Math.max(0, config.maxNoise ?? 0.2);
  const patternName = config.name ?? `noise-${field}`;

  return {
    name: patternName,
    description: `Injects bounded random noise into the ${field} attribute.`,
    boost(event, context) {
      return buildNoiseDerivatives(
        event,
        context,
        field,
        maxNoise,
        patternName,
      );
    },
  };
};

const buildNoiseDerivatives = (
  event: EventRecord,
  context: BoostContext,
  field: string,
  maxNoise: number,
  patternName: string,
): BoostedEvent[] => {
  const baseValue = ensureNumber(event.payload[field]);
  if (baseValue === undefined) {
    return [];
  }
  const noise = (context.random() * 2 - 1) * maxNoise;
  const boostedValue = baseValue * (1 + noise);
  const score = 1 - Math.abs(noise);
  return [
    {
      id: `${event.id}-${patternName}`,
      timestamp: event.timestamp,
      payload: {
        ...clonePayload(event),
        [field]: boostedValue,
        noise,
      },
      tags: event.tags ? [...event.tags, patternName] : [patternName],
      sourceEventId: event.id,
      boostPattern: patternName,
      boostScore: score,
      metadata: {
        field,
        noise,
        base: baseValue,
      },
    },
  ];
};

/** Default set of patterns shipped with the framework. */
export const defaultPatterns: BoostPattern[] = [
  createAmplifyPattern(),
  createTemporalShiftPattern(),
  createNoisePattern(),
];
