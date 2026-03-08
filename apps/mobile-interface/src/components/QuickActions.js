"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickActions = QuickActions;
// @ts-nocheck
const react_1 = __importDefault(require("react"));
function QuickActions({ className = '' }) {
    return (<div className={`grid grid-cols-4 gap-4 p-4 ${className}`}>
      <button className="flex flex-col items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <span className="text-2xl">📋</span>
        <span className="text-xs mt-1">New Case</span>
      </button>
      <button className="flex flex-col items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <span className="text-2xl">🔍</span>
        <span className="text-xs mt-1">Search</span>
      </button>
      <button className="flex flex-col items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <span className="text-2xl">📊</span>
        <span className="text-xs mt-1">Reports</span>
      </button>
      <button className="flex flex-col items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <span className="text-2xl">⚙️</span>
        <span className="text-xs mt-1">Settings</span>
      </button>
    </div>);
}
