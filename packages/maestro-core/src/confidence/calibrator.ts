import { ToolType } from './toolType.js';
import calibrationParams from './calibration-params.json';

export interface ToolCalibrationParams {
  temperature: number;
  bias: number;
}

export interface CalibrationParams {
  version: string;
  updated_at: string;
  tool_type_params: Record<ToolType, ToolCalibrationParams>;
}

export const DEFAULT_CALIBRATION_PARAMS =
  calibrationParams as CalibrationParams;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const logit = (value: number): number => Math.log(value / (1 - value));

const sigmoid = (value: number): number => 1 / (1 + Math.exp(-value));

export const applyCalibration = (
  rawP: number,
  toolTypes: ToolType[],
  params: CalibrationParams = DEFAULT_CALIBRATION_PARAMS,
): number => {
  const epsilon = 1e-6;
  const bounded = clamp01(rawP);
  const p = Math.min(1 - epsilon, Math.max(epsilon, bounded));

  const selected = toolTypes.length > 0 ? toolTypes : ['HUMAN'];
  const tempValues = selected.map(
    (toolType) => params.tool_type_params[toolType]?.temperature ?? 1,
  );
  const biasValues = selected.map(
    (toolType) => params.tool_type_params[toolType]?.bias ?? 0,
  );

  const avgTemp =
    tempValues.reduce((sum, value) => sum + value, 0) / tempValues.length;
  const avgBias =
    biasValues.reduce((sum, value) => sum + value, 0) / biasValues.length;

  const adjusted = (logit(p) + avgBias) / avgTemp;
  return clamp01(sigmoid(adjusted));
};
