"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateGraphRequest = void 0;
var CreateGraphRequest;
(function (CreateGraphRequest) {
    let layout;
    (function (layout) {
        layout["FORCE_DIRECTED"] = "force-directed";
        layout["HIERARCHICAL"] = "hierarchical";
        layout["CIRCULAR"] = "circular";
    })(layout = CreateGraphRequest.layout || (CreateGraphRequest.layout = {}));
})(CreateGraphRequest || (exports.CreateGraphRequest = CreateGraphRequest = {}));
