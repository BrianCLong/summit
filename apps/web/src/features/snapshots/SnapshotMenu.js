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
exports.SnapshotMenu = SnapshotMenu;
const react_1 = __importStar(require("react"));
const store_1 = require("./store");
const SnapshotContext_1 = require("./SnapshotContext");
const DropdownMenu_1 = require("@/components/ui/DropdownMenu");
const Button_1 = require("@/components/ui/Button");
const input_1 = require("@/components/ui/input");
const lucide_react_1 = require("lucide-react");
const Dialog_1 = require("@/components/ui/Dialog");
function SnapshotMenu() {
    const { snapshots, addSnapshot, removeSnapshot, renameSnapshot } = (0, store_1.useSnapshotStore)();
    const { captureAll, restoreAll } = (0, SnapshotContext_1.useSnapshotContext)();
    const [isSaveDialogOpen, setIsSaveDialogOpen] = (0, react_1.useState)(false);
    const [newSnapshotName, setNewSnapshotName] = (0, react_1.useState)('');
    const handleSave = () => {
        const data = captureAll();
        // Check if we captured anything useful (optional validation)
        if (Object.keys(data).length === 0) {
            console.warn('Snapshot captured empty state.');
        }
        addSnapshot(newSnapshotName || `Snapshot ${new Date().toLocaleString()}`, data);
        setNewSnapshotName('');
        setIsSaveDialogOpen(false);
    };
    const handleRestore = (snapshot) => {
        restoreAll(snapshot.data);
    };
    return (<>
      <DropdownMenu_1.DropdownMenu>
        <DropdownMenu_1.DropdownMenuTrigger asChild>
          <Button_1.Button variant="ghost" size="sm" className="h-8 w-8 px-0">
            <lucide_react_1.Camera className="h-4 w-4"/>
            <span className="sr-only">Snapshots</span>
          </Button_1.Button>
        </DropdownMenu_1.DropdownMenuTrigger>
        <DropdownMenu_1.DropdownMenuContent align="end" className="w-56">
          <DropdownMenu_1.DropdownMenuLabel>Workspace Snapshots</DropdownMenu_1.DropdownMenuLabel>
          <DropdownMenu_1.DropdownMenuSeparator />
          <DropdownMenu_1.DropdownMenuItem onSelect={() => setIsSaveDialogOpen(true)}>
            <lucide_react_1.Save className="mr-2 h-4 w-4"/>
            <span>Save Current View...</span>
          </DropdownMenu_1.DropdownMenuItem>
          <DropdownMenu_1.DropdownMenuSeparator />
          {snapshots.length === 0 && (<div className="p-2 text-xs text-muted-foreground text-center">
              No saved snapshots
            </div>)}
          {snapshots.map((s) => (<div key={s.id} className="flex items-center justify-between px-2 py-1 hover:bg-accent rounded-sm group">
              <button className="flex-1 text-left text-sm truncate mr-2" onClick={() => handleRestore(s)}>
                {s.name}
              </button>
              <Button_1.Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={(e) => {
                e.stopPropagation();
                removeSnapshot(s.id);
            }}>
                <lucide_react_1.Trash2 className="h-3 w-3 text-destructive"/>
              </Button_1.Button>
            </div>))}
        </DropdownMenu_1.DropdownMenuContent>
      </DropdownMenu_1.DropdownMenu>

      <Dialog_1.Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <Dialog_1.DialogContent>
          <Dialog_1.DialogHeader>
            <Dialog_1.DialogTitle>Save Workspace Snapshot</Dialog_1.DialogTitle>
          </Dialog_1.DialogHeader>
          <div className="py-4">
            <input_1.Input placeholder="Snapshot Name (e.g. Investigation A)" value={newSnapshotName} onChange={(e) => setNewSnapshotName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} autoFocus/>
          </div>
          <Dialog_1.DialogFooter>
            <Button_1.Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button_1.Button>
            <Button_1.Button onClick={handleSave}>Save</Button_1.Button>
          </Dialog_1.DialogFooter>
        </Dialog_1.DialogContent>
      </Dialog_1.Dialog>
    </>);
}
