import { getCounterAiDiagnostics } from '../src/counter_ai/diagnostics';

const diag = getCounterAiDiagnostics();
console.log(JSON.stringify(diag, null, 2));
