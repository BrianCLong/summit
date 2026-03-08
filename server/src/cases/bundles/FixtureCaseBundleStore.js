"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixtureCaseBundleStore = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
class FixtureCaseBundleStore {
    data;
    constructor(fixturePath = path_1.default.join(process.cwd(), 'src', 'cases', 'bundles', 'fixtures', 'basic-data.json')) {
        this.data = { cases: [], evidence: [], notes: [], graph: { nodes: [], edges: [] } };
        this.loadFixture(fixturePath);
    }
    loadFixture(fixturePath) {
        const file = (0, fs_1.readFileSync)(fixturePath, 'utf-8');
        this.data = JSON.parse(file);
    }
    async getCases(caseIds) {
        return this.data.cases.filter((c) => caseIds.includes(c.id)).map((c) => ({
            id: c.id,
            title: c.title,
            status: c.status,
            description: c.description,
            compartment: c.compartment,
            policyLabels: c.policyLabels,
            metadata: c.metadata,
        }));
    }
    async getEvidence(caseIds) {
        return this.data.evidence.filter((e) => caseIds.includes(e.caseId));
    }
    async getNotes(caseIds) {
        return this.data.notes.filter((n) => caseIds.includes(n.caseId));
    }
    async getGraphSubset(caseIds) {
        const nodes = this.data.graph.nodes.filter((n) => !n.caseId || caseIds.includes(n.caseId));
        const nodeIds = new Set(nodes.map((n) => n.id));
        const edges = this.data.graph.edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
        return { nodes, edges };
    }
}
exports.FixtureCaseBundleStore = FixtureCaseBundleStore;
