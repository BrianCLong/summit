"use strict";
/**
 * Explain This View Panel
 *
 * An intelligent summary panel that explains the current state of the
 * analyst console in human-readable text. Updates dynamically as the
 * view state changes.
 */
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
exports.ExplainThisViewPanel = ExplainThisViewPanel;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const Button_1 = require("@/components/ui/Button");
const AnalystViewContext_1 = require("./AnalystViewContext");
/**
 * Build a human-readable explanation of the current view
 */
function buildViewExplanation(params) {
    const { timeWindow, visibleEntities, visibleLinks, visibleEventCount, visibleLocationCount, selection, filters, } = params;
    // Calculate metrics
    const entityTypeDistribution = {};
    visibleEntities.forEach(e => {
        entityTypeDistribution[e.type] = (entityTypeDistribution[e.type] || 0) + 1;
    });
    // Find top entities by connections (degree centrality)
    const connectionCounts = new Map();
    visibleLinks.forEach(link => {
        connectionCounts.set(link.sourceId, (connectionCounts.get(link.sourceId) || 0) + 1);
        connectionCounts.set(link.targetId, (connectionCounts.get(link.targetId) || 0) + 1);
    });
    const topEntities = visibleEntities
        .map(entity => ({
        entity,
        connectionCount: connectionCounts.get(entity.id) || 0,
    }))
        .sort((a, b) => {
        // Sort by importance score first, then by connections
        const aScore = a.entity.importanceScore || 0;
        const bScore = b.entity.importanceScore || 0;
        if (bScore !== aScore)
            return bScore - aScore;
        return b.connectionCount - a.connectionCount;
    })
        .slice(0, 5);
    const metrics = {
        visibleEntityCount: visibleEntities.length,
        visibleLinkCount: visibleLinks.length,
        visibleEventCount,
        visibleLocationCount,
        topEntities,
        entityTypeDistribution,
        eventTypeDistribution: {}, // Could be populated from events
    };
    // Build headline
    const fromDate = new Date(timeWindow.startMs);
    const toDate = new Date(timeWindow.endMs);
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    let headline = `Viewing ${visibleEntities.length} entities and ${visibleLinks.length} relationships`;
    if (daysDiff <= 1) {
        headline += ` from the past day`;
    }
    else if (daysDiff <= 7) {
        headline += ` from the past ${daysDiff} days`;
    }
    else if (daysDiff <= 30) {
        headline += ` from the past ${Math.ceil(daysDiff / 7)} weeks`;
    }
    else {
        headline += ` from ${fromDate.toLocaleDateString()} to ${toDate.toLocaleDateString()}`;
    }
    // Add selection context to headline
    if (selection.selectedEntityIds.length > 0) {
        const selectedEntity = visibleEntities.find(e => e.id === selection.selectedEntityIds[0]);
        if (selectedEntity) {
            headline += `. Currently focused on "${selectedEntity.label}"`;
        }
    }
    // Build detail bullets
    const detailBullets = [];
    // Visible counts
    detailBullets.push(`Visible: ${visibleEntities.length} entities, ${visibleLinks.length} links, ${visibleEventCount} events, ${visibleLocationCount} locations`);
    // Top entities
    if (topEntities.length > 0) {
        const topNames = topEntities
            .slice(0, 3)
            .map(t => t.entity.label)
            .join(', ');
        detailBullets.push(`Top entities by importance: ${topNames}`);
    }
    // Entity type breakdown
    const typeEntries = Object.entries(entityTypeDistribution);
    if (typeEntries.length > 0) {
        const typeBreakdown = typeEntries
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([type, count]) => `${count} ${type}`)
            .join(', ');
        detailBullets.push(`Entity types: ${typeBreakdown}`);
    }
    // Active filters
    if (filters.entityTypes && filters.entityTypes.length > 0) {
        detailBullets.push(`Filtering by entity types: ${filters.entityTypes.join(', ')}`);
    }
    if (filters.minConfidence !== undefined) {
        detailBullets.push(`Minimum confidence threshold: ${Math.round(filters.minConfidence * 100)}%`);
    }
    // Selection info
    if (selection.selectedEntityIds.length > 0) {
        detailBullets.push(`Currently selected: ${selection.selectedEntityIds.length} entities`);
    }
    return {
        headline,
        detailBullets,
        metrics,
    };
}
/**
 * ExplainThisViewPanel component
 */
