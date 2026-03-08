"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MaestroPage;
// =============================================
// File: apps/web/src/pages/MaestroPage.tsx
// =============================================
const react_1 = __importStar(require("react"));
const RoutingStudio_1 = __importDefault(require("../components/maestro/RoutingStudio"));
const WebOrchestrator_1 = __importDefault(require("../components/maestro/WebOrchestrator"));
const BudgetsPanel_1 = __importDefault(require("../components/maestro/BudgetsPanel"));
const LogsPanel_1 = __importDefault(require("../components/maestro/LogsPanel"));
function MaestroPage() {
    const [tab, setTab] = (0, react_1.useState)('routing');
    return (<div className="p-4 space-y-4">
      <header className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Maestro</h1>
        <nav className="tabs tabs-boxed ml-auto">
          <button className={`tab ${tab === 'routing' ? 'tab-active' : ''}`} onClick={() => setTab('routing')}>
            Routing
          </button>
          <button className={`tab ${tab === 'web' ? 'tab-active' : ''}`} onClick={() => setTab('web')}>
            Web
          </button>
          <button className={`tab ${tab === 'budgets' ? 'tab-active' : ''}`} onClick={() => setTab('budgets')}>
            Budgets
          </button>
          <button className={`tab ${tab === 'logs' ? 'tab-active' : ''}`} onClick={() => setTab('logs')}>
            Logs
          </button>
        </nav>
      </header>

      {tab === 'routing' && <RoutingStudio_1.default />}
      {tab === 'web' && <WebOrchestrator_1.default />}
      {tab === 'budgets' && <BudgetsPanel_1.default />}
      {tab === 'logs' && <LogsPanel_1.default />}
    </div>);
}
