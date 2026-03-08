"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importDefault(require("react"));
const material_1 = require("@mui/material");
const jquery_1 = __importDefault(require("jquery"));
const graph_algos_js_1 = require("@intelgraph/graph-algos-js");
const AlgosWidget = ({ cy, serviceUrl }) => {
    react_1.default.useEffect(() => {
        const handler = (evt) => console.log('cy event', evt.type);
        (0, jquery_1.default)(cy.container()).on('tap', handler);
        return () => {
            (0, jquery_1.default)(cy.container()).off('tap', handler);
        };
    }, [cy]);
    const runPagerank = async () => {
        const nodes = cy.nodes().map((n) => n.id());
        const edges = cy.edges().map((e) => [e.source().id(), e.target().id()]);
        await (0, graph_algos_js_1.pagerank)(serviceUrl, { nodes, edges });
    };
    return (<material_1.Box>
      <material_1.Button variant="contained" onClick={runPagerank}>
        Run PageRank
      </material_1.Button>
    </material_1.Box>);
};
exports.default = AlgosWidget;
