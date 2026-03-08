"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFound = void 0;
const react_1 = __importDefault(require("react"));
const Button_1 = require("@/components/ui/Button");
const lucide_react_1 = require("lucide-react");
const react_router_dom_1 = require("react-router-dom");
const NotFound = () => {
    const navigate = (0, react_router_dom_1.useNavigate)();
    return (<div className="flex h-full min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="bg-muted p-4 rounded-full mb-6">
        <lucide_react_1.AlertTriangle className="h-10 w-10 text-muted-foreground"/>
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-2">404</h1>
      <h2 className="text-xl font-semibold mb-4">Page Not Found</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Button_1.Button onClick={() => navigate(-1)} variant="outline">
        <lucide_react_1.ArrowLeft className="mr-2 h-4 w-4"/>
        Go Back
      </Button_1.Button>
    </div>);
};
exports.NotFound = NotFound;
