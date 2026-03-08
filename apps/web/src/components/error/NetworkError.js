"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkError = NetworkError;
const react_1 = __importDefault(require("react"));
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const lucide_react_1 = require("lucide-react");
function NetworkError({ onRetry }) {
    return (<div className="flex min-h-[400px] w-full items-center justify-center p-6">
      <Card_1.Card className="flex w-full max-w-md flex-col items-center gap-6 p-8 text-center">
        <div className="rounded-full bg-muted p-4">
          <lucide_react_1.WifiOff className="h-8 w-8 text-muted-foreground"/>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Connection Lost
          </h2>
          <p className="text-sm text-muted-foreground">
            Please check your internet connection and try again.
          </p>
        </div>

        {onRetry && (<Button_1.Button onClick={onRetry} variant="outline">
            Try Again
          </Button_1.Button>)}
      </Card_1.Card>
    </div>);
}
