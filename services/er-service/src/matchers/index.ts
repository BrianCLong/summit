/**
 * Matchers Module
 *
 * Exports all matcher implementations and factory functions.
 */

export { BaseMatcher, type MatcherConfig, type MatchInput, type MatchResult, normalizeString, extractValue, valuesEqual } from './base.js';
export {
  NationalIdMatcher,
  PassportMatcher,
  EmailMatcher,
  PhoneMatcher,
  DeviceIdMatcher,
  TaxIdMatcher,
  AccountNumberMatcher,
  createDeterministicMatchers,
} from './deterministic.js';
export {
  NameMatcher,
  DateOfBirthMatcher,
  AddressMatcher,
  GenderMatcher,
  NationalityMatcher,
  createProbabilisticMatchers,
} from './probabilistic.js';
