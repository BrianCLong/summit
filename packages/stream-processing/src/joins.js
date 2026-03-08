"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntervalJoin = exports.StreamJoin = void 0;
const rxjs_1 = require("rxjs");
const pino_1 = __importDefault(require("pino"));
const types_js_1 = require("./types.js");
const logger = (0, pino_1.default)({ name: 'stream-joins' });
/**
 * Stream join operations
 */
class StreamJoin {
    leftStream;
    rightStream;
    spec;
    leftKeyExtractor;
    rightKeyExtractor;
    leftWindows = new Map();
    rightWindows = new Map();
    resultSubject = new rxjs_1.Subject();
    constructor(leftStream, rightStream, spec, leftKeyExtractor, rightKeyExtractor) {
        this.leftStream = leftStream;
        this.rightStream = rightStream;
        this.spec = spec;
        this.leftKeyExtractor = leftKeyExtractor;
        this.rightKeyExtractor = rightKeyExtractor;
        this.setupJoin();
    }
    /**
     * Setup join processing
     */
    setupJoin() {
        // Subscribe to left stream
        this.leftStream.asObservable().subscribe({
            next: (message) => this.processLeft(message),
            error: (error) => logger.error({ error }, 'Left stream error'),
        });
        // Subscribe to right stream
        this.rightStream.asObservable().subscribe({
            next: (message) => this.processRight(message),
            error: (error) => logger.error({ error }, 'Right stream error'),
        });
        // Start window cleanup
        this.startWindowCleanup();
    }
    /**
     * Process left stream message
     */
    processLeft(message) {
        const key = this.leftKeyExtractor(message.payload);
        // Add to left window
        if (!this.leftWindows.has(key)) {
            this.leftWindows.set(key, []);
        }
        this.leftWindows.get(key).push(message);
        // Perform join
        this.performJoin(key);
    }
    /**
     * Process right stream message
     */
    processRight(message) {
        const key = this.rightKeyExtractor(message.payload);
        // Add to right window
        if (!this.rightWindows.has(key)) {
            this.rightWindows.set(key, []);
        }
        this.rightWindows.get(key).push(message);
        // Perform join
        this.performJoin(key);
    }
    /**
     * Perform join operation
     */
    performJoin(key) {
        const leftMessages = this.leftWindows.get(key) || [];
        const rightMessages = this.rightWindows.get(key) || [];
        switch (this.spec.type) {
            case types_js_1.JoinType.INNER:
                this.performInnerJoin(key, leftMessages, rightMessages);
                break;
            case types_js_1.JoinType.LEFT:
                this.performLeftJoin(key, leftMessages, rightMessages);
                break;
            case types_js_1.JoinType.RIGHT:
                this.performRightJoin(key, leftMessages, rightMessages);
                break;
            case types_js_1.JoinType.FULL_OUTER:
                this.performFullOuterJoin(key, leftMessages, rightMessages);
                break;
        }
    }
    /**
     * Inner join
     */
    performInnerJoin(key, leftMessages, rightMessages) {
        for (const leftMsg of leftMessages) {
            for (const rightMsg of rightMessages) {
                if (this.isWithinWindow(leftMsg, rightMsg)) {
                    this.resultSubject.next({
                        key,
                        left: leftMsg.payload,
                        right: rightMsg.payload,
                        leftMessage: leftMsg,
                        rightMessage: rightMsg,
                    });
                }
            }
        }
    }
    /**
     * Left join
     */
    performLeftJoin(key, leftMessages, rightMessages) {
        for (const leftMsg of leftMessages) {
            let matched = false;
            for (const rightMsg of rightMessages) {
                if (this.isWithinWindow(leftMsg, rightMsg)) {
                    this.resultSubject.next({
                        key,
                        left: leftMsg.payload,
                        right: rightMsg.payload,
                        leftMessage: leftMsg,
                        rightMessage: rightMsg,
                    });
                    matched = true;
                }
            }
            if (!matched) {
                this.resultSubject.next({
                    key,
                    left: leftMsg.payload,
                    right: null,
                    leftMessage: leftMsg,
                    rightMessage: null,
                });
            }
        }
    }
    /**
     * Right join
     */
    performRightJoin(key, leftMessages, rightMessages) {
        for (const rightMsg of rightMessages) {
            let matched = false;
            for (const leftMsg of leftMessages) {
                if (this.isWithinWindow(leftMsg, rightMsg)) {
                    this.resultSubject.next({
                        key,
                        left: leftMsg.payload,
                        right: rightMsg.payload,
                        leftMessage: leftMsg,
                        rightMessage: rightMsg,
                    });
                    matched = true;
                }
            }
            if (!matched) {
                this.resultSubject.next({
                    key,
                    left: null,
                    right: rightMsg.payload,
                    leftMessage: null,
                    rightMessage: rightMsg,
                });
            }
        }
    }
    /**
     * Full outer join
     */
    performFullOuterJoin(key, leftMessages, rightMessages) {
        const matchedLeft = new Set();
        const matchedRight = new Set();
        // Find matches
        for (const leftMsg of leftMessages) {
            for (const rightMsg of rightMessages) {
                if (this.isWithinWindow(leftMsg, rightMsg)) {
                    this.resultSubject.next({
                        key,
                        left: leftMsg.payload,
                        right: rightMsg.payload,
                        leftMessage: leftMsg,
                        rightMessage: rightMsg,
                    });
                    matchedLeft.add(leftMsg);
                    matchedRight.add(rightMsg);
                }
            }
        }
        // Emit unmatched left
        for (const leftMsg of leftMessages) {
            if (!matchedLeft.has(leftMsg)) {
                this.resultSubject.next({
                    key,
                    left: leftMsg.payload,
                    right: null,
                    leftMessage: leftMsg,
                    rightMessage: null,
                });
            }
        }
        // Emit unmatched right
        for (const rightMsg of rightMessages) {
            if (!matchedRight.has(rightMsg)) {
                this.resultSubject.next({
                    key,
                    left: null,
                    right: rightMsg.payload,
                    leftMessage: null,
                    rightMessage: rightMsg,
                });
            }
        }
    }
    /**
     * Check if messages are within join window
     */
    isWithinWindow(leftMsg, rightMsg) {
        const timeDiff = Math.abs(leftMsg.metadata.timestamp - rightMsg.metadata.timestamp);
        return timeDiff <= this.spec.windowSpec.size;
    }
    /**
     * Start window cleanup
     */
    startWindowCleanup() {
        setInterval(() => {
            const now = Date.now();
            const windowSize = this.spec.windowSpec.size;
            // Cleanup left windows
            for (const [key, messages] of this.leftWindows.entries()) {
                const filtered = messages.filter((msg) => now - msg.metadata.timestamp < windowSize);
                if (filtered.length === 0) {
                    this.leftWindows.delete(key);
                }
                else {
                    this.leftWindows.set(key, filtered);
                }
            }
            // Cleanup right windows
            for (const [key, messages] of this.rightWindows.entries()) {
                const filtered = messages.filter((msg) => now - msg.metadata.timestamp < windowSize);
                if (filtered.length === 0) {
                    this.rightWindows.delete(key);
                }
                else {
                    this.rightWindows.set(key, filtered);
                }
            }
        }, 10000); // Cleanup every 10 seconds
    }
    /**
     * Get join results as observable
     */
    asObservable() {
        return this.resultSubject.asObservable();
    }
}
exports.StreamJoin = StreamJoin;
/**
 * Interval join for temporal joins
 */
class IntervalJoin extends StreamJoin {
    lowerBound;
    upperBound;
    constructor(leftStream, rightStream, spec, leftKeyExtractor, rightKeyExtractor, lowerBound, upperBound) {
        super(leftStream, rightStream, spec, leftKeyExtractor, rightKeyExtractor);
        this.lowerBound = lowerBound;
        this.upperBound = upperBound;
    }
    /**
     * Check if messages are within interval
     */
    isWithinWindow(leftMsg, rightMsg) {
        const timeDiff = rightMsg.metadata.timestamp - leftMsg.metadata.timestamp;
        return timeDiff >= this.lowerBound && timeDiff <= this.upperBound;
    }
}
exports.IntervalJoin = IntervalJoin;
