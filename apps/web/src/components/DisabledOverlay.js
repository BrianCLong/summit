"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisabledOverlay = DisabledOverlay;
const react_1 = __importDefault(require("react"));
const Tooltip_1 = require("@/components/ui/Tooltip");
const utils_1 = require("@/lib/utils");
function DisabledOverlay({ message = "Upgrade to perform this action", className, children }) {
    // If children are provided, wrap them in a tooltip and make them look disabled
    if (children) {
        return (<Tooltip_1.TooltipProvider>
        <Tooltip_1.Tooltip>
          <Tooltip_1.TooltipTrigger asChild>
            <div className={(0, utils_1.cn)("relative inline-block cursor-not-allowed opacity-50", className)}>
              <div className="pointer-events-none">
                {children}
              </div>
            </div>
          </Tooltip_1.TooltipTrigger>
          <Tooltip_1.TooltipContent>
            <p>{message}</p>
          </Tooltip_1.TooltipContent>
        </Tooltip_1.Tooltip>
      </Tooltip_1.TooltipProvider>);
    }
    // If no children, show a standalone banner/overlay
    return (<div className={(0, utils_1.cn)("flex items-center justify-center p-4 bg-muted/50 border-2 border-dashed border-muted rounded-lg text-sm text-muted-foreground", className)}>
      <span>{message}</span>
    </div>);
}
