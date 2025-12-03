/**
 * Purple Team Collaboration Package
 *
 * Comprehensive purple team capabilities including:
 * - Exercise management
 * - Detection validation
 * - IOC generation
 * - Control assessment
 * - After-action reporting
 */

// Types
export * from './types';

// Exercise Management
export { ExerciseManager } from './exercise/exercise-manager';

// Detection Validation
export {
  SIEMRuleValidator,
  IOCGenerator,
  ControlAssessor
} from './detection/detection-validator';
