"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomizableWidget = CustomizableWidget;
const react_1 = __importDefault(require("react"));
const utils_1 = require("@/lib/utils");
const lucide_react_1 = require("lucide-react");
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
function CustomizableWidget({ title, children, className, isExpanded, onToggleExpand, onClose, }) {
    return (<Card_1.Card className={(0, utils_1.cn)('flex flex-col h-full overflow-hidden transition-all', className, isExpanded && 'fixed inset-4 z-50 shadow-2xl h-auto')}>
      <Card_1.CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b bg-card shrink-0">
        <Card_1.CardTitle className="text-sm font-medium">{title}</Card_1.CardTitle>
        <div className="flex items-center gap-1">
          {onToggleExpand && (<Button_1.Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onToggleExpand} aria-label={isExpanded ? 'Minimize widget' : 'Maximize widget'}>
              {isExpanded ? <lucide_react_1.Minimize2 className="h-3 w-3"/> : <lucide_react_1.Maximize2 className="h-3 w-3"/>}
            </Button_1.Button>)}
          {onClose && (<Button_1.Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={onClose} aria-label="Close widget">
              <lucide_react_1.X className="h-3 w-3"/>
            </Button_1.Button>)}
        </div>
      </Card_1.CardHeader>
      <Card_1.CardContent className="flex-1 min-h-0 p-0 overflow-auto relative">
        {children}
      </Card_1.CardContent>
    </Card_1.Card>);
}
