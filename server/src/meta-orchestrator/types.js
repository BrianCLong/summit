"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NegotiationStatus = exports.AgentStatus = void 0;
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["IDLE"] = "IDLE";
    AgentStatus["BUSY"] = "BUSY";
    AgentStatus["OFFLINE"] = "OFFLINE";
    AgentStatus["ERROR"] = "ERROR";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
var NegotiationStatus;
(function (NegotiationStatus) {
    NegotiationStatus["PENDING"] = "PENDING";
    NegotiationStatus["IN_PROGRESS"] = "IN_PROGRESS";
    NegotiationStatus["COMPLETED"] = "COMPLETED";
    NegotiationStatus["FAILED"] = "FAILED";
})(NegotiationStatus || (exports.NegotiationStatus = NegotiationStatus = {}));
