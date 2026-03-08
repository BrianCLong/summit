"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusIndicator = StatusIndicator;
// @ts-nocheck
const react_1 = __importDefault(require("react"));
function StatusIndicator({ status = 'online', className = '' }) {
    const statusColors = {
        online: 'bg-green-500',
        offline: 'bg-red-500',
        syncing: 'bg-yellow-500',
    };
    const statusLabels = {
        online: 'Online',
        offline: 'Offline',
        syncing: 'Syncing...',
    };
    return (<div className={`flex items-center gap-2 ${className}`}>
      <span className={`w-2 h-2 rounded-full ${statusColors[status]}`}/>
      <span className="text-sm text-gray-600 dark:text-gray-400">{statusLabels[status]}</span>
    </div>);
}
