"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportToPpc = void 0;
const serializeRulePayload = (object) => {
    let extension;
    if ('extensions' in object && object.extensions) {
        const raw = object.extensions['x-llm-threat-extension'];
        if (raw && typeof raw === 'object') {
            extension = raw;
        }
    }
    if (object.type === 'attack-pattern') {
        return {
            kind: 'prompt-block',
            name: object.name,
            llm_family: extension?.['llm_family'],
            prompt: extension?.['prompt'],
            severity: extension?.['severity']
        };
    }
    if (object.type === 'indicator') {
        return {
            kind: 'tool-usage',
            pattern: object.pattern,
            llm_family: extension?.['llm_family'],
            mitigation: extension?.['mitigation']
        };
    }
    return { kind: object.type };
};
const exportToPpc = (objects, signing, version = '1.0.0') => {
    const rules = objects.map((object) => ({
        id: `ppc-${object.id}`,
        description: object.description ?? object.type,
        payload: serializeRulePayload(object)
    }));
    const unsigned = {
        id: `update--ppc-${Date.now()}`,
        framework: 'PPC',
        version,
        generated_at: new Date().toISOString(),
        rules
    };
    return {
        ...unsigned,
        signature: signing.sign({ ...unsigned })
    };
};
exports.exportToPpc = exportToPpc;
