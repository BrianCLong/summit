"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacySettingsPane = void 0;
const react_1 = __importDefault(require("react"));
const PrivacyBudgetDisplay_1 = require("./PrivacyBudgetDisplay");
const PrivacySettingsPane = () => {
    return (<div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Privacy Settings</h2>
      <PrivacyBudgetDisplay_1.PrivacyBudgetDisplay />

      <div className="border p-4 rounded-md">
        <h3 className="font-semibold mb-2">Global DP Policy</h3>
        <div className="text-sm text-gray-600">
          <p>Mechanism: Laplace / Gaussian</p>
          <p>Epsilon (ε): 10.0 (Daily)</p>
          <p>Status: <span className="text-green-600 font-bold">Active</span></p>
        </div>
      </div>
    </div>);
};
exports.PrivacySettingsPane = PrivacySettingsPane;
