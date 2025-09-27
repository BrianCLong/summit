import React, { useCallback, useEffect, useMemo, useState } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { GraphiQL } from 'graphiql';
import 'graphiql/graphiql.css';
import styles from './styles.module.css';

type Example = {
  id: string;
  label: string;
  query: string;
  variables?: string;
  description: string;
};

const STORAGE_KEYS = {
  endpoint: 'summit.graphql-playground.endpoint',
  token: 'summit.graphql-playground.token',
  persistToken: 'summit.graphql-playground.persistToken',
};

const DEFAULT_ENDPOINT = 'https://api.summit.intelgraph/graphql';
const LOCAL_ENDPOINT = 'http://localhost:4000/graphql';

const EXAMPLES: Example[] = [
  {
    id: 'ingest-document',
    label: 'Ingest: Upsert Entity + Relationship',
    description:
      'Create or update an entity and attach a relationship that links it to an existing case.',
    query: `mutation UpsertIntelCase($entity: EntityInput!, $relationship: RelationshipInput!) {
  upsertEntity(input: $entity) {
    id
    type
    confidence
    props
  }
  upsertRelationship(input: $relationship) {
    kind
    src
    dst
    confidence
  }
}`,
    variables: `{
  "entity": {
    "id": "lead-4739",
    "type": "Lead",
    "confidence": 0.88,
    "props": {
      "summary": "Wiki-leak mention correlates with suspicious wallet activity",
      "source": "osint://intel-drop-2024-09-13"
    }
  },
  "relationship": {
    "src": "case-41",
    "dst": "lead-4739",
    "kind": "MENTIONS",
    "confidence": 0.72,
    "props": {
      "ingestedAt": "2024-09-13T14:43:00Z",
      "ingestPipeline": "summit-agent-osint"
    }
  }
}`,
  },
  {
    id: 'graph-neighborhood',
    label: 'Explore: Graph Neighborhood',
    description: 'Return the subgraph around an entity with adjustable depth.',
    query: `query AnalystNeighborhood($id: ID!, $depth: Int = 2) {
  neighbors(id: $id, depth: $depth) {
    nodes {
      id
      type
      confidence
    }
    rels {
      src
      dst
      kind
      confidence
    }
  }
}`,
    variables: `{
  "id": "lead-4739",
  "depth": 2
}`,
  },
  {
    id: 'path-analysis',
    label: 'Explore: Shortest Paths',
    description: 'Inspect paths between two entities to explain an analytic judgement.',
    query: `query InvestigatePath($source: ID!, $target: ID!, $maxDepth: Int = 4) {
  paths(src: $source, dst: $target, maxDepth: $maxDepth) {
    nodes {
      id
      type
    }
    rels {
      src
      dst
      kind
    }
  }
}`,
    variables: `{
  "source": "lead-4739",
  "target": "account-102",
  "maxDepth": 3
}`,
  },
];

function withBearerPrefix(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('Bearer ') ? trimmed : `Bearer ${trimmed}`;
}

const GraphQLPlaygroundInner: React.FC = () => {
  const [endpoint, setEndpoint] = useState<string>(DEFAULT_ENDPOINT);
  const [token, setToken] = useState<string>('');
  const [rememberToken, setRememberToken] = useState<boolean>(false);
  const [query, setQuery] = useState<string>(EXAMPLES[0]?.query ?? '');
  const [variables, setVariables] = useState<string>(EXAMPLES[0]?.variables ?? '');
  const [activeExample, setActiveExample] = useState<string>(EXAMPLES[0]?.id ?? '');

  useEffect(() => {
    const savedEndpoint = window.localStorage.getItem(STORAGE_KEYS.endpoint);
    if (savedEndpoint) {
      setEndpoint(savedEndpoint);
    } else {
      window.localStorage.setItem(STORAGE_KEYS.endpoint, DEFAULT_ENDPOINT);
    }

    const savedToken = window.localStorage.getItem(STORAGE_KEYS.token);
    const savedPersist = window.localStorage.getItem(STORAGE_KEYS.persistToken);
    if (savedToken && savedPersist === 'true') {
      setToken(savedToken);
      setRememberToken(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.endpoint, endpoint);
  }, [endpoint]);

  useEffect(() => {
    if (rememberToken) {
      window.localStorage.setItem(STORAGE_KEYS.token, token);
      window.localStorage.setItem(STORAGE_KEYS.persistToken, 'true');
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.token);
      window.localStorage.setItem(STORAGE_KEYS.persistToken, 'false');
    }
  }, [token, rememberToken]);

  const fetcher = useCallback<NonNullable<React.ComponentProps<typeof GraphiQL>['fetcher']>>(
    async (graphQLParams) => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: withBearerPrefix(token) } : {}),
          },
          body: JSON.stringify(graphQLParams),
          credentials: 'include',
        });

        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch (error) {
          return text;
        }
      } catch (error) {
        return {
          errors: [
            {
              message: error instanceof Error ? error.message : 'Unexpected network error',
            },
          ],
        };
      }
    },
    [endpoint, token],
  );

  const endpointOptions = useMemo(
    () => [
      { label: 'Summit Cloud', value: DEFAULT_ENDPOINT },
      { label: 'Local development', value: LOCAL_ENDPOINT },
    ],
    [],
  );

  const applyExample = useCallback(
    (example: Example) => {
      setActiveExample(example.id);
      setQuery(example.query);
      setVariables(example.variables ?? '');
    },
    [],
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label className={styles.label} htmlFor="graphql-endpoint">
            GraphQL endpoint
          </label>
          <div className={styles.endpointRow}>
            <select
              className={styles.select}
              value={endpointOptions.some((option) => option.value === endpoint) ? endpoint : 'custom'}
              onChange={(event) => {
                const selected = event.target.value;
                if (selected === 'custom') {
                  return;
                }
                setEndpoint(selected);
              }}
            >
              {endpointOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
            <input
              id="graphql-endpoint"
              className={styles.input}
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              placeholder="https://api.summit.intelgraph/graphql"
              type="url"
            />
          </div>
        </div>
        <div className={styles.controlGroup}>
          <label className={styles.label} htmlFor="graphql-token">
            JWT access token
          </label>
          <textarea
            id="graphql-token"
            className={styles.textarea}
            placeholder="Paste a JWT (header.payload.signature) or full 'Bearer' token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            rows={3}
          />
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={rememberToken}
              onChange={(event) => setRememberToken(event.target.checked)}
            />
            Remember token in this browser
          </label>
        </div>
      </div>
      <div className={styles.examples}>
        {EXAMPLES.map((example) => (
          <button
            key={example.id}
            type="button"
            className={example.id === activeExample ? styles.exampleButtonActive : styles.exampleButton}
            onClick={() => applyExample(example)}
          >
            <span className={styles.exampleLabel}>{example.label}</span>
            <span className={styles.exampleDescription}>{example.description}</span>
          </button>
        ))}
      </div>
      <div className={styles.playground}>
        <GraphiQL
          fetcher={fetcher}
          query={query}
          variables={variables}
          onEditQuery={setQuery}
          onEditVariables={setVariables}
          headerEditorEnabled
          shouldPersistHeaders
        />
      </div>
    </div>
  );
};

const GraphQLPlayground: React.FC = () => {
  return (
    <BrowserOnly fallback={<div className={styles.browserOnlyFallback}>The API playground requires a browser.</div>}>
      {() => <GraphQLPlaygroundInner />}
    </BrowserOnly>
  );
};

export default GraphQLPlayground;
