"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference types="cypress" />
const harness_1 = require("../../tests/utils/harness");
const mapboxStub_1 = require("../../tests/utils/mapboxStub");
const generateGraph_1 = require("../../tests/utils/generateGraph");
Cypress.Commands.add('bootstrapWebapp', (seed = 5) => {
    const graph = (0, generateGraph_1.generateGraphData)({ seed, nodes: 4 });
    const mapState = (0, mapboxStub_1.createMapboxState)();
    cy.visit('/', {
        onBeforeLoad(win) {
            (0, harness_1.applyTestHarness)(graph, mapState);
            win.__E2E_GRAPH__ = graph;
        },
    });
});
