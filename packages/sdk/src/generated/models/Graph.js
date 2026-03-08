"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Graph = void 0;
var Graph;
(function (Graph) {
    let layout;
    (function (layout) {
        layout["FORCE_DIRECTED"] = "force-directed";
        layout["HIERARCHICAL"] = "hierarchical";
        layout["CIRCULAR"] = "circular";
    })(layout = Graph.layout || (Graph.layout = {}));
    let theme;
    (function (theme) {
        theme["LIGHT"] = "light";
        theme["DARK"] = "dark";
        theme["HIGH_CONTRAST"] = "high-contrast";
    })(theme = Graph.theme || (Graph.theme = {}));
})(Graph || (exports.Graph = Graph = {}));
