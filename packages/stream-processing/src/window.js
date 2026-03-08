"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowManager = void 0;
const eventemitter3_1 = require("eventemitter3");
const rxjs_1 = require("rxjs");
const pino_1 = __importDefault(require("pino"));
const types_js_1 = require("./types.js");
const logger = (0, pino_1.default)({ name: 'window-manager' });
/**
 * Window manager for handling windowing operations
 */
class WindowManager extends eventemitter3_1.EventEmitter {
    spec;
    windows = new Map();
    windowSubject = new rxjs_1.Subject();
    constructor(spec) {
        super();
        this.spec = spec;
        this.startWindowGarbageCollection();
    }
    /**
     * Add message to appropriate window(s)
     */
    addMessage(message) {
        const timestamp = this.getTimestamp(message);
        const windows = this.assignWindows(timestamp);
        for (const window of windows) {
            this.addToWindow(window, message);
        }
    }
    /**
     * Assign message to windows
     */
    assignWindows(timestamp) {
        switch (this.spec.type) {
            case types_js_1.WindowType.TUMBLING:
                return [this.createTumblingWindow(timestamp)];
            case types_js_1.WindowType.SLIDING:
                return this.createSlidingWindows(timestamp);
            case types_js_1.WindowType.SESSION:
                return [this.createSessionWindow(timestamp)];
            case types_js_1.WindowType.GLOBAL:
                return [this.createGlobalWindow()];
            default:
                throw new Error(`Unknown window type: ${this.spec.type}`);
        }
    }
    /**
     * Create tumbling window
     */
    createTumblingWindow(timestamp) {
        const start = Math.floor(timestamp / this.spec.size) * this.spec.size;
        const end = start + this.spec.size;
        return {
            id: `tumbling-${start}-${end}`,
            start,
            end,
            type: types_js_1.WindowType.TUMBLING,
        };
    }
    /**
     * Create sliding windows
     */
    createSlidingWindows(timestamp) {
        const slide = this.spec.slide || this.spec.size;
        const windows = [];
        // Calculate how many windows this event belongs to
        const numWindows = Math.ceil(this.spec.size / slide);
        for (let i = 0; i < numWindows; i++) {
            const start = Math.floor(timestamp / slide) * slide - i * slide;
            const end = start + this.spec.size;
            if (timestamp >= start && timestamp < end) {
                windows.push({
                    id: `sliding-${start}-${end}`,
                    start,
                    end,
                    type: types_js_1.WindowType.SLIDING,
                });
            }
        }
        return windows;
    }
    /**
     * Create session window
     */
    createSessionWindow(timestamp) {
        const gap = this.spec.gap || 5000; // Default 5 second gap
        // Find existing session window within gap
        for (const [id, state] of this.windows.entries()) {
            if (state.window.type === types_js_1.WindowType.SESSION) {
                if (timestamp - state.window.end < gap) {
                    // Extend existing window
                    state.window.end = timestamp + gap;
                    return state.window;
                }
            }
        }
        // Create new session window
        return {
            id: `session-${timestamp}`,
            start: timestamp,
            end: timestamp + gap,
            type: types_js_1.WindowType.SESSION,
        };
    }
    /**
     * Create global window
     */
    createGlobalWindow() {
        return {
            id: 'global',
            start: 0,
            end: Number.MAX_SAFE_INTEGER,
            type: types_js_1.WindowType.GLOBAL,
        };
    }
    /**
     * Add message to window
     */
    addToWindow(window, message) {
        if (!this.windows.has(window.id)) {
            this.windows.set(window.id, {
                window,
                messages: [],
                lastUpdate: Date.now(),
            });
        }
        const state = this.windows.get(window.id);
        state.messages.push(message);
        state.lastUpdate = Date.now();
        this.emit('message-added', { window, message });
    }
    /**
     * Trigger window
     */
    triggerWindow(windowId) {
        const state = this.windows.get(windowId);
        if (!state) {
            logger.warn({ windowId }, 'Window not found');
            return;
        }
        const windowed = {
            window: state.window,
            messages: state.messages,
            count: state.messages.length,
            startTime: state.window.start,
            endTime: state.window.end,
        };
        this.windowSubject.next(windowed);
        this.emit('window-triggered', windowed);
        // Remove window after triggering (for tumbling/sliding)
        if (state.window.type !== types_js_1.WindowType.GLOBAL) {
            this.windows.delete(windowId);
        }
    }
    /**
     * Get windowed stream
     */
    asObservable() {
        return this.windowSubject.asObservable();
    }
    /**
     * Aggregate function over windows
     */
    aggregate(aggregateFunction) {
        const resultSubject = new rxjs_1.Subject();
        this.windowSubject.subscribe({
            next: (windowed) => {
                let accumulator = aggregateFunction.createAccumulator();
                for (const message of windowed.messages) {
                    accumulator = aggregateFunction.add(message.payload, accumulator);
                }
                const result = aggregateFunction.getResult(accumulator);
                resultSubject.next({
                    window: windowed.window,
                    result,
                });
            },
            error: (error) => resultSubject.error(error),
            complete: () => resultSubject.complete(),
        });
        return resultSubject.asObservable();
    }
    /**
     * Get timestamp based on time semantics
     */
    getTimestamp(message) {
        switch (this.spec.timeSemantics) {
            case types_js_1.TimeSemantics.EVENT_TIME:
                return message.metadata.timestamp;
            case types_js_1.TimeSemantics.PROCESSING_TIME:
                return Date.now();
            case types_js_1.TimeSemantics.INGESTION_TIME:
                // Use event timestamp as proxy for ingestion time
                return message.metadata.timestamp;
            default:
                return message.metadata.timestamp;
        }
    }
    /**
     * Start garbage collection for old windows
     */
    startWindowGarbageCollection() {
        setInterval(() => {
            const now = Date.now();
            const timeout = 60000; // 1 minute
            for (const [id, state] of this.windows.entries()) {
                if (now - state.lastUpdate > timeout) {
                    // Trigger window before removing
                    this.triggerWindow(id);
                }
            }
        }, 10000); // Check every 10 seconds
    }
    /**
     * Get all active windows
     */
    getActiveWindows() {
        return Array.from(this.windows.values()).map((state) => state.window);
    }
    /**
     * Get window state
     */
    getWindowState(windowId) {
        return this.windows.get(windowId);
    }
}
exports.WindowManager = WindowManager;
