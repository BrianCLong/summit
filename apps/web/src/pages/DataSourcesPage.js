"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DataSourcesPage;
// @ts-nocheck
const react_1 = __importDefault(require("react"));
const IngestionWizard_1 = require("@/features/ingestion/IngestionWizard");
function DataSourcesPage() {
    return (<div className="p-6 min-h-screen bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Data Sources & Ingestion</h1>
        <p className="text-gray-500 mt-1">
          Upload and map external data to IntelGraph canonical entities.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <IngestionWizard_1.IngestionWizard />
      </div>
    </div>);
}
