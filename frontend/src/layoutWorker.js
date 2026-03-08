"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cytoscape_1 = __importDefault(require("cytoscape"));
const cytoscape_cose_bilkent_1 = __importDefault(require("cytoscape-cose-bilkent"));
cytoscape_1.default.use(cytoscape_cose_bilkent_1.default);
self.onmessage = (e) => {
    const { elements } = e.data;
    const cy = (0, cytoscape_1.default)({
        elements,
        style: [],
        headless: true,
    });
    const layout = cy.layout({ name: 'cose-bilkent', randomize: false });
    layout.run();
    const positions = {};
    cy.nodes().forEach((n) => {
        positions[n.id()] = n.position();
    });
    self.postMessage({ positions });
};
