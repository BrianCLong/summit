"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborationPanel = CollaborationPanel;
const react_1 = __importDefault(require("react"));
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const lucide_react_1 = require("lucide-react");
function CollaborationPanel({ users, isConnected, isSynced }) {
    return (<Card_1.Card className="fixed bottom-4 left-4 w-64 shadow-lg z-50">
      <Card_1.CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <Card_1.CardTitle className="text-sm font-medium flex items-center gap-2">
          <lucide_react_1.Users className="h-4 w-4"/>
          Collaborators
        </Card_1.CardTitle>
        <div className="flex items-center gap-2">
           <Badge_1.Badge variant={isConnected ? "default" : "destructive"} className="text-[10px] px-1 h-5">
             {isConnected ? 'Online' : 'Offline'}
           </Badge_1.Badge>
        </div>
      </Card_1.CardHeader>
      <Card_1.CardContent className="py-2 px-4 max-h-40 overflow-y-auto">
        {users.length === 0 ? (<p className="text-xs text-muted-foreground">No other users active</p>) : (<div className="space-y-2">
            {users.map((user, idx) => (<div key={`${user.id}-${idx}`} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: user.color }}/>
                <span className="truncate">{user.name}</span>
                {user.selection && user.selection.length > 0 && (<span className="text-xs text-muted-foreground ml-auto">
                        Editing {user.selection.length} items
                    </span>)}
              </div>))}
          </div>)}
        <div className="mt-2 text-[10px] text-muted-foreground border-t pt-1">
            Status: {isSynced ? 'Synced' : 'Syncing...'}
        </div>
      </Card_1.CardContent>
    </Card_1.Card>);
}
