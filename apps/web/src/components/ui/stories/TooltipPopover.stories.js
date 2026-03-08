"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopoverMenu = exports.TooltipExample = void 0;
const react_1 = __importDefault(require("react"));
const Button_1 = require("../Button");
const Popover_1 = require("../Popover");
const Tooltip_1 = require("../Tooltip");
const tokens_1 = require("@/theme/tokens");
const meta = {
    title: 'Design System/Overlays',
    component: Tooltip_1.Tooltip,
    parameters: { layout: 'centered' },
};
exports.default = meta;
exports.TooltipExample = {
    render: () => (<Tooltip_1.TooltipProvider delayDuration={150}>
      <Tooltip_1.Tooltip>
        <Tooltip_1.TooltipTrigger asChild>
          <Button_1.Button variant="secondary">Hover me</Button_1.Button>
        </Tooltip_1.TooltipTrigger>
        <Tooltip_1.TooltipContent side="top">Explains the control without clutter.</Tooltip_1.TooltipContent>
      </Tooltip_1.Tooltip>
    </Tooltip_1.TooltipProvider>),
};
exports.PopoverMenu = {
    render: () => (<Popover_1.Popover>
      <Popover_1.PopoverTrigger asChild>
        <Button_1.Button>Open quick actions</Button_1.Button>
      </Popover_1.PopoverTrigger>
      <Popover_1.PopoverContent style={{
            display: 'grid',
            gap: (0, tokens_1.tokenVar)('ds-space-xs'),
            width: '240px',
        }}>
        <p className="text-sm font-semibold">Investigate</p>
        <Button_1.Button variant="ghost" className="justify-start">
          Link entities
        </Button_1.Button>
        <Button_1.Button variant="ghost" className="justify-start">
          Add note
        </Button_1.Button>
        <Button_1.Button variant="ghost" className="justify-start">
          Share to workspace
        </Button_1.Button>
      </Popover_1.PopoverContent>
    </Popover_1.Popover>),
};
