import React, { useEffect, useRef, useCallback } from 'react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectEntity,
  selectRelationship,
  Entity,
  Relationship,
} from '../store/workspaceSlice';

cytoscape.use(coseBilkent);

const TYPE_COLORS: Record<string, string> = {
  person: '#4a90d9',
  organization: '#e67e22',
  location: '#27ae60',
  event: '#9b59b6',
  document: '#e74c3c',
  account: '#1abc9c',
  unknown: '#7f8c8d',
};

const debounce = <T extends (...args: unknown[]) => void>(
  fn: T,
  delay = 50,
): ((...args: Parameters<T>) => void) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

function buildElements(
  entities: Entity[],
  relationships: Relationship[],
  selectedEntityId: string | null,
) {
  const nodes = entities.map((e) => ({
    data: {
      id: e.id,
      label: e.label,
      type: e.type,
      deception_score: e.deception_score,
    },
    classes: selectedEntityId === e.id ? 'selected' : '',
  }));

  const edges = relationships.map((r) => ({
    data: {
      id: r.id,
      source: r.source,
      target: r.target,
      label: r.label,
      weight: r.weight,
    },
  }));

  return { nodes, edges };
}

interface ContextCardProps {
  entity: Entity | null;
  relationship: Relationship | null;
  entities: Entity[];
}

