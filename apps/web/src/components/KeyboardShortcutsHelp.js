"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyboardShortcutsHelp = KeyboardShortcutsHelp;
const react_1 = __importDefault(require("react"));
const Dialog_1 = require("@/components/ui/Dialog");
const KeyboardShortcutsContext_1 = require("@/contexts/KeyboardShortcutsContext");
const Badge_1 = require("@/components/ui/Badge");
const lucide_react_1 = require("lucide-react");
function KeyboardShortcutsHelp() {
    const { isHelpOpen, closeHelp, shortcuts } = (0, KeyboardShortcutsContext_1.useKeyboardShortcuts)();
    const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) {
            acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
    }, {});
    // Sort categories
    const categories = Object.keys(groupedShortcuts).sort();
    return (<Dialog_1.Dialog open={isHelpOpen} onOpenChange={(open) => !open && closeHelp()}>
      <Dialog_1.DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <Dialog_1.DialogHeader>
          <Dialog_1.DialogTitle className="flex items-center gap-2 text-xl">
            <lucide_react_1.Command className="w-5 h-5"/>
            Keyboard Shortcuts
          </Dialog_1.DialogTitle>
        </Dialog_1.DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {categories.map((category) => (<div key={category} className="space-y-3">
              <h3 className="font-medium text-muted-foreground border-b pb-1">
                {category}
              </h3>
              <div className="space-y-2">
                {groupedShortcuts[category].map((shortcut) => (<div key={shortcut.id} className="flex items-center justify-between gap-4">
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((keyGroup, idx) => (<div key={idx} className="flex gap-1">
                          {idx > 0 && <span className="text-muted-foreground text-xs mx-1">or</span>}
                          {keyGroup.split('+').map((key) => (<Badge_1.Badge key={key} variant="secondary" className="font-mono text-xs px-1.5 min-w-[20px] justify-center capitalize">
                              {key === 'mod' ? '⌘' : key === 'shift' ? '⇧' : key}
                            </Badge_1.Badge>))}
                        </div>))}
                    </div>
                  </div>))}
              </div>
            </div>))}

          <div className="space-y-3">
            <h3 className="font-medium text-muted-foreground border-b pb-1">
              General
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm">Show this help</span>
                <Badge_1.Badge variant="secondary" className="font-mono text-xs px-1.5 min-w-[20px] justify-center">
                  ?
                </Badge_1.Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm">Command Palette</span>
                <div className="flex gap-1">
                  <Badge_1.Badge variant="secondary" className="font-mono text-xs px-1.5 min-w-[20px] justify-center">
                    ⌘
                  </Badge_1.Badge>
                  <Badge_1.Badge variant="secondary" className="font-mono text-xs px-1.5 min-w-[20px] justify-center">
                    K
                  </Badge_1.Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog_1.DialogContent>
    </Dialog_1.Dialog>);
}
