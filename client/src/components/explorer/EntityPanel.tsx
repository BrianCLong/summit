/**
 * EntityPanel
 * Panel for displaying entity/edge details and enrichment data
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { GraphNode, GraphEdge, NODE_TYPE_COLORS } from './types';

interface EntityPanelProps {
  node: GraphNode | null;
  edge: GraphEdge | null;
  enrichment: {
    entityId: string;
    lastEnriched: string;
    externalSources: Array<{
      source: string;
      data: unknown;
      confidence: number;
      lastUpdated: string;
    }>;
    geolocation?: {
      country?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };
    reputation: {
      score: number;
      category: string;
      sources: string[];
    };
    relatedEntities: GraphNode[];
  } | null;
  onClose: () => void;
}

export function EntityPanel({
  node,
  edge,
  enrichment,
  onClose,
}: EntityPanelProps) {
  if (!node && !edge) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
        <h3 className="font-medium text-foreground mb-1">No Selection</h3>
        <p className="text-sm text-muted-foreground">
          Click on a node or edge in the graph to view its details
        </p>
      </div>
    );
  }

  if (edge) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">Relationship</h3>
            <p className="text-sm text-muted-foreground">{edge.label}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Type
            </label>
            <p className="mt-1">
              <Badge variant="outline">{edge.type}</Badge>
            </p>
          </div>

          {edge.confidence !== undefined && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Confidence
              </label>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${edge.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {Math.round(edge.confidence * 100)}%
                </span>
              </div>
            </div>
          )}

          <Separator />

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Source
            </label>
            <p className="mt-1 text-sm">{edge.source}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Target
            </label>
            <p className="mt-1 text-sm">{edge.target}</p>
          </div>

          {edge.properties && Object.keys(edge.properties).length > 0 && (
            <>
              <Separator />
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Properties
                </label>
                <div className="mt-2 space-y-2">
                  {Object.entries(edge.properties).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium">
                        {typeof value === 'object'
                          ? JSON.stringify(value)
                          : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              style={{
                backgroundColor:
                  NODE_TYPE_COLORS[node!.type] ?? NODE_TYPE_COLORS.DEFAULT,
              }}
            >
              {node!.type}
            </Badge>
            {node!.confidence !== undefined && (
              <span className="text-xs text-muted-foreground">
                {Math.round(node!.confidence * 100)}% confidence
              </span>
            )}
          </div>
          <h3 className="font-semibold text-lg truncate">{node!.label}</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="ml-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Description */}
        {node!.description && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Description
            </label>
            <p className="mt-1 text-sm">{node!.description}</p>
          </div>
        )}

        {/* Source */}
        {node!.source && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Source
            </label>
            <p className="mt-1 text-sm">{node!.source}</p>
          </div>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4">
          {node!.createdAt && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Created
              </label>
              <p className="mt-1 text-sm">
                {new Date(node!.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}
          {node!.updatedAt && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Updated
              </label>
              <p className="mt-1 text-sm">
                {new Date(node!.updatedAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Properties */}
        {node!.properties && Object.keys(node!.properties).length > 0 && (
          <>
            <Separator />
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Properties
              </label>
              <div className="mt-2 space-y-2">
                {Object.entries(node!.properties).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium truncate max-w-[150px]">
                      {typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Enrichment Data */}
        {enrichment && (
          <>
            <Separator />

            {/* Reputation */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Reputation Score
              </label>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      enrichment.reputation.score > 0.7
                        ? 'bg-green-500'
                        : enrichment.reputation.score > 0.4
                          ? 'bg-yellow-500'
                          : 'bg-red-500',
                    )}
                    style={{ width: `${enrichment.reputation.score * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {Math.round(enrichment.reputation.score * 100)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Category: {enrichment.reputation.category}
              </p>
            </div>

            {/* Geolocation */}
            {enrichment.geolocation && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Location
                </label>
                <p className="mt-1 text-sm">
                  {[enrichment.geolocation.city, enrichment.geolocation.country]
                    .filter(Boolean)
                    .join(', ') || 'Unknown'}
                </p>
                {enrichment.geolocation.latitude &&
                  enrichment.geolocation.longitude && (
                    <p className="text-xs text-muted-foreground">
                      {enrichment.geolocation.latitude.toFixed(4)},{' '}
                      {enrichment.geolocation.longitude.toFixed(4)}
                    </p>
                  )}
              </div>
            )}

            {/* External Sources */}
            {enrichment.externalSources.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  External Sources ({enrichment.externalSources.length})
                </label>
                <div className="mt-2 space-y-2">
                  {enrichment.externalSources.slice(0, 5).map((source, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                    >
                      <span>{source.source}</span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(source.confidence * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Entities */}
            {enrichment.relatedEntities.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Related Entities ({enrichment.relatedEntities.length})
                </label>
                <div className="mt-2 space-y-1">
                  {enrichment.relatedEntities.slice(0, 5).map((entity) => (
                    <div
                      key={entity.id}
                      className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted"
                    >
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor:
                            NODE_TYPE_COLORS[entity.type] ??
                            NODE_TYPE_COLORS.DEFAULT,
                        }}
                      >
                        {entity.type}
                      </Badge>
                      <span className="truncate">{entity.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Last enriched:{' '}
              {new Date(enrichment.lastEnriched).toLocaleString()}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
