CREATE CONSTRAINT prov_id IF NOT EXISTS FOR (p:Provenance) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT model_key IF NOT EXISTS FOR (m:Model) REQUIRE (m.provider, m.name) IS NODE KEY;
CREATE CONSTRAINT investigation_id IF NOT EXISTS FOR (i:Investigation) REQUIRE i.id IS UNIQUE;

UNWIND [
  {provider: 'openai', name: 'gpt-4o'},
  {provider: 'openai', name: 'gpt-4o-mini'},
  {provider: 'anthropic', name: 'claude-3-5-sonnet'},
  {provider: 'google', name: 'gemini-1.5-pro'},
  {provider: 'perplexity', name: 'sonar-pro'}
] AS model
MERGE (:Model { provider: model.provider, name: model.name });
