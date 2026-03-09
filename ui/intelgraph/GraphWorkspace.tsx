import React from 'react';
import { Panel } from '../design-system/Panel';
import { SearchBar } from '../design-system/SearchBar';
import { Tabs } from '../design-system/Tabs';
import { Button } from '../design-system/Button';

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
}

export interface GraphWorkspaceProps {
  onEntitySelect?: (entityId: string) => void;
  onQueryExecute?: (query: string) => void;
}

export const GraphWorkspace: React.FC<GraphWorkspaceProps> = ({ onEntitySelect, onQueryExecute }) => {
  const [activeTab, setActiveTab] = React.useState('explore');
  const [query, setQuery] = React.useState('');
  const [cypherQuery, setCypherQuery] = React.useState('');

  const tabs = [
    { id: 'explore', label: 'Explore' },
    { id: 'query', label: 'Cypher Query' },
    { id: 'patterns', label: 'Patterns' },
    { id: 'communities', label: 'Communities' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="shrink-0 px-4 py-3 border-b border-border-default bg-bg-secondary">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-fg-primary">IntelGraph Workspace</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">Fit View</Button>
            <Button variant="ghost" size="sm">Export</Button>
            <Button variant="primary" size="sm">Add Entity</Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SearchBar value={query} onChange={setQuery} placeholder="Search entities, relationships..." size="sm" className="flex-1 max-w-md" />
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} variant="pill" size="sm" />
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph canvas */}
        <div className="flex-1 relative bg-bg-primary">
          {activeTab === 'query' ? (
            <div className="p-4">
              <Panel title="Cypher Query Editor" subtitle="Execute Neo4j queries directly">
                <div className="space-y-3">
                  <textarea
                    value={cypherQuery}
                    onChange={(e) => setCypherQuery(e.target.value)}
                    placeholder="MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 50"
                    className="w-full h-32 bg-bg-primary border border-border-default rounded-lg p-3 text-sm font-mono text-fg-primary placeholder-fg-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/40 resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => onQueryExecute?.(cypherQuery)}>Execute Query</Button>
                    <Button variant="ghost" size="sm">History</Button>
                    <Button variant="ghost" size="sm">Save</Button>
                  </div>
                </div>
              </Panel>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-fg-tertiary">
              {/* Graph visualization canvas — renders via d3/cytoscape when data is available */}
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-3 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a3 3 0 00-3 3v1H7a3 3 0 00-3 3v8a3 3 0 003 3h10a3 3 0 003-3V9a3 3 0 00-3-3h-2V5a3 3 0 00-3-3z" />
                </svg>
                <p className="text-sm">Search for entities or run a query to visualize the graph</p>
                <p className="text-xs mt-1 text-fg-muted">Powered by Neo4j + Cytoscape.js</p>
              </div>
            </div>
          )}
        </div>

        {/* Entity detail sidebar */}
        <aside className="w-80 shrink-0 border-l border-border-default bg-bg-secondary overflow-y-auto">
          <div className="p-4 space-y-4">
            <Panel title="Entity Details" subtitle="Select an entity to view details">
              <p className="text-xs text-fg-tertiary">Click a node in the graph to inspect its properties, relationships, and evidence.</p>
            </Panel>
            <Panel title="Relationships" collapsible defaultCollapsed>
              <p className="text-xs text-fg-tertiary">Inbound and outbound relationships will appear here.</p>
            </Panel>
            <Panel title="Evidence" collapsible defaultCollapsed>
              <p className="text-xs text-fg-tertiary">Supporting evidence and provenance chain.</p>
            </Panel>
          </div>
        </aside>
      </div>
    </div>
  );
};
