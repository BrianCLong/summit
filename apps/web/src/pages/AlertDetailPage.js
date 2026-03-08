"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AlertDetailPage;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const EmptyState_1 = require("@/components/ui/EmptyState");
function AlertDetailPage() {
    const { id } = (0, react_router_dom_1.useParams)();
    return (<div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Alert Details: {id}</h1>
      <EmptyState_1.EmptyState title="Alert detail page under construction" description="This page will show detailed information about a specific alert" icon="alert"/>
    </div>);
}