function ExplainThisViewPanel({ entities, links, events, locations, className, }) {
    const { state, resetSelection, resetFilters } = (0, AnalystViewContext_1.useAnalystView)();
    const [isCollapsed, setIsCollapsed] = (0, react_1.useState)(false);
    const [expandedSections, setExpandedSections] = (0, react_1.useState)(new Set(['summary', 'metrics', 'top-entities']));
    // Filter data based on current view state
    const filteredData = (0, react_1.useMemo)(() => {
        const fromTime = state.timeWindow.startMs;
        const toTime = state.timeWindow.endMs;
        // Filter entities
        let visibleEntities = entities.filter(entity => {
            // Filter by entity types if specified
            if (state.filters.entityTypes &&
                state.filters.entityTypes.length > 0 &&
                !state.filters.entityTypes.includes(entity.type)) {
                return false;
            }
            // Filter by confidence if specified
            if (state.filters.minConfidence !== undefined &&
                (entity.confidence ?? 1) < state.filters.minConfidence) {
                return false;
            }
            return true;
        });
        // Filter events by time window
        const visibleEvents = events.filter(event => {
            const eventTime = new Date(event.timestamp).getTime();
            if (eventTime < fromTime || eventTime > toTime)
                return false;
            if (state.filters.eventTypes &&
                state.filters.eventTypes.length > 0 &&
                !state.filters.eventTypes.includes(event.type)) {
                return false;
            }
            return true;
        });
        // Filter links to only include those between visible entities
        const visibleEntityIds = new Set(visibleEntities.map(e => e.id));
        const visibleLinks = links.filter(link => visibleEntityIds.has(link.sourceId) && visibleEntityIds.has(link.targetId));
        // Filter locations by time window
        const visibleLocations = locations.filter(loc => {
            if (loc.firstSeenAt && loc.lastSeenAt) {
                const firstSeen = new Date(loc.firstSeenAt).getTime();
                const lastSeen = new Date(loc.lastSeenAt).getTime();
                return firstSeen <= toTime && lastSeen >= fromTime;
            }
            return true;
        });
        return {
            entities: visibleEntities,
            links: visibleLinks,
            events: visibleEvents,
            locations: visibleLocations,
        };
    }, [entities, links, events, locations, state]);
    // Build explanation
    const explanation = (0, react_1.useMemo)(() => {
        return buildViewExplanation({
            timeWindow: state.timeWindow,
            visibleEntities: filteredData.entities,
            visibleLinks: filteredData.links,
            visibleEventCount: filteredData.events.length,
            visibleLocationCount: filteredData.locations.length,
            selection: state.selection,
            filters: state.filters,
        });
    }, [filteredData, state]);
    const toggleSection = (section) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) {
                next.delete(section);
            }
            else {
                next.add(section);
            }
            return next;
        });
    };
    if (isCollapsed) {
        return (<Button_1.Button variant="secondary" size="sm" onClick={() => setIsCollapsed(false)} className={(0, utils_1.cn)('flex items-center gap-2', className)} aria-label="Expand Explain This View panel">
        <lucide_react_1.Lightbulb className="h-4 w-4"/>
        Explain This View
      </Button_1.Button>);
    }
    return (<div className={(0, utils_1.cn)('flex flex-col h-full bg-slate-900 border-l border-slate-800 overflow-hidden', className)} role="complementary" aria-label="Explain This View panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-200">
          <lucide_react_1.Lightbulb className="h-4 w-4 text-yellow-400"/>
          Explain This View
        </h2>
        <Button_1.Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsCollapsed(true)} aria-label="Collapse panel">
          <lucide_react_1.X className="h-4 w-4"/>
        </Button_1.Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Headline Summary */}
        <Card_1.Card className="bg-slate-800/50 border-slate-700">
          <Card_1.CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection('summary')}>
            <Card_1.CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <lucide_react_1.Info className="h-4 w-4"/>
                Summary
              </span>
              {expandedSections.has('summary') ? (<lucide_react_1.ChevronUp className="h-4 w-4"/>) : (<lucide_react_1.ChevronDown className="h-4 w-4"/>)}
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          {expandedSections.has('summary') && (<Card_1.CardContent className="pt-0">
              <p className="text-sm text-slate-300 leading-relaxed">
                {explanation.headline}
              </p>
              <ul className="mt-3 space-y-1">
                {explanation.detailBullets.map((bullet, i) => (<li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                    <span className="text-slate-500 mt-0.5">•</span>
                    <span>{bullet}</span>
                  </li>))}
              </ul>
            </Card_1.CardContent>)}
        </Card_1.Card>

        {/* Metrics Overview */}
        <Card_1.Card className="bg-slate-800/50 border-slate-700">
          <Card_1.CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection('metrics')}>
            <Card_1.CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <lucide_react_1.BarChart3 className="h-4 w-4"/>
                View Metrics
              </span>
              {expandedSections.has('metrics') ? (<lucide_react_1.ChevronUp className="h-4 w-4"/>) : (<lucide_react_1.ChevronDown className="h-4 w-4"/>)}
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          {expandedSections.has('metrics') && (<Card_1.CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <lucide_react_1.Network className="h-5 w-5 mx-auto text-blue-400 mb-1"/>
                  <div className="text-lg font-bold text-slate-200">
                    {explanation.metrics.visibleEntityCount}
                  </div>
                  <div className="text-xs text-slate-500">Entities</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <lucide_react_1.Link2 className="h-5 w-5 mx-auto text-purple-400 mb-1"/>
                  <div className="text-lg font-bold text-slate-200">
                    {explanation.metrics.visibleLinkCount}
                  </div>
                  <div className="text-xs text-slate-500">Links</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <lucide_react_1.Clock className="h-5 w-5 mx-auto text-green-400 mb-1"/>
                  <div className="text-lg font-bold text-slate-200">
                    {explanation.metrics.visibleEventCount}
                  </div>
                  <div className="text-xs text-slate-500">Events</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <lucide_react_1.MapPin className="h-5 w-5 mx-auto text-orange-400 mb-1"/>
                  <div className="text-lg font-bold text-slate-200">
                    {explanation.metrics.visibleLocationCount}
                  </div>
                  <div className="text-xs text-slate-500">Locations</div>
                </div>
              </div>
            </Card_1.CardContent>)}
        </Card_1.Card>

        {/* Top Entities */}
        <Card_1.Card className="bg-slate-800/50 border-slate-700">
          <Card_1.CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection('top-entities')}>
            <Card_1.CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <lucide_react_1.TrendingUp className="h-4 w-4"/>
                Top Entities
              </span>
              {expandedSections.has('top-entities') ? (<lucide_react_1.ChevronUp className="h-4 w-4"/>) : (<lucide_react_1.ChevronDown className="h-4 w-4"/>)}
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          {expandedSections.has('top-entities') && (<Card_1.CardContent className="pt-0 space-y-2">
              {explanation.metrics.topEntities.length === 0 ? (<p className="text-xs text-slate-500 italic">
                  No entities in current view
                </p>) : (explanation.metrics.topEntities.map(({ entity, connectionCount }) => (<div key={entity.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 hover:bg-slate-900/70 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">
                        {entity.label}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge_1.Badge variant="outline" className="text-xs">
                          {entity.type}
                        </Badge_1.Badge>
                        <span className="text-xs text-slate-500">
                          {connectionCount} connections
                        </span>
                      </div>
                    </div>
                    {entity.importanceScore && (<div className="text-xs text-slate-400">
                        Score: {Math.round(entity.importanceScore * 100)}
                      </div>)}
                  </div>)))}
            </Card_1.CardContent>)}
        </Card_1.Card>

        {/* Entity Type Distribution */}
        <Card_1.Card className="bg-slate-800/50 border-slate-700">
          <Card_1.CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection('distribution')}>
            <Card_1.CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <lucide_react_1.Users className="h-4 w-4"/>
                Entity Distribution
              </span>
              {expandedSections.has('distribution') ? (<lucide_react_1.ChevronUp className="h-4 w-4"/>) : (<lucide_react_1.ChevronDown className="h-4 w-4"/>)}
            </Card_1.CardTitle>
          </Card_1.CardHeader>
          {expandedSections.has('distribution') && (<Card_1.CardContent className="pt-0 space-y-2">
              {Object.entries(explanation.metrics.entityTypeDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => {
                const percentage = (count / explanation.metrics.visibleEntityCount) * 100;
                return (<div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{type}</span>
                        <span className="text-slate-500">
                          {count} ({Math.round(percentage)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${percentage}%` }}/>
                      </div>
                    </div>);
            })}
            </Card_1.CardContent>)}
        </Card_1.Card>

        {/* Active Filters */}
        {(state.filters.entityTypes?.length ||
            state.filters.eventTypes?.length ||
            state.filters.minConfidence !== undefined) && (<Card_1.Card className="bg-slate-800/50 border-slate-700">
            <Card_1.CardHeader className="pb-2">
              <Card_1.CardTitle className="text-sm flex items-center gap-2">
                <lucide_react_1.Filter className="h-4 w-4"/>
                Active Filters
              </Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent className="pt-0 space-y-2">
              {state.filters.entityTypes?.length ? (<div>
                  <div className="text-xs text-slate-500 mb-1">Entity Types</div>
                  <div className="flex flex-wrap gap-1">
                    {state.filters.entityTypes.map(type => (<Badge_1.Badge key={type} variant="secondary" className="text-xs">
                        {type}
                      </Badge_1.Badge>))}
                  </div>
                </div>) : null}

              {state.filters.minConfidence !== undefined && (<div>
                  <div className="text-xs text-slate-500 mb-1">
                    Min Confidence
                  </div>
                  <Badge_1.Badge variant="secondary" className="text-xs">
                    ≥ {Math.round(state.filters.minConfidence * 100)}%
                  </Badge_1.Badge>
                </div>)}

              <Button_1.Button variant="outline" size="sm" className="w-full mt-2 text-xs" onClick={resetFilters}>
                Clear All Filters
              </Button_1.Button>
            </Card_1.CardContent>
          </Card_1.Card>)}

        {/* Selection State */}
        {(state.selection.selectedEntityIds.length > 0 ||
            state.selection.selectedEventIds.length > 0 ||
            state.selection.selectedLocationIds.length > 0) && (<Card_1.Card className="bg-yellow-900/20 border-yellow-700/50">
            <Card_1.CardHeader className="pb-2">
              <Card_1.CardTitle className="text-sm flex items-center gap-2 text-yellow-400">
                <lucide_react_1.TrendingUp className="h-4 w-4"/>
                Current Selection
              </Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent className="pt-0 space-y-2">
              {state.selection.selectedEntityIds.length > 0 && (<div className="text-xs text-slate-300">
                  {state.selection.selectedEntityIds.length} entities selected
                </div>)}
              {state.selection.selectedEventIds.length > 0 && (<div className="text-xs text-slate-300">
                  {state.selection.selectedEventIds.length} events selected
                </div>)}
              {state.selection.selectedLocationIds.length > 0 && (<div className="text-xs text-slate-300">
                  {state.selection.selectedLocationIds.length} locations selected
                </div>)}
              <Button_1.Button variant="outline" size="sm" className="w-full mt-2 text-xs" onClick={resetSelection}>
                Clear Selection
              </Button_1.Button>
            </Card_1.CardContent>
          </Card_1.Card>)}

        {/* Help text */}
        <div className="text-xs text-slate-500 italic p-3 bg-slate-800/30 rounded-lg">
          <div className="flex items-start gap-2">
            <lucide_react_1.Info className="h-4 w-4 mt-0.5 flex-shrink-0"/>
            <p>
              This panel summarizes what you're currently seeing. Select entities
              in the graph, adjust the time brush in the timeline, or click
              locations on the map to update this summary.
            </p>
          </div>
        </div>
      </div>
    </div>);
}
