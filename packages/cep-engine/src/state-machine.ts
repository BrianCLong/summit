import { EventEmitter } from 'eventemitter3';
import pino from 'pino';
import { StateMachine, State, Transition } from './types';

const logger = pino({ name: 'state-machine' });

/**
 * State machine executor for workflow tracking
 */
export class StateMachineExecutor extends EventEmitter {
  private currentState: string;
  private context: Map<string, any> = new Map();

  constructor(private machine: StateMachine) {
    super();
    this.currentState = machine.initialState;
  }

  /**
   * Process event and transition state if applicable
   */
  async processEvent(trigger: string, event: any): Promise<StateTransitionResult> {
    const currentState = this.machine.states.get(this.currentState);

    if (!currentState) {
      throw new Error(`Invalid current state: ${this.currentState}`);
    }

    // Find applicable transition
    const transition = this.findTransition(this.currentState, trigger, event);

    if (!transition) {
      return {
        transitioned: false,
        fromState: this.currentState,
        toState: this.currentState,
        trigger,
      };
    }

    // Execute transition
    const fromState = this.currentState;
    const toState = transition.to;

    // Call onExit of current state
    if (currentState.onExit) {
      currentState.onExit(this.context);
    }

    // Execute transition action
    if (transition.action) {
      transition.action(event, this.context);
    }

    // Update state
    this.currentState = toState;

    // Call onEnter of new state
    const newState = this.machine.states.get(toState);
    if (newState?.onEnter) {
      newState.onEnter(this.context);
    }

    const result: StateTransitionResult = {
      transitioned: true,
      fromState,
      toState,
      trigger,
      timestamp: Date.now(),
    };

    this.emit('state-transition', result);
    logger.info(result, 'State transition');

    return result;
  }

  /**
   * Find applicable transition
   */
  private findTransition(
    fromState: string,
    trigger: string,
    event: any
  ): Transition | null {
    const transitions = this.machine.transitions.filter(
      (t) => t.from === fromState && t.trigger === trigger
    );

    for (const transition of transitions) {
      if (!transition.condition || transition.condition(event, this.context)) {
        return transition;
      }
    }

    return null;
  }

  /**
   * Get current state
   */
  getCurrentState(): string {
    return this.currentState;
  }

  /**
   * Check if in final state
   */
  isInFinalState(): boolean {
    const state = this.machine.states.get(this.currentState);
    return state?.type === 'final';
  }

  /**
   * Get context value
   */
  getContext(key: string): any {
    return this.context.get(key);
  }

  /**
   * Set context value
   */
  setContext(key: string, value: any): void {
    this.context.set(key, value);
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.currentState = this.machine.initialState;
    this.context.clear();
    this.emit('reset');
  }
}

export interface StateTransitionResult {
  transitioned: boolean;
  fromState: string;
  toState: string;
  trigger: string;
  timestamp?: number;
}
