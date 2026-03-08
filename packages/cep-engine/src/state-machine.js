"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateMachineExecutor = void 0;
const eventemitter3_1 = require("eventemitter3");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'state-machine' });
/**
 * State machine executor for workflow tracking
 */
class StateMachineExecutor extends eventemitter3_1.EventEmitter {
    machine;
    currentState;
    context = new Map();
    constructor(machine) {
        super();
        this.machine = machine;
        this.currentState = machine.initialState;
    }
    /**
     * Process event and transition state if applicable
     */
    async processEvent(trigger, event) {
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
        const result = {
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
    findTransition(fromState, trigger, event) {
        const transitions = this.machine.transitions.filter((t) => t.from === fromState && t.trigger === trigger);
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
    getCurrentState() {
        return this.currentState;
    }
    /**
     * Check if in final state
     */
    isInFinalState() {
        const state = this.machine.states.get(this.currentState);
        return state?.type === 'final';
    }
    /**
     * Get context value
     */
    getContext(key) {
        return this.context.get(key);
    }
    /**
     * Set context value
     */
    setContext(key, value) {
        this.context.set(key, value);
    }
    /**
     * Reset to initial state
     */
    reset() {
        this.currentState = this.machine.initialState;
        this.context.clear();
        this.emit('reset');
    }
}
exports.StateMachineExecutor = StateMachineExecutor;
