"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecentActivity = RecentActivity;
// @ts-nocheck
const react_1 = __importDefault(require("react"));
function RecentActivity({ className = '' }) {
    return (<div className={`p-4 ${className}`}>
      <h3 className="font-semibold mb-3 dark:text-white">Recent Activity</h3>
      <div className="space-y-2">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm dark:text-gray-200">No recent activity</p>
        </div>
      </div>
    </div>);
}
