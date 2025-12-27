import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { useQuery, gql } from '@apollo/client';

const GET_NEIGHBORHOOD = gql`
  query GetNeighborhood($id: ID!) {
    entity(id: $id, purpose: "analytics") {
      id
      type
      props
    }
    relationships(from: $id, limit: 100) {
      id
      to
      type
    }
  }
`;

export const GraphExplorer = ({ entityId, tenantId }: { entityId: string, tenantId: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const { data, loading, error } = useQuery(GET_NEIGHBORHOOD, {
      variables: { id: entityId },
      context: { headers: { 'x-tenant-id': tenantId } } // Explicit tenant scope
  });

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Cytoscape
    if (!cyRef.current) {
        cyRef.current = cytoscape({
          container: containerRef.current,
          style: [
            {
              selector: 'node',
              style: {
                'background-color': '#666',
                'label': 'data(label)',
                'color': '#fff',
                'text-valign': 'center',
                'text-halign': 'center'
              }
            },
            {
              selector: 'edge',
              style: {
                'width': 3,
                'line-color': '#ccc',
                'target-arrow-color': '#ccc',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'label': 'data(label)',
                'font-size': '10px'
              }
            }
          ],
          layout: { name: 'grid' }
        });
    }

    const cy = cyRef.current;

    if (data) {
        cy.elements().remove(); // Clear previous

        const elements = [];

        if (data.entity) {
             elements.push({
                 data: { id: data.entity.id, label: data.entity.type + '\n' + data.entity.id.substring(0,4) }
             });
        }

        if (data.relationships) {
            data.relationships.forEach((rel: any) => {
                // We add target nodes even if we don't have details, to show the link
                if (cy.getElementById(rel.to).empty()) {
                    elements.push({ data: { id: rel.to, label: 'Unknown' } });
                }
                elements.push({
                    data: { id: rel.id, source: entityId, target: rel.to, label: rel.type }
                });
            });
        }

        cy.add(elements);
        cy.layout({ name: 'cose', animate: true }).run();
    }

  }, [data, entityId]);

  // Clean up
  useEffect(() => {
      return () => {
          if (cyRef.current) {
              cyRef.current.destroy();
              cyRef.current = null;
          }
      }
  }, []);

  if (loading) return <div>Loading Graph for Tenant {tenantId}...</div>;
  if (error) return <div style={{color: 'red'}}>Error: {error.message}</div>;

  return (
      <div className="graph-explorer-container" style={{ border: '1px solid #ccc', padding: '10px' }}>
          <h3>Graph Explorer (Tenant: {tenantId})</h3>
          <div ref={containerRef} style={{ width: '100%', height: '500px', backgroundColor: '#f9f9f9' }} />
      </div>
  );
};
