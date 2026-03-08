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
exports.CommandPalette = CommandPalette;
const react_1 = __importStar(require("react"));
const cmdk_1 = require("cmdk");
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const react_hotkeys_hook_1 = require("react-hotkeys-hook");
const AuthContext_1 = require("@/contexts/AuthContext");
const Kbd_1 = require("@/components/ui/Kbd");
function CommandPalette() {
    const [open, setOpen] = (0, react_1.useState)(false);
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { user } = (0, AuthContext_1.useAuth)();
    // Toggle the menu when ⌘K is pressed
    (0, react_hotkeys_hook_1.useHotkeys)(['meta+k', 'ctrl+k'], (e) => {
        e.preventDefault();
        setOpen((open) => !open);
    });
    const runCommand = react_1.default.useCallback((command) => {
        setOpen(false);
        command();
    }, []);
    return (<cmdk_1.Command.Dialog open={open} onOpenChange={setOpen} label="Global Command Menu" aria-label="Global Command Menu" className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-popover text-popover-foreground rounded-xl shadow-2xl border w-[640px] max-w-[90vw] overflow-hidden z-50 p-0">
      <div className="flex items-center border-b px-3">
        <lucide_react_1.Search className="mr-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true"/>
        <cmdk_1.Command.Input placeholder="Type a command or search..." aria-label="Type a command or search" className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0"/>
      </div>

      <cmdk_1.Command.List className="max-h-[300px] overflow-y-auto p-2" aria-label="Command results">
        <cmdk_1.Command.Empty className="py-6 text-center text-sm">No results found.</cmdk_1.Command.Empty>

        <cmdk_1.Command.Group heading="Navigation" className="text-xs font-medium text-muted-foreground px-2 py-1.5">
          <cmdk_1.Command.Item onSelect={() => runCommand(() => navigate('/'))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
            <lucide_react_1.LayoutDashboard className="mr-2 h-4 w-4" aria-hidden="true"/>
            <span>Home</span>
          </cmdk_1.Command.Item>

          <cmdk_1.Command.Item onSelect={() => runCommand(() => navigate('/explore'))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
            <lucide_react_1.Search className="mr-2 h-4 w-4" aria-hidden="true"/>
            <span>Explore</span>
          </cmdk_1.Command.Item>

          <cmdk_1.Command.Item onSelect={() => runCommand(() => navigate('/analysis/tri-pane'))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
            <lucide_react_1.Activity className="mr-2 h-4 w-4" aria-hidden="true"/>
            <span>Investigation (Tri-Pane)</span>
          </cmdk_1.Command.Item>

          <cmdk_1.Command.Item onSelect={() => runCommand(() => navigate('/cases'))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
            <lucide_react_1.FileText className="mr-2 h-4 w-4" aria-hidden="true"/>
            <span>Cases</span>
          </cmdk_1.Command.Item>

          <cmdk_1.Command.Item onSelect={() => runCommand(() => navigate('/alerts'))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
            <lucide_react_1.Shield className="mr-2 h-4 w-4" aria-hidden="true"/>
            <span>Alerts</span>
          </cmdk_1.Command.Item>
        </cmdk_1.Command.Group>

        <cmdk_1.Command.Group heading="Investigation" className="text-xs font-medium text-muted-foreground px-2 py-1.5">
           <cmdk_1.Command.Item onSelect={() => runCommand(() => navigate('/analysis/tri-pane'))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
            <lucide_react_1.Network className="mr-2 h-4 w-4" aria-hidden="true"/>
            <span>Open Graph View</span>
          </cmdk_1.Command.Item>
           <cmdk_1.Command.Item onSelect={() => runCommand(() => navigate('/analysis/tri-pane'))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
            <lucide_react_1.Map className="mr-2 h-4 w-4" aria-hidden="true"/>
            <span>Open Map View</span>
          </cmdk_1.Command.Item>
        </cmdk_1.Command.Group>

        <cmdk_1.Command.Group heading="System" className="text-xs font-medium text-muted-foreground px-2 py-1.5">
          <cmdk_1.Command.Item onSelect={() => runCommand(() => navigate('/help'))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
            <lucide_react_1.HelpCircle className="mr-2 h-4 w-4" aria-hidden="true"/>
            <span>Help</span>
          </cmdk_1.Command.Item>

          <cmdk_1.Command.Item onSelect={() => runCommand(() => navigate('/admin/settings'))} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground">
            <lucide_react_1.Settings className="mr-2 h-4 w-4" aria-hidden="true"/>
            <span>Settings</span>
          </cmdk_1.Command.Item>
        </cmdk_1.Command.Group>
      </cmdk_1.Command.List>

      <div className="border-t p-2 text-xs text-muted-foreground flex items-center justify-between px-4">
        <span>Use arrow keys to navigate</span>
        <div className="flex gap-1 items-center">
          <Kbd_1.Kbd>esc</Kbd_1.Kbd> to close
        </div>
      </div>
    </cmdk_1.Command.Dialog>);
}
