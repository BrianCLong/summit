"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricValidator = void 0;
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
class MetricValidator {
    dictionaryPath;
    constructor(dictionaryPath) {
        this.dictionaryPath = dictionaryPath;
    }
    validate() {
        const errors = [];
        if (!fs_1.default.existsSync(this.dictionaryPath)) {
            return ['Dictionary file not found'];
        }
        const content = fs_1.default.readFileSync(this.dictionaryPath, 'utf-8');
        let metrics;
        try {
            metrics = js_yaml_1.default.load(content);
        }
        catch (e) {
            return [`Invalid YAML: ${e.message}`];
        }
        if (!Array.isArray(metrics)) {
            return ['Dictionary must be an array of metrics'];
        }
        metrics.forEach((m, idx) => {
            if (!m.name)
                errors.push(`Metric at index ${idx} missing name`);
            if (!m.owner)
                errors.push(`Metric ${m.name || idx} missing owner`);
            if (!m.retentionDays)
                errors.push(`Metric ${m.name || idx} missing retentionDays`);
            if (!m.sourceEvents || m.sourceEvents.length === 0)
                errors.push(`Metric ${m.name || idx} missing sourceEvents`);
        });
        // Scan code for usage (mocked for this script, but in real CI we'd grep)
        // For MVP, we just validate the schema integrity.
        return errors;
    }
    // Simulates checking if all emitted events are covered in the dictionary
    validateCoverage(emittedEvents) {
        const content = fs_1.default.readFileSync(this.dictionaryPath, 'utf-8');
        const metrics = js_yaml_1.default.load(content);
        const coveredEvents = new Set(metrics.flatMap(m => m.sourceEvents));
        const errors = [];
        for (const event of emittedEvents) {
            if (!coveredEvents.has(event)) {
                // In strict mode, every event should map to at least one metric?
                // Or maybe the dictionary lists events?
                // The prompt says "Fails if telemetry events exist without dictionary entries"
                // Assuming "dictionary entries" means metrics OR just defined events.
                // Let's assume metrics define the "why" we collect an event.
                errors.push(`Event '${event}' is emitted but not used in any metric definition`);
            }
        }
        return errors;
    }
}
exports.MetricValidator = MetricValidator;
