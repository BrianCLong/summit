"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DLQReplay;
// =============================================
// Maestro DLQ & Replay Management
// =============================================
const react_1 = __importDefault(require("react"));
function DLQReplay() {
    return (<div className="p-6">
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">DLQ & Replay</h1>
        <p className="mt-2 text-gray-600">
          Dead letter queue and replay management - Coming soon
        </p>
      </div>
    </div>);
}
