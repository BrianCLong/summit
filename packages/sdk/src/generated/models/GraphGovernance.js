"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphGovernance = void 0;
var GraphGovernance;
(function (GraphGovernance) {
    let sensitivity;
    (function (sensitivity) {
        sensitivity["PUBLIC"] = "public";
        sensitivity["INTERNAL"] = "internal";
        sensitivity["RESTRICTED"] = "restricted";
        sensitivity["CONFIDENTIAL"] = "confidential";
    })(sensitivity = GraphGovernance.sensitivity || (GraphGovernance.sensitivity = {}));
})(GraphGovernance || (exports.GraphGovernance = GraphGovernance = {}));