const ContextCard: React.FC<ContextCardProps> = ({
  entity,
  relationship,
  entities,
}) => {
  if (!entity && !relationship) return null;

  if (entity) {
    return (
      <div className="context-card" role="region" aria-label="Selected entity details">
        <div className="context-card-header">
          <span
            className="context-card-type"
            style={{
              backgroundColor:
                TYPE_COLORS[entity.type] ?? TYPE_COLORS.unknown,
            }}
          >
            {entity.type}
          </span>
          <h3 className="context-card-title">{entity.label}</h3>
        </div>
        <div className="context-card-body">
          <div className="context-score">
            <span>Risk score</span>
            <strong
              className={
                entity.deception_score > 0.7
                  ? 'score-high'
                  : entity.deception_score > 0.4
                    ? 'score-med'
                    : 'score-low'
              }
            >
              {Math.round(entity.deception_score * 100)}%
            </strong>
          </div>
          <dl className="context-props">
            {Object.entries(entity.properties).map(([k, v]) => (
              <React.Fragment key={k}>
                <dt>{k}</dt>
                <dd>{String(v)}</dd>
              </React.Fragment>
            ))}
          </dl>
          <div className="context-connections">
            <span>Connected to:</span>
            <ul>
              {entity.connections.map((cid) => {
                const connected = entities.find((e) => e.id === cid);
                return connected ? (
                  <li key={cid}>{connected.label}</li>
                ) : null;
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (relationship) {
    const src = entities.find((e) => e.id === relationship.source);
    const tgt = entities.find((e) => e.id === relationship.target);
    return (
      <div className="context-card" role="region" aria-label="Selected relationship details">
        <div className="context-card-header">
          <span className="context-card-type context-card-type--rel">
            relationship
          </span>
          <h3 className="context-card-title">{relationship.label}</h3>
        </div>
        <div className="context-card-body">
          <dl className="context-props">
            <dt>From</dt>
            <dd>{src?.label ?? relationship.source}</dd>
            <dt>To</dt>
            <dd>{tgt?.label ?? relationship.target}</dd>
            <dt>Strength</dt>
            <dd>{Math.round(relationship.weight * 100)}%</dd>
            {relationship.timestamp && (
              <>
                <dt>Established</dt>
                <dd>{relationship.timestamp}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
    );
  }

  return null;
};

const MainCanvas: React.FC = () => {
  const dispatch = useAppDispatch();
  const { case: caseData, selectedEntityId, selectedRelationshipId, loadingState } =
    useAppSelector((s) => s.workspace);

  const cyRef = useRef<HTMLDivElement | null>(null);
  const cyInstance = useRef<cytoscape.Core | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const suppressSelectRef = useRef(false);

  const entities = caseData?.entities ?? [];
  const relationships = caseData?.relationships ?? [];

  const selectedEntity = entities.find((e) => e.id === selectedEntityId) ?? null;
  const selectedRel =
    relationships.find((r) => r.id === selectedRelationshipId) ?? null;

  // Layout worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../layoutWorker.ts', import.meta.url),
    );
    workerRef.current.onmessage = (
      e: MessageEvent<{ positions: Record<string, { x: number; y: number }> }>,
    ) => {
      const cy = cyInstance.current;
      if (!cy) return;
      const { positions } = e.data;
      cy.startBatch();
      Object.entries(positions).forEach(([id, pos]) => {
        cy.getElementById(id).position(pos);
      });
      cy.endBatch();
      cy.fit(undefined, 40);
    };
    return () => workerRef.current?.terminate();
  }, []);

  // Build/rebuild cytoscape when data loads
  useEffect(() => {
    if (!cyRef.current || loadingState !== 'success') return;

    const { nodes, edges } = buildElements(entities, relationships, selectedEntityId);

    cyInstance.current?.destroy();
    cyInstance.current = cytoscape({
      container: cyRef.current,
      elements: { nodes, edges },
      style: [
        {
          selector: 'node',
          style: {
            'background-color': `mapData(deception_score, 0, 1, #27ae60, #e74c3c)`,
            label: 'data(label)',
            color: '#fff',
            'text-valign': 'center',
            'font-size': '11px',
            width: 36,
            height: 36,
            'text-wrap': 'ellipsis',
            'text-max-width': '80px',
          } as cytoscape.Css.Node,
        },
        {
          selector: 'node.selected',
          style: {
            'border-width': 3,
            'border-color': '#f1c40f',
            'border-style': 'solid',
          } as cytoscape.Css.Node,
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#4a5568',
            'target-arrow-color': '#4a5568',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '9px',
            color: '#aaa',
            'text-rotation': 'autorotate',
          } as cytoscape.Css.Edge,
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#f1c40f',
            'target-arrow-color': '#f1c40f',
          } as cytoscape.Css.Edge,
        },
      ],
      layout: { name: 'grid', fit: true },
    });

    const cy = cyInstance.current;

    // Node click → select entity
    cy.on('tap', 'node', (e) => {
      if (suppressSelectRef.current) return;
      const id = e.target.id();
      dispatch(selectEntity(id));
    });

    // Edge click → select relationship
    cy.on('tap', 'edge', (e) => {
      if (suppressSelectRef.current) return;
      const id = e.target.id();
      dispatch(selectRelationship(id));
    });

    // Background tap → deselect
    cy.on('tap', (e) => {
      if (e.target === cy) {
        dispatch(selectEntity(null));
        dispatch(selectRelationship(null));
      }
    });

    // Resize
    const handleResize = debounce(() => cy.resize(), 100);
    window.addEventListener('resize', handleResize);

    // Async layout
    workerRef.current?.postMessage({ elements: cy.json().elements });

    return () => {
      window.removeEventListener('resize', handleResize);
      cy.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingState, caseData]);

  // Keep selection highlight in sync when selection changes externally
  useEffect(() => {
    const cy = cyInstance.current;
    if (!cy) return;
    suppressSelectRef.current = true;
    cy.startBatch();
    cy.elements().removeClass('selected');
    if (selectedEntityId) cy.getElementById(selectedEntityId).addClass('selected');
    cy.endBatch();
    suppressSelectRef.current = false;
  }, [selectedEntityId]);

  const handleFitGraph = useCallback(() => {
    cyInstance.current?.fit(undefined, 40);
  }, []);

  return (
    <section
      className="main-canvas"
      aria-label="Investigation Canvas"
      role="main"
    >
      {/* Toolbar */}
      <div className="canvas-toolbar">
        <span className="canvas-toolbar-title">
          {caseData ? caseData.title : 'Investigation Canvas'}
        </span>
        <div className="canvas-toolbar-actions">
          <button
            className="toolbar-btn"
            onClick={handleFitGraph}
            title="Fit graph to view"
            aria-label="Fit graph to view"
          >
            ⊞ Fit
          </button>
          {selectedEntityId && (
            <button
              className="toolbar-btn toolbar-btn--secondary"
              onClick={() => {
                dispatch(selectEntity(null));
                dispatch(selectRelationship(null));
              }}
              aria-label="Clear selection"
            >
              ✕ Clear selection
            </button>
          )}
        </div>
      </div>

      {/* Graph viewport */}
      <div className="canvas-viewport">
        {loadingState === 'idle' && (
          <div className="canvas-empty-state">
            <p>Open a case to begin investigation</p>
          </div>
        )}

        {loadingState === 'loading' && (
          <div className="canvas-loading" aria-busy="true" role="status">
            <div className="spinner" aria-hidden="true" />
            <span>Loading case data…</span>
          </div>
        )}

        {loadingState === 'error' && (
          <div className="canvas-error" role="alert">
            <span>⚠ Failed to load case data</span>
          </div>
        )}

        <div
          ref={cyRef}
          className="cy-container"
          style={{
            display: loadingState === 'success' ? 'block' : 'none',
          }}
          aria-label="Entity relationship graph"
          role="img"
        />
      </div>

      {/* Contextual detail card */}
      {loadingState === 'success' && (
        <ContextCard
          entity={selectedEntity}
          relationship={selectedRel}
          entities={entities}
        />
      )}
    </section>
  );
};

export default MainCanvas;
