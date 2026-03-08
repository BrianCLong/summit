"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextMenu = ContextMenu;
exports.ContextMenuTrigger = ContextMenuTrigger;
exports.ContextMenuContent = ContextMenuContent;
exports.ContextMenuItem = ContextMenuItem;
const react_1 = __importDefault(require("react"));
const utils_1 = require("@/lib/utils");
function ContextMenu({ children }) {
    return <>{children}</>;
}
function ContextMenuTrigger({ children }) {
    return <>{children}</>;
}
function ContextMenuContent({ children, className, }) {
    return (<div className={(0, utils_1.cn)('z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md', className)}>
      {children}
    </div>);
}
function ContextMenuItem({ children, className, onSelect, }) {
    return (<button type="button" onClick={onSelect} className={(0, utils_1.cn)('flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground', className)}>
      {children}
    </button>);
}
