import { config } from '../config';

export type MaestroPersonaMode = 'standard' | 'expedited';

export interface MaestroPersonaProfile {
  name: string;
  version: string;
  mode: MaestroPersonaMode;
  mission: string;
  defaultImage: string;
  priorityClassName?: string;
  telemetryChannel: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export function buildDefaultMaestroPersona(): MaestroPersonaProfile {
  return {
    name: config.maestro.persona,
    version: config.maestro.version,
    mode: config.maestro.mode,
    mission: config.maestro.mission,
    defaultImage: config.maestro.defaultImage,
    priorityClassName: config.maestro.priorityClassName,
    telemetryChannel: config.maestro.telemetryChannel,
    labels: {
      'maestro.persona/name': config.maestro.persona,
      'maestro.persona/version': config.maestro.version,
      'maestro.persona/mode': config.maestro.mode,
    },
    annotations: {
      'maestro.conductor/mission': config.maestro.mission,
      'maestro.conductor/telemetry-channel': config.maestro.telemetryChannel,
    },
  };
}

export function mergePersonaProfile(
  base: MaestroPersonaProfile,
  override?: Partial<MaestroPersonaProfile>,
): MaestroPersonaProfile {
  if (!override) {
    return base;
  }

  return {
    ...base,
    ...override,
    labels: {
      ...base.labels,
      ...(override.labels || {}),
    },
    annotations: {
      ...base.annotations,
      ...(override.annotations || {}),
    },
  };
}
