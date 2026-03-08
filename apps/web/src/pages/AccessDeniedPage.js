"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AccessDeniedPage;
const react_1 = __importDefault(require("react"));
const EmptyState_1 = require("@/components/ui/EmptyState");
const react_router_dom_1 = require("react-router-dom");
function AccessDeniedPage() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    return (<div className="min-h-screen flex items-center justify-center p-6">
      <EmptyState_1.EmptyState title="Access Denied" description="You don't have permission to access this resource" icon="alert" action={{
            label: 'Go Home',
            onClick: () => navigate('/'),
        }}/>
    </div>);
}
