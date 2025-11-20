/*
 * TypeScript facade for the djce-pb Rust library.
 */
import type {
  DatasetInput,
  JoinOptions,
  JoinRiskReport,
  RiskBounds,
  EstimateInterval,
  DatasetSummary,
  SketchConfig,
  Thresholds
} from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires -- native binding is compiled at build time
const native: {
  assessJoin: (
    left: DatasetInput,
    right: DatasetInput,
    options?: JoinOptions
  ) => JoinRiskReport;
} = require('../native/index.node');

export type {
  DatasetInput,
  JoinOptions,
  JoinRiskReport,
  RiskBounds,
  EstimateInterval,
  DatasetSummary,
  SketchConfig,
  Thresholds
};

export const assessJoin = (
  left: DatasetInput,
  right: DatasetInput,
  options?: JoinOptions
): JoinRiskReport => {
  return native.assessJoin(left, right, options);
};
