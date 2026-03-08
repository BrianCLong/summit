"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernancePanel = GovernancePanel;
exports.AgentControlPanel = AgentControlPanel;
exports.CIStatusPanel = CIStatusPanel;
exports.ReleasePanel = ReleasePanel;
exports.ZKIsolationPanel = ZKIsolationPanel;
exports.StreamingPanel = StreamingPanel;
exports.GAReadinessPanel = GAReadinessPanel;
const react_1 = __importDefault(require("react"));
const StatusPanel_1 = require("./StatusPanel");
const useCommandStatus_1 = require("../useCommandStatus");
function GovernancePanel() {
    const { state } = (0, useCommandStatus_1.useCommandStatus)();
    return <StatusPanel_1.StatusPanel title="Governance" status={state.statuses.governance} fallbackTitle="Governance & Controls"/>;
}
function AgentControlPanel() {
    const { state } = (0, useCommandStatus_1.useCommandStatus)();
    return <StatusPanel_1.StatusPanel title="Agent Control" status={state.statuses.agents} fallbackTitle="Agent Control"/>;
}
function CIStatusPanel() {
    const { state } = (0, useCommandStatus_1.useCommandStatus)();
    return <StatusPanel_1.StatusPanel title="CI / Quality" status={state.statuses.ci} fallbackTitle="CI"/>;
}
function ReleasePanel() {
    const { state } = (0, useCommandStatus_1.useCommandStatus)();
    return <StatusPanel_1.StatusPanel title="Release Train" status={state.statuses.releases} fallbackTitle="Release"/>;
}
function ZKIsolationPanel() {
    const { state } = (0, useCommandStatus_1.useCommandStatus)();
    return <StatusPanel_1.StatusPanel title="ZK Isolation" status={state.statuses.zk} fallbackTitle="ZK Isolation"/>;
}
function StreamingPanel() {
    const { state } = (0, useCommandStatus_1.useCommandStatus)();
    return <StatusPanel_1.StatusPanel title="Streaming" status={state.statuses.streaming} fallbackTitle="Streaming"/>;
}
function GAReadinessPanel() {
    const { state } = (0, useCommandStatus_1.useCommandStatus)();
    return <StatusPanel_1.StatusPanel title="GA Readiness" status={state.statuses.ga} fallbackTitle="GA"/>;
}
