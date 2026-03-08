"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SupplyChainDashboard;
const react_1 = __importDefault(require("react"));
const EmptyState_1 = require("@/components/ui/EmptyState");
function SupplyChainDashboard() {
    return (<div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Supply Chain Dashboard</h1>
      <EmptyState_1.EmptyState title="Supply Chain dashboard under construction" description="This will show supply chain risk analysis and monitoring" icon="plus"/>
    </div>);
}
