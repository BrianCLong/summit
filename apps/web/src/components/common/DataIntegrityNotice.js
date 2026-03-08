"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataIntegrityNotice = DataIntegrityNotice;
const react_1 = __importDefault(require("react"));
const Alert_1 = require("@/components/ui/Alert");
const Badge_1 = require("@/components/ui/Badge");
const copy = {
    demo: {
        title: 'Demo data in use',
        description: 'This view is populated with synthetic records for demonstration. Do not treat values as live operational data.',
        badge: 'DEMO',
    },
    unavailable: {
        title: 'Live data not connected',
        description: 'This view requires a configured backend connection. Connect the production data source to populate live records.',
        badge: 'DISCONNECTED',
    },
};
function DataIntegrityNotice({ mode, context, }) {
    const content = copy[mode];
    return (<Alert_1.Alert variant="warning" className="flex items-start justify-between gap-4">
      <div>
        <Alert_1.AlertTitle className="flex items-center gap-2">
          {content.title}
          {context ? (<span className="text-xs font-normal text-muted-foreground">
              {context}
            </span>) : null}
        </Alert_1.AlertTitle>
        <Alert_1.AlertDescription>{content.description}</Alert_1.AlertDescription>
      </div>
      <Badge_1.Badge variant={mode === 'demo' ? 'warning' : 'secondary'}>
        {content.badge}
      </Badge_1.Badge>
    </Alert_1.Alert>);
}
exports.default = DataIntegrityNotice;
