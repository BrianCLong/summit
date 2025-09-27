import { ArtifactConfig, ValidationResult } from '../types.js';

export type ArtifactValidator = (
  artifact: ArtifactConfig,
  rawContent: string
) => ValidationResult;
