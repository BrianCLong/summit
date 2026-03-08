"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalTimelineEvent = void 0;
const react_1 = __importDefault(require("react"));
const ApprovalTimelineEvent = ({ approvalId, type, at, actorId, onOpenApproval, }) => {
    const label = type === "grant_elevated_access.requested"
        ? "Requested elevated access"
        : type === "grant_elevated_access.approved"
            ? "Approved elevated access"
            : "Rejected elevated access";
    return (<div className="flex items-start gap-2 text-xs">
      <div className="w-1 h-1 mt-1 rounded-full bg-gray-600"/>
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-gray-500">
          {new Date(at).toLocaleString()} • {actorId}
        </div>
        <button className="text-[11px] mt-1 underline text-gray-700" onClick={() => onOpenApproval(approvalId)}>
          View approval & receipt
        </button>
      </div>
    </div>);
};
exports.ApprovalTimelineEvent = ApprovalTimelineEvent;
