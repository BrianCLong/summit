
import {
    SchemaRegistryService,
} from './SchemaRegistryService.js';
import {
    OntologyAssertion,
    ValidationResult,
    SchemaDefinition,
    InferenceResult
} from './models.js';
import { randomUUID } from 'crypto';

export class OntologyExecutionService {
    private static instance: OntologyExecutionService;
    private registry: SchemaRegistryService;

    public constructor(registry?: SchemaRegistryService) {
        this.registry = registry || SchemaRegistryService.getInstance();
    }

    public static getInstance(): OntologyExecutionService {
        if (!OntologyExecutionService.instance) {
            OntologyExecutionService.instance = new OntologyExecutionService();
        }
        return OntologyExecutionService.instance;
    }

    /**
     * Validates a raw object against an Entity definition in the active schema.
     */
    public async validate(entityType: string, data: any): Promise<ValidationResult> {
        const schema = this.registry.getLatestSchema();
        if (!schema) {
            return { valid: false, errors: ['No active schema found'] };
        }

        const entityDef = schema.definition.entities.find(e => e.name === entityType);
        if (!entityDef) {
            return { valid: false, errors: [`Entity type '${entityType}' not defined in active schema`] };
        }

        const errors: string[] = [];

        for (const field of entityDef.fields) {
            const value = data[field.name];

            // Required check
            if (field.required && (value === undefined || value === null)) {
                errors.push(`Missing required field: ${field.name}`);
                continue;
            }

            // Type check (basic)
            if (value !== undefined && value !== null) {
                if (field.type === 'string' && typeof value !== 'string') {
                    errors.push(`Field '${field.name}' expected string, got ${typeof value}`);
                }
                if (field.type === 'number' && typeof value !== 'number') {
                    errors.push(`Field '${field.name}' expected number, got ${typeof value}`);
                }
                if (field.type === 'boolean' && typeof value !== 'boolean') {
                    errors.push(`Field '${field.name}' expected boolean, got ${typeof value}`);
                }
                if (field.type === 'date') {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) {
                        errors.push(`Field '${field.name}' expected date, got invalid date`);
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Infer new assertions based on input assertions using simple deterministic rules.
     * This is a placeholder for a more complex reasoning engine (e.g., Datalog or OWL reasoner).
     */
    public async infer(assertions: OntologyAssertion[]): Promise<InferenceResult> {
        const inferred: OntologyAssertion[] = [];

        for (const assertion of assertions) {
             const newFacts = await this.applyRules(assertion);
             inferred.push(...newFacts);
        }

        return {
            assertions: inferred,
            explanation: `Inferred ${inferred.length} new facts based on ${assertions.length} inputs.`
        };
    }

    private async applyRules(assertion: OntologyAssertion): Promise<OntologyAssertion[]> {
        const facts: OntologyAssertion[] = [];

        // Rule 1: High Confidence Propagation
        // If an assertion has high confidence (>0.9), infer a "Verified" flag assertion.
        if (assertion.probabilistic.confidence > 0.9) {
            facts.push({
                id: randomUUID(),
                entityType: assertion.entityType,
                entityId: assertion.entityId,
                property: 'isVerified',
                value: true,
                temporal: assertion.temporal,
                probabilistic: {
                    confidence: 1.0,
                    source: 'OntologyInferenceEngine',
                    method: 'HighConfidencePropagation'
                },
                provenance: {
                    derivedFrom: [assertion.id],
                    ruleId: 'RULE-001-HIGH-CONFIDENCE'
                }
            });
        }

        return facts;
    }

    /**
     * Project assertions to a specific point in time.
     * Filters out assertions that are not valid at the given time.
     */
    public async project(assertions: OntologyAssertion[], time: Date): Promise<OntologyAssertion[]> {
        return assertions.filter(a => {
            const start = new Date(a.temporal.validFrom);
            const end = a.temporal.validTo ? new Date(a.temporal.validTo) : new Date('9999-12-31');
            return time >= start && time <= end;
        });
    }

    /**
     * Explain the provenance of a specific assertion.
     */
    public async explain(assertion: OntologyAssertion): Promise<string> {
        if (assertion.provenance.ruleId) {
            return `Assertion ${assertion.id} was inferred via rule ${assertion.provenance.ruleId} from sources: [${assertion.provenance.derivedFrom?.join(', ')}]`;
        }
        return `Assertion ${assertion.id} is a base fact from source: ${assertion.probabilistic.source} (Confidence: ${assertion.probabilistic.confidence})`;
    }
}
