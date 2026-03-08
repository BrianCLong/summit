"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CiSummary;
const react_1 = __importDefault(require("react"));
function CiSummary({ annotations, }) {
    const by = (lvl) => annotations.filter((a) => a.level === lvl).length;
    const repos = new Set(annotations.map((a) => a.repo).filter(Boolean));
    return (<div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <Card label="Failures" value={by('failure')}/>
      <Card label="Warnings" value={by('warning')}/>
      <Card label="Notices" value={by('notice')}/>
      <Card label="Repos" value={repos.size}/>
    </div>);
}
function Card({ label, value }) {
    return (<div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>);
}
