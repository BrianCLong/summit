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
exports.RelationshipMatrixWidget = RelationshipMatrixWidget;
const react_1 = __importStar(require("react"));
const utils_1 = require("@/lib/utils");
const Tooltip_1 = require("@/components/ui/Tooltip");
function RelationshipMatrixWidget({ entities, relationships, className, onCellClick, }) {
    // Memoize the matrix data structure
    const { matrix, sortedEntities } = (0, react_1.useMemo)(() => {
        // Sort entities by type and then name for better grouping
        const sorted = [...entities].sort((a, b) => {
            if (a.type !== b.type)
                return a.type.localeCompare(b.type);
            return a.name.localeCompare(b.name);
        });
        // Create a map for quick relationship lookup
        // Key: `${sourceId}-${targetId}`
        const relMap = new Map();
        relationships.forEach(rel => {
            const key = `${rel.sourceId}-${rel.targetId}`;
            const reverseKey = `${rel.targetId}-${rel.sourceId}`;
            // Store forward direction
            if (!relMap.has(key))
                relMap.set(key, []);
            relMap.get(key).push(rel);
            // Store reverse direction for undirected/bidirectional check or just to show connectivity in matrix
            // Usually matrix is Source (Row) -> Target (Col)
            // If we want a symmetric matrix for undirected graphs, we'd add it to both.
            // But let's stick to Source -> Target for directionality.
        });
        return { matrix: relMap, sortedEntities: sorted };
    }, [entities, relationships]);
    // Helper to get color intensity based on relationship count or confidence
    const getCellColor = (rels) => {
        if (!rels || rels.length === 0)
            return 'bg-transparent';
        // Simple logic: more relationships = darker color
        // Or use confidence. Let's use count for now.
        const count = rels.length;
        if (count >= 3)
            return 'bg-primary';
        if (count === 2)
            return 'bg-primary/70';
        return 'bg-primary/40';
    };
    return (<div className={(0, utils_1.cn)('overflow-auto h-full w-full', className)}>
      <div className="inline-block min-w-full">
        <div className="grid gap-px bg-muted" style={{
            gridTemplateColumns: `auto repeat(${sortedEntities.length}, minmax(40px, 1fr))`,
        }}>
          {/* Header Row */}
          <div className="sticky top-0 left-0 z-20 bg-background p-2 font-semibold text-xs border-b border-r">
            Matrix
          </div>
          {sortedEntities.map((entity) => (<div key={`col-${entity.id}`} className="sticky top-0 z-10 bg-background p-2 text-xs font-medium border-b rotate-180 [writing-mode:vertical-lr] h-32 flex items-center justify-start truncate" title={entity.name}>
              <span className="truncate">{entity.name}</span>
            </div>))}

          {/* Rows */}
          {sortedEntities.map((sourceEntity) => (<react_1.default.Fragment key={`row-${sourceEntity.id}`}>
              {/* Row Header */}
              <div className="sticky left-0 z-10 bg-background p-2 text-xs font-medium border-r truncate flex items-center w-32" title={sourceEntity.name}>
                <span className="truncate">{sourceEntity.name}</span>
              </div>

              {/* Cells */}
              {sortedEntities.map((targetEntity) => {
                const key = `${sourceEntity.id}-${targetEntity.id}`;
                const rels = matrix.get(key);
                const isSelf = sourceEntity.id === targetEntity.id;
                return (<div key={`cell-${sourceEntity.id}-${targetEntity.id}`} className={(0, utils_1.cn)('h-10 w-full flex items-center justify-center border border-muted/20 relative group transition-colors', isSelf ? 'bg-muted/30' : 'bg-background hover:bg-muted/50')} onClick={() => rels && onCellClick?.(sourceEntity, targetEntity, rels)}>
                    {rels && (<Tooltip_1.Tooltip>
                        <Tooltip_1.TooltipTrigger asChild>
                          <div className={(0, utils_1.cn)('w-6 h-6 rounded-sm cursor-pointer', getCellColor(rels))}/>
                        </Tooltip_1.TooltipTrigger>
                        <Tooltip_1.TooltipContent>
                          <div className="text-xs">
                            <p className="font-semibold">{sourceEntity.name} → {targetEntity.name}</p>
                            <p>{rels.length} relationship(s)</p>
                            <ul className="list-disc pl-3 mt-1 text-muted-foreground">
                              {rels.map(r => (<li key={r.id}>{r.type}</li>))}
                            </ul>
                          </div>
                        </Tooltip_1.TooltipContent>
                      </Tooltip_1.Tooltip>)}
                  </div>);
            })}
            </react_1.default.Fragment>))}
        </div>
      </div>
    </div>);
}
