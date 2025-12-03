/**
 * TraversalPanel
 * Panel for managing and displaying graph traversal paths
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TraversalStep, NODE_TYPE_COLORS } from './types';

interface TraversalPanelProps {
  path: TraversalStep[];
  onClear: () => void;
  onStepClick: (step: TraversalStep) => void;
}

export function TraversalPanel({ path, onClear, onStepClick }: TraversalPanelProps) {
  if (path.length === 0) {
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
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h3 className="font-medium text-foreground mb-1">No Traversal Path</h3>
        <p className="text-sm text-muted-foreground">
          Double-click on nodes or drag between nodes to create a traversal path
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">Traversal Path</h3>
          <p className="text-sm text-muted-foreground">
            {path.length} {path.length === 1 ? 'step' : 'steps'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>

      {/* Path visualization */}
      <div className="flex-1 overflow-auto p-4">
        <div className="relative">
          {path.map((step, index) => (
            <div key={`${step.nodeId}-${index}`} className="relative">
              {/* Connector line */}
              {index > 0 && (
                <div className="absolute left-5 -top-4 w-0.5 h-4 bg-border" />
              )}

              {/* Step card */}
              <div
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  'hover:bg-muted/50',
                )}
                onClick={() => onStepClick(step)}
              >
                {/* Step number */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                  style={{
                    backgroundColor:
                      NODE_TYPE_COLORS[step.nodeType] ?? NODE_TYPE_COLORS.DEFAULT,
                  }}
                >
                  {index + 1}
                </div>

                {/* Step details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{step.nodeLabel}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {step.nodeType}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Depth: {step.depth}</span>
                    {step.edgeType && (
                      <>
                        <span>•</span>
                        <span>via {step.edgeType}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="capitalize">{step.direction}</span>
                  </div>
                </div>

                {/* Direction indicator */}
                <div className="shrink-0">
                  {step.direction === 'incoming' && (
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
                      className="text-muted-foreground"
                    >
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                  )}
                  {step.direction === 'outgoing' && (
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
                      className="text-muted-foreground"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  )}
                  {step.direction === 'both' && (
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
                      className="text-muted-foreground"
                    >
                      <polyline points="17 1 21 5 17 9" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Connector to next */}
              {index < path.length - 1 && (
                <div className="flex justify-center py-2">
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
                    className="text-muted-foreground"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Path actions */}
        <Separator className="my-4" />

        <div className="space-y-2">
          <Button variant="outline" className="w-full" size="sm">
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
              className="mr-2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Path
          </Button>

          <Button variant="outline" className="w-full" size="sm">
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
              className="mr-2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Expand All
          </Button>

          <Button variant="outline" className="w-full" size="sm">
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
              className="mr-2"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
            Analyze Path
          </Button>
        </div>
      </div>
    </div>
  );
}
