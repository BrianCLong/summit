import { StreamMessage } from '@intelgraph/kafka-integration';

/**
 * Pattern definition
 */
export interface Pattern {
  id: string;
  name: string;
  description?: string;
  sequence: PatternElement[];
  timeConstraint?: TimeConstraint;
  quantifier?: PatternQuantifier;
}

/**
 * Pattern element
 */
export interface PatternElement {
  name: string;
  condition: (event: any, context: MatchContext) => boolean;
  quantifier?: ElementQuantifier;
}

/**
 * Element quantifier
 */
export interface ElementQuantifier {
  type: 'one' | 'one_or_more' | 'zero_or_more' | 'times' | 'optional';
  count?: number;
  greedy?: boolean;
}

/**
 * Pattern quantifier (for whole pattern)
 */
export interface PatternQuantifier {
  type: 'skip_past_last_event' | 'skip_to_first' | 'skip_to_last' | 'strict';
}

/**
 * Time constraint
 */
export interface TimeConstraint {
  withinMs: number;
  startFrom?: 'first' | 'last';
}

/**
 * Match context
 */
export interface MatchContext {
  previousMatches: Map<string, any[]>;
  variables: Map<string, any>;
  startTime: number;
  currentTime: number;
}

/**
 * Pattern match result
 */
export interface PatternMatch {
  patternId: string;
  events: any[];
  variables: Map<string, any>;
  startTime: number;
  endTime: number;
  confidence: number;
}

/**
 * State machine definition
 */
export interface StateMachine {
  id: string;
  name: string;
  initialState: string;
  states: Map<string, State>;
  transitions: Transition[];
}

/**
 * State
 */
export interface State {
  name: string;
  type: 'normal' | 'final' | 'error';
  onEnter?: (context: any) => void;
  onExit?: (context: any) => void;
}

/**
 * Transition
 */
export interface Transition {
  from: string;
  to: string;
  trigger: string;
  condition?: (event: any, context: any) => boolean;
  action?: (event: any, context: any) => void;
}

/**
 * Business rule
 */
export interface BusinessRule {
  id: string;
  name: string;
  priority: number;
  condition: (event: any, context: RuleContext) => boolean;
  action: (event: any, context: RuleContext) => void | Promise<void>;
  enabled: boolean;
}

/**
 * Rule context
 */
export interface RuleContext {
  facts: Map<string, any>;
  results: Map<string, any>;
}

/**
 * Correlation criteria
 */
export interface CorrelationCriteria {
  streams: string[];
  correlationKey: (event: any) => string;
  timeWindow: number;
  minimumMatches: number;
}
