"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ChangelogPage;
const react_1 = __importDefault(require("react"));
const EmptyState_1 = require("@/components/ui/EmptyState");
function ChangelogPage() {
    return (<div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Changelog</h1>
      <EmptyState_1.EmptyState title="Changelog page under construction" description="This will show platform updates and release notes" icon="plus"/>
    </div>);
}
