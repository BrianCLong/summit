"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitSpeechResult = emitSpeechResult;
const react_1 = require("@testing-library/react");
async function emitSpeechResult(transcript, idx) {
    // Wait for instance to exist (it's created in a useEffect)
    await (0, react_1.waitFor)(() => {
        const arr = window.__srInstances;
        if (!arr || arr.length === 0)
            throw new Error('No SpeechRecognition instance yet');
    }, { timeout: 10000 });
    const arr = window.__srInstances;
    const inst = typeof idx === 'number' ? arr[idx] : arr[arr.length - 1];
    if (!inst)
        throw new Error('No SpeechRecognition instance to emit to');
    // Directly trigger the mock recognition events
    inst.onresult?.({ results: [[[{ transcript }]]] });
    inst.onend?.();
}
