"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttackSurfaceMonitor = exports.SurfaceScanner = exports.analyzeSurface = void 0;
// Mock for @intelgraph/attack-surface
const analyzeSurface = async () => ({ score: 0, findings: [] });
exports.analyzeSurface = analyzeSurface;
const SurfaceScanner = class {
    scan() { return Promise.resolve({ vulnerabilities: [] }); }
};
exports.SurfaceScanner = SurfaceScanner;
const AttackSurfaceMonitor = class {
    constructor() { }
    start() { return Promise.resolve(); }
    stop() { return Promise.resolve(); }
    getMetrics() { return { endpoints: 0, vulnerabilities: 0 }; }
    scan() { return Promise.resolve({ score: 0, findings: [] }); }
};
exports.AttackSurfaceMonitor = AttackSurfaceMonitor;
exports.default = { analyzeSurface: exports.analyzeSurface, SurfaceScanner: exports.SurfaceScanner, AttackSurfaceMonitor: exports.AttackSurfaceMonitor };
