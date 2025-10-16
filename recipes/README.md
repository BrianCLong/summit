# Recipes

YAML stubs for simple pipelines that can be listed, inspected, and dry-run queued via GraphQL.

Schema (minimal)

- name: string
- description: string
- inputs: optional list (name, type)
- nodes: list of steps; each has id, type, params
- edges: list of { from, to }
- policies: optional (e.g., budget caps)

GraphQL

- Query recipes: [String!]! — list recipe filenames
- Query recipe(name: String!): JSON! — parsed YAML
- Mutation runRecipe(name: String!, inputs: JSON, meta: SafeMeta!): SafeResult!
  - With meta.dryRun=true returns status: PLANNED and diff with the plan

Example

See rag-qa.yaml, sql-agent.yaml, web-research.yaml, comfy-image.yaml, video-pipeline.yaml.
