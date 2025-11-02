INSERT INTO tools (name, description, openapi, tags) VALUES
(
  'searchCatalog',
  'Searches the product catalog.',
  '{
    "openapi": "3.0.0",
    "info": { "title": "Search Catalog", "version": "1.0.0" },
    "servers": [{ "url": "http://tool-server:3000" }],
    "paths": {
      "/searchCatalog": {
        "post": {
          "summary": "Search Catalog",
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": { "query": { "type": "string" } }
                }
              }
            }
          },
          "responses": { "200": { "description": "OK" } }
        }
      }
    }
  }',
  '{"search", "catalog"}'
),
(
  'lookupUser',
  'Looks up a user by their ID.',
  '{
    "openapi": "3.0.0",
    "info": { "title": "Lookup User", "version": "1.0.0" },
    "servers": [{ "url": "http://tool-server:3000" }],
    "paths": {
      "/lookupUser": {
        "post": {
          "summary": "Lookup User",
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": { "userId": { "type": "string" } }
                }
              }
            }
          },
          "responses": { "200": { "description": "OK" } }
        }
      }
    }
  }',
  '{"user", "lookup"}'
),
(
  'createTicket',
  'Creates a new support ticket.',
  '{
    "openapi": "3.0.0",
    "info": { "title": "Create Ticket", "version": "1.0.0" },
    "servers": [{ "url": "http://tool-server:3000" }],
    "paths": {
      "/createTicket": {
        "post": {
          "summary": "Create Ticket",
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "title": { "type": "string" },
                    "description": { "type": "string" }
                  }
                }
              }
            }
          },
          "responses": { "200": { "description": "OK" } }
        }
      }
    }
  }',
  '{"ticket", "support"}'
);
