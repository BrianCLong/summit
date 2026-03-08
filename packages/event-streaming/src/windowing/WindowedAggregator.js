"use strict";
/**
 * WindowedAggregator - Windowed stream aggregation
 *
 * Tumbling, sliding, and session windows for stream aggregation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Aggregators = exports.WindowedAggregator = exports.WindowType = void 0;
const events_1 = require("events");
const pino_1 = __importDefault(require("pino"));
var WindowType;
(function (WindowType) {
    WindowType["TUMBLING"] = "tumbling";
    WindowType["SLIDING"] = "sliding";
    WindowType["SESSION"] = "session";
})(WindowType || (exports.WindowType = WindowType = {}));
class WindowedAggregator extends events_1.EventEmitter {
    logger;
    config;
    windows = new Map();
    aggregateFunction;
    timer;
    constructor(config, aggregateFunction) {
        super();
        this.config = config;
        this.aggregateFunction = aggregateFunction;
        this.logger = (0, pino_1.default)({ name: 'WindowedAggregator' });
    }
    /**
     * Start windowing
     */
    start() {
        if (this.config.type === WindowType.TUMBLING) {
            this.startTumblingWindows();
        }
        else if (this.config.type === WindowType.SLIDING) {
            this.startSlidingWindows();
        }
        this.logger.info({ type: this.config.type, size: this.config.size }, 'Windowing started');
    }
    /**
     * Stop windowing
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
        this.logger.info('Windowing stopped');
    }
    /**
     * Add event to window
     */
    addEvent(event) {
        const now = new Date();
        if (this.config.type === WindowType.SESSION) {
            this.addToSessionWindow(event, now);
        }
        else {
            this.addToTimeWindow(event, now);
        }
    }
    /**
     * Start tumbling windows
     */
    startTumblingWindows() {
        this.timer = setInterval(() => {
            this.closeCurrentWindows();
        }, this.config.size);
    }
    /**
     * Start sliding windows
     */
    startSlidingWindows() {
        const slide = this.config.slide || this.config.size;
        this.timer = setInterval(() => {
            this.closeExpiredWindows();
        }, slide);
    }
    /**
     * Add event to time-based window
     */
    addToTimeWindow(event, now) {
        const windowStart = this.getWindowStart(event.timestamp);
        const windowEnd = new Date(windowStart.getTime() + this.config.size);
        const windowId = `${windowStart.getTime()}-${windowEnd.getTime()}`;
        let window = this.windows.get(windowId);
        if (!window) {
            window = {
                windowId,
                startTime: windowStart,
                endTime: windowEnd,
                events: [],
                keys: new Set()
            };
            this.windows.set(windowId, window);
        }
        window.events.push(event);
        window.keys.add(event.key);
    }
    /**
     * Add event to session window
     */
    addToSessionWindow(event, now) {
        const sessionGap = this.config.sessionGap || 5000;
        let targetWindow;
        // Find existing session window for this key
        for (const window of this.windows.values()) {
            if (window.keys.has(event.key)) {
                const lastEventTime = Math.max(...window.events.map(e => e.timestamp.getTime()));
                const timeSinceLastEvent = event.timestamp.getTime() - lastEventTime;
                if (timeSinceLastEvent <= sessionGap) {
                    targetWindow = window;
                    break;
                }
            }
        }
        if (!targetWindow) {
            // Create new session window
            const windowId = `session-${event.key}-${event.timestamp.getTime()}`;
            targetWindow = {
                windowId,
                startTime: event.timestamp,
                endTime: new Date(event.timestamp.getTime() + sessionGap),
                events: [],
                keys: new Set()
            };
            this.windows.set(windowId, targetWindow);
        }
        targetWindow.events.push(event);
        targetWindow.keys.add(event.key);
        targetWindow.endTime = new Date(event.timestamp.getTime() + sessionGap);
    }
    /**
     * Get window start time
     */
    getWindowStart(timestamp) {
        const time = timestamp.getTime();
        const windowSize = this.config.size;
        const windowStart = Math.floor(time / windowSize) * windowSize;
        return new Date(windowStart);
    }
    /**
     * Close current windows
     */
    closeCurrentWindows() {
        const now = Date.now();
        for (const [windowId, window] of this.windows.entries()) {
            if (window.endTime.getTime() <= now) {
                this.closeWindow(window);
                this.windows.delete(windowId);
            }
        }
    }
    /**
     * Close expired windows
     */
    closeExpiredWindows() {
        const now = Date.now();
        for (const [windowId, window] of this.windows.entries()) {
            if (window.endTime.getTime() <= now) {
                this.closeWindow(window);
                this.windows.delete(windowId);
            }
        }
    }
    /**
     * Close window and emit result
     */
    closeWindow(window) {
        if (window.events.length === 0) {
            return;
        }
        try {
            const result = this.aggregateFunction(window.events);
            this.emit('window:closed', {
                windowId: window.windowId,
                startTime: window.startTime,
                endTime: window.endTime,
                eventCount: window.events.length,
                result
            });
            this.logger.debug({
                windowId: window.windowId,
                events: window.events.length
            }, 'Window closed');
        }
        catch (err) {
            this.logger.error({ err, windowId: window.windowId }, 'Aggregation error');
            this.emit('window:error', {
                windowId: window.windowId,
                error: err
            });
        }
    }
    /**
     * Get active window count
     */
    getActiveWindowCount() {
        return this.windows.size;
    }
}
exports.WindowedAggregator = WindowedAggregator;
/**
 * Common aggregation functions
 */
class Aggregators {
    static count() {
        return (events) => events.length;
    }
    static sum(selector) {
        return (events) => {
            return events.reduce((sum, event) => sum + selector(event.value), 0);
        };
    }
    static avg(selector) {
        return (events) => {
            if (events.length === 0)
                return 0;
            if (events.length === 0) {
                return 0;
            }
            const sum = events.reduce((s, event) => s + selector(event.value), 0);
            return sum / events.length;
        };
    }
    static min(selector) {
        return (events) => {
            if (events.length === 0)
                return 0;
            if (events.length === 0) {
                return 0;
            }
            return Math.min(...events.map(e => selector(e.value)));
        };
    }
    static max(selector) {
        return (events) => {
            if (events.length === 0)
                return 0;
            if (events.length === 0) {
                return 0;
            }
            return Math.max(...events.map(e => selector(e.value)));
        };
    }
    static collect() {
        return (events) => events.map(e => e.value);
    }
    static distinct(selector) {
        return (events) => {
            const seen = new Set();
            const result = [];
            for (const event of events) {
                const key = selector(event.value);
                if (!seen.has(key)) {
                    seen.add(key);
                    result.push(event.value);
                }
            }
            return result;
        };
    }
}
exports.Aggregators = Aggregators;
