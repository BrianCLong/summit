"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertsPanel = AlertsPanel;
// @ts-nocheck
const react_1 = __importDefault(require("react"));
function AlertsPanel({ className = '' }) {
    return (<div className={`p-4 ${className}`}>
      <h3 className="font-semibold mb-3 dark:text-white">Alerts</h3>
      <div className="space-y-2">
        <div className="p-3 bg-green-50 dark:bg-green-900 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">No active alerts</p>
        </div>
      </div>
    </div>);
}
