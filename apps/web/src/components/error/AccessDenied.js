"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessDenied = AccessDenied;
const react_1 = __importDefault(require("react"));
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const lucide_react_1 = require("lucide-react");
const react_router_dom_1 = require("react-router-dom");
function AccessDenied() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    return (<div className="flex min-h-[400px] w-full items-center justify-center p-6">
      <Card_1.Card className="flex w-full max-w-md flex-col items-center gap-6 p-8 text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <lucide_react_1.ShieldAlert className="h-8 w-8 text-destructive"/>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Access Denied
          </h2>
          <p className="text-sm text-muted-foreground">
            You do not have permission to access this resource.
          </p>
        </div>

        <Button_1.Button onClick={() => navigate('/')} variant="outline">
          Return Home
        </Button_1.Button>
      </Card_1.Card>
    </div>);
}
