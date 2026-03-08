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
exports.WorkspaceSettingsDrawer = WorkspaceSettingsDrawer;
const react_1 = __importStar(require("react"));
const Drawer_1 = require("@/components/ui/Drawer");
const Button_1 = require("@/components/ui/Button");
const Badge_1 = require("@/components/ui/Badge");
const switch_1 = require("@/components/ui/switch");
const slider_1 = require("@/components/ui/slider");
const presets_1 = require("./presets");
const WorkspaceProvider_1 = require("./WorkspaceProvider");
function WorkspaceSettingsDrawer() {
    const { activeWorkspace, updatePanel, resetWorkspace, switchWorkspace, settingsOpen, setSettingsOpen, isEnabled, } = (0, WorkspaceProvider_1.useWorkspaceLayout)();
    const panelEntries = (0, react_1.useMemo)(() => {
        if (!activeWorkspace)
            return [];
        return presets_1.workspacePanelOrder
            .filter(panelKey => activeWorkspace.panels[panelKey])
            .map(panelKey => ({
            key: panelKey,
            config: activeWorkspace.panels[panelKey],
        }));
    }, [activeWorkspace]);
    if (!isEnabled || !activeWorkspace) {
        return null;
    }
    return (<Drawer_1.Drawer open={settingsOpen} onOpenChange={setSettingsOpen}>
      <Drawer_1.DrawerContent side="right" className="sm:max-w-lg">
        <Drawer_1.DrawerHeader className="space-y-2">
          <Drawer_1.DrawerTitle className="flex items-center justify-between">
            Workspace layout
            <Badge_1.Badge variant="secondary" className="text-[11px]">
              {activeWorkspace.label}
            </Badge_1.Badge>
          </Drawer_1.DrawerTitle>
          <div className="text-sm text-muted-foreground">
            Preset layouts are stored locally per user. Toggle visibility or
            resize panes without losing in-progress edits.
          </div>
        </Drawer_1.DrawerHeader>

        <div className="px-6 pb-6 space-y-6">
          <div className="space-y-4">
            {panelEntries.map(({ key, config }) => (<div key={key} className="flex items-center gap-4 justify-between border rounded-lg p-3" data-panel-config={key}>
                <div className="space-y-1">
                  <div className="font-medium capitalize">{key}</div>
                  <div className="text-xs text-muted-foreground">
                    {config.visible ? 'Visible' : 'Hidden'} · Weight {config.size}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Size</span>
                    <slider_1.Slider min={1} max={8} step={1} value={[config.size]} onValueChange={([value]) => updatePanel(key, { size: value })}/>
                  </div>
                </div>
                <switch_1.Switch checked={config.visible} aria-label={`Toggle ${key} panel`} onCheckedChange={checked => updatePanel(key, { visible: checked })}/>
              </div>))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button_1.Button variant="ghost" onClick={() => resetWorkspace()} data-testid="workspace-reset">
              Reset workspace
            </Button_1.Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Default route:
              </span>
              <Badge_1.Badge variant="outline">{activeWorkspace.defaultRoute}</Badge_1.Badge>
            </div>
            <Button_1.Button variant="outline" onClick={() => switchWorkspace(activeWorkspace.id, {
            applyRoute: true,
            useDefaultRoute: true,
        })}>
              Go
            </Button_1.Button>
          </div>
        </div>
      </Drawer_1.DrawerContent>
    </Drawer_1.Drawer>);
}
