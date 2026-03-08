"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceMode = MaintenanceMode;
const react_1 = __importDefault(require("react"));
const Card_1 = require("@/components/ui/Card");
const lucide_react_1 = require("lucide-react");
function MaintenanceMode() {
    return (<div className="flex min-h-[400px] w-full items-center justify-center p-6">
      <Card_1.Card className="flex w-full max-w-md flex-col items-center gap-6 p-8 text-center">
        <div className="rounded-full bg-muted p-4">
          <lucide_react_1.Hammer className="h-8 w-8 text-muted-foreground"/>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Maintenance Mode
          </h2>
          <p className="text-sm text-muted-foreground">
            We are currently performing scheduled maintenance. Please check back later.
          </p>
        </div>
      </Card_1.Card>
    </div>);
}
