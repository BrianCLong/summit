"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InspectorPanel = InspectorPanel;
const react_1 = __importDefault(require("react"));
const viewStore_1 = require("../store/viewStore");
const ScrollArea_1 = require("@/components/ui/ScrollArea");
const Badge_1 = require("@/components/ui/Badge");
function InspectorPanel({ entities }) {
    const { selectedEntityIds } = (0, viewStore_1.useWorkbenchStore)();
    const selectedEntities = entities.filter(e => selectedEntityIds.includes(e.id));
    if (selectedEntities.length === 0) {
        return (<div className="h-full flex items-center justify-center text-muted-foreground p-4 text-center">
        <p>Select an entity to view details</p>
      </div>);
    }
    if (selectedEntities.length > 1) {
        return (<div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold">{selectedEntities.length} items selected</h2>
        </div>
        <ScrollArea_1.ScrollArea className="flex-1 p-4">
           <div className="space-y-4">
             <div>
               <h3 className="text-sm font-medium mb-2">Summary</h3>
               <div className="flex flex-wrap gap-2">
                 {/* Count by type */}
                 {Object.entries(selectedEntities.reduce((acc, e) => {
                acc[e.type] = (acc[e.type] || 0) + 1;
                return acc;
            }, {})).map(([type, count]) => (<Badge_1.Badge key={type} variant="secondary">{type}: {count}</Badge_1.Badge>))}
               </div>
             </div>
           </div>
        </ScrollArea_1.ScrollArea>
      </div>);
    }
    const entity = selectedEntities[0];
    return (<div className="h-full flex flex-col">
      <div className="p-4 border-b bg-muted/20">
        <h2 className="font-semibold text-lg">{entity.name}</h2>
        <Badge_1.Badge className="mt-2">{entity.type}</Badge_1.Badge>
      </div>
      <ScrollArea_1.ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <Section title="Attributes">
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="grid grid-cols-3">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="col-span-2 font-mono text-xs">{entity.id}</dd>
              </div>
              <div className="grid grid-cols-3">
                <dt className="text-muted-foreground">Confidence</dt>
                <dd className="col-span-2">{(entity.confidence * 100).toFixed(0)}%</dd>
              </div>
              {/* Dynamic properties would go here */}
            </dl>
          </Section>

          <Section title="Notes">
             <div className="text-sm text-muted-foreground italic">
               No notes attached to this entity.
             </div>
          </Section>

          <Section title="Evidence">
             <div className="text-sm text-muted-foreground">
               Referenced in 3 reports.
             </div>
          </Section>
        </div>
      </ScrollArea_1.ScrollArea>
    </div>);
}
function Section({ title, children }) {
    return (<div>
      <h3 className="text-sm font-medium mb-3 uppercase text-muted-foreground tracking-wider">{title}</h3>
      {children}
    </div>);
}
