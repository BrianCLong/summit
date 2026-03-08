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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyState = EmptyState;
const React = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const Button_1 = require("./Button");
const iconMap = {
    search: lucide_react_1.Search,
    file: lucide_react_1.FileX,
    alert: lucide_react_1.AlertCircle,
    plus: lucide_react_1.Plus,
    chart: lucide_react_1.BarChart3,
    activity: lucide_react_1.Activity,
};
function EmptyState({ icon = 'file', title, description, action, className, }) {
    const IconComponent = typeof icon === 'string' ? iconMap[icon] : null;
    return (<div className={(0, utils_1.cn)('flex flex-col items-center justify-center p-8 text-center', className)}>
      <div className="mb-4 rounded-full bg-muted p-4">
        {IconComponent ? (<IconComponent className="h-8 w-8 text-muted-foreground" aria-hidden="true"/>) : React.isValidElement(icon) ? (React.cloneElement(icon, {
            'aria-hidden': 'true',
        })) : (icon)}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      {description && (<p className="mb-4 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>)}
      {action && (<Button_1.Button onClick={action.onClick} variant={action.variant || 'default'}>
          {action.label}
        </Button_1.Button>)}
    </div>);
}
