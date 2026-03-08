"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTracer = exports.initializeTracing = void 0;
const initializeTracing = () => ({ initialize: () => { } });
exports.initializeTracing = initializeTracing;
const getTracer = () => ({ startSpan: () => ({ end: () => { } }) });
exports.getTracer = getTracer;
