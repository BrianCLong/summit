"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspacePill = WorkspacePill;
const react_1 = __importDefault(require("react"));
const DropdownMenu_1 = require("@/components/ui/DropdownMenu");
const Badge_1 = require("@/components/ui/Badge");
const Button_1 = require("@/components/ui/Button");
const WorkspaceProvider_1 = require("./WorkspaceProvider");
function WorkspacePill() {
    const { activeWorkspace, workspaces, switchWorkspace, setSettingsOpen, isEnabled, } = (0, WorkspaceProvider_1.useWorkspaceLayout)();
    if (!isEnabled || !activeWorkspace) {
        return null;
    }
    return (<DropdownMenu_1.DropdownMenu>
      <DropdownMenu_1.DropdownMenuTrigger asChild>
        <Button_1.Button variant="outline" size="sm" className="rounded-full gap-2" data-testid="workspace-pill" aria-label="Workspace switcher">
          <Badge_1.Badge variant="secondary" className="rounded-full">
            Workspace
          </Badge_1.Badge>
          <span className="text-sm font-medium">{activeWorkspace.label}</span>
        </Button_1.Button>
      </DropdownMenu_1.DropdownMenuTrigger>
      <DropdownMenu_1.DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenu_1.DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
          Modes
        </DropdownMenu_1.DropdownMenuLabel>
        {workspaces.map(workspace => (<DropdownMenu_1.DropdownMenuItem key={workspace.id} className="flex-col items-start gap-0.5 py-2" data-workspace-option={workspace.id} onSelect={() => switchWorkspace(workspace.id)}>
            <div className="flex w-full items-center justify-between">
              <span className="font-medium text-sm">{workspace.label}</span>
              {workspace.id === activeWorkspace.id && (<Badge_1.Badge variant="outline" className="text-[10px]">
                  Active
                </Badge_1.Badge>)}
            </div>
            <div className="text-xs text-muted-foreground">
              {workspace.description}
            </div>
          </DropdownMenu_1.DropdownMenuItem>))}
        <DropdownMenu_1.DropdownMenuSeparator />
        <DropdownMenu_1.DropdownMenuItem onSelect={() => setSettingsOpen(true)} className="justify-between" data-testid="workspace-settings-entry">
          Settings
          <Badge_1.Badge variant="secondary" className="text-[10px]">
            Layout
          </Badge_1.Badge>
        </DropdownMenu_1.DropdownMenuItem>
      </DropdownMenu_1.DropdownMenuContent>
    </DropdownMenu_1.DropdownMenu>);
}
