"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeType = exports.NodeType = void 0;
var NodeType;
(function (NodeType) {
    NodeType["Narrative"] = "Narrative";
    NodeType["Claim"] = "Claim";
    NodeType["Actor"] = "Actor";
    NodeType["Platform"] = "Platform";
    NodeType["Event"] = "Event";
    NodeType["Artifact"] = "Artifact";
    NodeType["Regulation"] = "Regulation";
})(NodeType || (exports.NodeType = NodeType = {}));
var EdgeType;
(function (EdgeType) {
    EdgeType["AMPLIFIES"] = "AMPLIFIES";
    EdgeType["REFERENCES"] = "REFERENCES";
    EdgeType["TARGETS"] = "TARGETS";
    EdgeType["COUPLED_WITH"] = "COUPLED_WITH";
    EdgeType["EVIDENCED_BY"] = "EVIDENCED_BY";
})(EdgeType || (exports.EdgeType = EdgeType = {}));
