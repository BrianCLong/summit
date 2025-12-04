/**
 * RAGPreviewPanel
 * Panel for displaying RAG (Retrieval-Augmented Generation) previews
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraphNode, RAGPreview, RAGSource, NODE_TYPE_COLORS } from './types';

interface RAGPreviewPanelProps {
  node: GraphNode | null;
  enrichment: {
    entityId: string;
    relatedEntities: GraphNode[];
    externalSources: Array<{
      source: string;
      data: unknown;
      confidence: number;
    }>;
  } | null;
}

export function RAGPreviewPanel({ node, enrichment }: RAGPreviewPanelProps) {
  const [ragData, setRagData] = useState<RAGPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  // Simulate RAG data generation based on node and enrichment
  useEffect(() => {
    if (!node) {
      setRagData(null);
      return;
    }

    setLoading(true);

    // Simulate async RAG retrieval
    const timer = setTimeout(() => {
      const mockRagData: RAGPreview = {
        nodeId: node.id,
        summary: generateSummary(node),
        context: generateContext(node, enrichment),
        relatedConcepts: generateRelatedConcepts(node),
        confidence: 0.85 + Math.random() * 0.1,
        sources: generateSources(node, enrichment),
      };
      setRagData(mockRagData);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [node?.id, enrichment]);

  if (!node) {
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
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h3 className="font-medium text-foreground mb-1">RAG Preview</h3>
        <p className="text-sm text-muted-foreground">
          Select an entity to view AI-generated insights and related context
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">
          Generating RAG preview...
        </p>
      </div>
    );
  }

  if (!ragData) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Badge
            style={{
              backgroundColor:
                NODE_TYPE_COLORS[node.type] ?? NODE_TYPE_COLORS.DEFAULT,
            }}
          >
            {node.type}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            RAG
          </Badge>
        </div>
        <h3 className="font-semibold">{node.label}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Confidence: {Math.round(ragData.confidence * 100)}%
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start px-4 border-b rounded-none h-auto py-0">
          <TabsTrigger value="summary" className="py-2">
            Summary
          </TabsTrigger>
          <TabsTrigger value="context" className="py-2">
            Context
          </TabsTrigger>
          <TabsTrigger value="sources" className="py-2">
            Sources
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="summary" className="p-4 m-0 space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">AI Summary</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {ragData.summary}
              </p>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium mb-2">Related Concepts</h4>
              <div className="flex flex-wrap gap-1">
                {ragData.relatedConcepts.map((concept, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {concept}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="context" className="p-4 m-0 space-y-3">
            <h4 className="text-sm font-medium">Contextual Information</h4>
            {ragData.context.map((ctx, i) => (
              <div
                key={i}
                className="p-3 bg-muted/50 rounded-lg text-sm leading-relaxed"
              >
                {ctx}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="sources" className="p-4 m-0 space-y-3">
            <h4 className="text-sm font-medium">
              Sources ({ragData.sources.length})
            </h4>
            {ragData.sources.map((source) => (
              <div
                key={source.id}
                className="p-3 border rounded-lg space-y-2"
              >
                <div className="flex items-start justify-between">
                  <h5 className="font-medium text-sm">{source.title}</h5>
                  <Badge variant="outline" className="text-xs shrink-0 ml-2">
                    {Math.round(source.relevance * 100)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {source.snippet}
                </p>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View source
                  </a>
                )}
              </div>
            ))}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// Helper functions for generating mock RAG data
function generateSummary(node: GraphNode): string {
  const templates: Record<string, string> = {
    PERSON: `${node.label} is an individual identified in this investigation. Based on the available intelligence, this entity has multiple connections within the network and may be associated with key activities.`,
    ORGANIZATION: `${node.label} is an organization of interest. Analysis indicates potential involvement in activities related to this investigation, with connections to multiple entities in the graph.`,
    LOCATION: `${node.label} is a geographic location of significance. This location has been identified as a point of interest based on entity activities and relationship patterns.`,
    DOCUMENT: `${node.label} is a document or artifact relevant to this investigation. Content analysis suggests connections to multiple entities and events.`,
    EVENT: `${node.label} represents a significant event in the investigation timeline. Multiple entities are connected to this event.`,
    DEFAULT: `${node.label} is an entity of type ${node.type} identified in this investigation. Further analysis may reveal additional connections and significance.`,
  };
  return templates[node.type] ?? templates.DEFAULT;
}

function generateContext(
  node: GraphNode,
  enrichment: RAGPreviewPanelProps['enrichment'],
): string[] {
  const contexts: string[] = [
    `Entity "${node.label}" was first identified on ${node.createdAt ? new Date(node.createdAt).toLocaleDateString() : 'an unknown date'}.`,
  ];

  if (node.description) {
    contexts.push(node.description);
  }

  if (enrichment?.relatedEntities.length) {
    contexts.push(
      `This entity is directly connected to ${enrichment.relatedEntities.length} other entities in the knowledge graph.`,
    );
  }

  if (node.confidence) {
    contexts.push(
      `The confidence score of ${Math.round(node.confidence * 100)}% indicates ${node.confidence > 0.7 ? 'high' : node.confidence > 0.4 ? 'moderate' : 'low'} reliability of the source data.`,
    );
  }

  return contexts;
}

function generateRelatedConcepts(node: GraphNode): string[] {
  const baseConcepts: Record<string, string[]> = {
    PERSON: ['Identity', 'Network Analysis', 'Behavioral Pattern', 'Communications'],
    ORGANIZATION: ['Corporate Structure', 'Operations', 'Financial Activity', 'Partnerships'],
    LOCATION: ['Geography', 'Jurisdiction', 'Activity Zone', 'Movement Pattern'],
    DOCUMENT: ['Evidence', 'Classification', 'Chain of Custody', 'Content Analysis'],
    EVENT: ['Timeline', 'Incident', 'Causation', 'Impact Assessment'],
    THREAT: ['Risk Assessment', 'Attack Vector', 'Mitigation', 'Indicators'],
    INDICATOR: ['Detection', 'Signature', 'IOC', 'Threat Intel'],
    DEFAULT: ['Entity Analysis', 'Relationship Mapping', 'Intelligence'],
  };

  return baseConcepts[node.type] ?? baseConcepts.DEFAULT;
}

function generateSources(
  node: GraphNode,
  enrichment: RAGPreviewPanelProps['enrichment'],
): RAGSource[] {
  const sources: RAGSource[] = [];

  // Add external sources from enrichment
  if (enrichment?.externalSources) {
    enrichment.externalSources.slice(0, 3).forEach((src, i) => {
      sources.push({
        id: `ext-${i}`,
        title: `${src.source} Intelligence Report`,
        snippet: `Data retrieved from ${src.source} with ${Math.round(src.confidence * 100)}% confidence. Contains relevant information about ${node.label}.`,
        relevance: src.confidence,
      });
    });
  }

  // Add mock internal sources
  sources.push({
    id: 'internal-1',
    title: 'Investigation Notes',
    snippet: `Internal notes and observations regarding ${node.label} collected during the investigation process.`,
    relevance: 0.9,
  });

  if (node.source) {
    sources.push({
      id: 'origin-1',
      title: `Original Source: ${node.source}`,
      snippet: `Primary source data that first identified ${node.label} as an entity of interest.`,
      relevance: 0.95,
    });
  }

  return sources;
}
