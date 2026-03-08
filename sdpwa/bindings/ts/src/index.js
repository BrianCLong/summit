"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingDpWindowAggregator = void 0;
const MS_SUFFIX = "ms";
function encodeDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0) {
        throw new RangeError(`duration must be a non-negative finite number, received ${ms}`);
    }
    return `${ms}${MS_SUFFIX}`;
}
function normaliseConfig(config) {
    const origin = config.window.originMs ?? 0;
    return {
        dp: {
            epsilon_count: config.dp.epsilonCount,
            epsilon_sum: config.dp.epsilonSum,
            delta_per_window: config.dp.deltaPerWindow,
            ledger_delta_tolerance: config.dp.ledgerDeltaTolerance
        },
        bounds: {
            max_contributions_per_window: config.bounds.maxContributionsPerWindow,
            min_value: config.bounds.minValue,
            max_value: config.bounds.maxValue
        },
        window: {
            window_size: encodeDuration(config.window.windowSizeMs),
            window_stride: encodeDuration(config.window.windowStrideMs),
            origin_ms: origin
        }
    };
}
class StreamingDpWindowAggregator {
    handle;
    constructor(handle) {
        this.handle = handle;
    }
    static async create(initWasm, config, seed, moduleOrPath) {
        const wasm = await initWasm(moduleOrPath);
        const handle = new wasm.WasmAggregator(normaliseConfig(config), seed);
        return new StreamingDpWindowAggregator(handle);
    }
    ingest(event) {
        this.handle.ingest(event);
    }
    release(upToMs) {
        return this.handle.release(upToMs);
    }
    ledger() {
        return this.handle.ledger();
    }
}
exports.StreamingDpWindowAggregator = StreamingDpWindowAggregator;
