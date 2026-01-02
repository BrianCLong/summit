import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface MetricDefinition {
    name: string;
    type: string;
    owner: string;
    description: string;
    formula: string;
    sourceEvents: string[];
    piiClass: string;
    retentionDays: number;
}

export class MetricValidator {
    private dictionaryPath: string;

    constructor(dictionaryPath: string) {
        this.dictionaryPath = dictionaryPath;
    }

    public validate(): string[] {
        const errors: string[] = [];
        if (!fs.existsSync(this.dictionaryPath)) {
            return ['Dictionary file not found'];
        }

        const content = fs.readFileSync(this.dictionaryPath, 'utf-8');
        let metrics: MetricDefinition[];

        try {
            metrics = yaml.load(content) as MetricDefinition[];
        } catch (e: any) {
            return [`Invalid YAML: ${(e as Error).message}`];
        }

        if (!Array.isArray(metrics)) {
            return ['Dictionary must be an array of metrics'];
        }

        metrics.forEach((m, idx) => {
            if (!m.name) errors.push(`Metric at index ${idx} missing name`);
            if (!m.owner) errors.push(`Metric ${m.name || idx} missing owner`);
            if (!m.retentionDays) errors.push(`Metric ${m.name || idx} missing retentionDays`);
            if (!m.sourceEvents || m.sourceEvents.length === 0) errors.push(`Metric ${m.name || idx} missing sourceEvents`);
        });

        // Scan code for usage (mocked for this script, but in real CI we'd grep)
        // For MVP, we just validate the schema integrity.

        return errors;
    }

    // Simulates checking if all emitted events are covered in the dictionary
    public validateCoverage(emittedEvents: string[]): string[] {
        const content = fs.readFileSync(this.dictionaryPath, 'utf-8');
        const metrics = yaml.load(content) as MetricDefinition[];
        const coveredEvents = new Set(metrics.flatMap(m => m.sourceEvents));

        const errors: string[] = [];
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
