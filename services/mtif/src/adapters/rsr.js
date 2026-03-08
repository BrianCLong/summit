"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportToRsr = void 0;
const normalizeRule = (object) => {
    let extension;
    if ('extensions' in object && object.extensions) {
        const raw = object.extensions['x-llm-threat-extension'];
        if (raw && typeof raw === 'object') {
            extension = raw;
        }
    }
    if (object.type === 'attack-pattern') {
        return {
            guard: 'response-filter',
            guidance: extension?.['mitigation'],
            prompt_signature: extension?.['prompt_hash']
        };
    }
    if (object.type === 'indicator') {
        return {
            guard: 'tool-suppression',
            pattern: object.pattern,
            severity: extension?.['severity'],
            response: extension?.['response']
        };
    }
    return { guard: 'reference', id: object.id };
};
const exportToRsr = (objects, signing, version = '1.0.0') => {
    const rules = objects.map((object) => ({
        id: `rsr-${object.id}`,
        description: object.description ?? object.type,
        payload: normalizeRule(object)
    }));
    const unsigned = {
        id: `update--rsr-${Date.now()}`,
        framework: 'RSR',
        version,
        generated_at: new Date().toISOString(),
        rules
    };
    return {
        ...unsigned,
        signature: signing.sign({ ...unsigned })
    };
};
exports.exportToRsr = exportToRsr;
