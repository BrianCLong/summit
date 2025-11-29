/**
 * Pipeline Module
 *
 * Exports pipeline components.
 *
 * @module pipeline
 */

export {
  SignalValidatorService,
  createSignalValidator,
  type ValidatorConfig,
  type SignalValidator,
} from './signal-validator.js';

export {
  SignalNormalizerService,
  createSignalNormalizer,
  type NormalizerConfig,
} from './signal-normalizer.js';

export {
  SignalRouterService,
  createSignalRouter,
  type RouterConfig,
  type CustomRoute,
  type SignalRoutingResult,
} from './signal-router.js';
