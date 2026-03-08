"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadingStates = void 0;
const react_1 = __importDefault(require("react"));
const progress_1 = require("../progress");
const Skeleton_1 = require("../Skeleton");
const tokens_1 = require("@/theme/tokens");
const meta = {
    title: 'Design System/Feedback/Skeleton & Progress',
    component: Skeleton_1.Skeleton,
};
exports.default = meta;
exports.LoadingStates = {
    render: () => (<div style={{
            display: 'grid',
            gap: (0, tokens_1.tokenVar)('ds-space-sm'),
            maxWidth: '520px',
        }}>
      <div className="space-y-2">
        <Skeleton_1.Skeleton className="h-6 w-2/3"/>
        <Skeleton_1.Skeleton className="h-4 w-full"/>
        <Skeleton_1.Skeleton className="h-4 w-5/6"/>
      </div>
      <progress_1.Progress value={48}/>
    </div>),
};
