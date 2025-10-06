#!/usr/bin/env node
import { createRuntime } from '../../dist/index.js';

const runtime = createRuntime();
const diagnostics = runtime.flushDiagnostics();
console.log(JSON.stringify(diagnostics, null, 2));
