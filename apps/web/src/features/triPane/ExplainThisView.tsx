import React from 'react';
import { Sparkles, Info, Filter, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';
import type { TriPaneSyncState, TimeWindow } from './types';
import type { Entity, TimelineEvent, GeospatialEvent, Relationship } from '@/types';

interface ExplainThisViewProps {
  syncState: TriPaneSyncState;
  filteredData: {
    entities: Entity[];
    relationships: Relationship[];
    timelineEvents: TimelineEvent[];
    geospatialEvents: GeospatialEvent[];
  };
  className?: string;
  onClose?: () => void;
}

export function ExplainThisView({
  syncState,
  filteredData,
  className,
  onClose
}: ExplainThisViewProps) {
  const activeFilters = [];

  if (syncState.globalTimeWindow) {
    activeFilters.push({
      type: 'Time Window',
      value: `${syncState.globalTimeWindow.start.toLocaleDateString()} - ${syncState.globalTimeWindow.end.toLocaleDateString()}`
    });
  }

  if (syncState.graph.selectedEntityId) {
    activeFilters.push({
      type: 'Selected Entity',
      value: filteredData.entities.find(e => e.id === syncState.graph.selectedEntityId)?.name || syncState.graph.selectedEntityId
    });
  }

  if (syncState.map.selectedLocationId) {
     activeFilters.push({
      type: 'Selected Location',
      value: syncState.map.selectedLocationId
    });
  }

  // Identify top data sources
  const dataSources = React.useMemo(() => {
    const sources: Record<string, number> = {};
    filteredData.entities.forEach(e => {
        const source = (e as any).source || 'Unknown';
        sources[source] = (sources[source] || 0) + 1;
    });
    return Object.entries(sources)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));
  }, [filteredData.entities]);

  const querySummary = `Showing ${filteredData.entities.length} entities and ${filteredData.relationships.length} relationships` +
    (syncState.globalTimeWindow ? ` filtered between ${syncState.globalTimeWindow.start.toLocaleDateString()} and ${syncState.globalTimeWindow.end.toLocaleDateString()}` : ' across all time.');

  return (
    <Card className={className}>
      <CardHeader className="pb-2 border-b">
        <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-400">
            <Sparkles className="w-4 h-4" />
            Explain This View
            </CardTitle>
            {onClose && (
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                    <span className="sr-only">Close</span>
                    &times;
                </button>
            )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Active Filters Section */}
        <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Active Filters
            </h4>
            {activeFilters.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {activeFilters.map((filter, i) => (
                        <Badge key={i} variant="secondary" className="text-xs font-mono">
                            {filter.type}: {filter.value}
                        </Badge>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground italic">No active filters applied.</p>
            )}
        </div>

        {/* Query Summary Section */}
        <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" /> Query Summary
            </h4>
            <div className="bg-muted/50 p-2 rounded text-xs text-foreground font-medium border">
                {querySummary}
            </div>
        </div>

        {/* Data Sources Section */}
        <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                <Database className="w-3 h-3" /> Top Data Sources
            </h4>
            <div className="space-y-1">
                {dataSources.map((source, i) => (
                    <div key={i} className="flex justify-between text-xs">
                        <span className="text-foreground">{source.name}</span>
                        <span className="text-muted-foreground">{source.count} entities</span>
                    </div>
                ))}
                {dataSources.length === 0 && <p className="text-xs text-muted-foreground">No data sources available.</p>}
            </div>
        </div>

        {/* Provenance/Evidence Stub */}
         <div className="pt-2 border-t mt-2">
            <div className="flex items-center gap-2 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-xs text-indigo-300">Evidence Ledger Available</span>
                <button className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 underline">
                    View Sources
                </button>
            </div>
        </div>

      </CardContent>
    </Card>
  );
}
