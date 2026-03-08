"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Admin;
// =============================================
// Maestro Admin Interface
// =============================================
const react_1 = __importDefault(require("react"));
const TenantAdminPanel_1 = __importDefault(require("./admin/TenantAdminPanel"));
function Admin() {
    return (<div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Switchboard Admin</h1>
        <p className="mt-2 text-gray-600">
          Tenant management, policy profiles, quotas, and rollback controls for
          the Switchboard area.
        </p>
      </div>
      <TenantAdminPanel_1.default />
    </div>);
}
