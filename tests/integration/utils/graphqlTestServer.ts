const http = require('http');
const url = require('url');

// Create a simple HTTP server that simulates GraphQL endpoints needed for testing
function createGraphQLTestApp() {
  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    // Enable CORS and set content type
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle POST /graphql
    if (req.method === 'POST' && path === '/graphql') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        let reqBody = {};
        try {
          reqBody = JSON.parse(body);
        } catch (e) {
          // If JSON parsing fails, keep empty object
        }

        const query = reqBody.query;
        
        // Handle the specific queries from the test
        if (query && query.includes('ok') && query.includes('version')) {
          // Happy path: return ok and version
          res.writeHead(200);
          res.end(JSON.stringify({ 
            data: { 
              ok: true, 
              version: '1.0.0' 
            } 
          }));
        } else if (query && query.includes('notAField')) {
          // Error path: return GraphQL error
          res.writeHead(200); // GraphQL returns 200 even for errors
          res.end(JSON.stringify({ 
            data: null,
            errors: [{ 
              message: "Cannot query field \"notAField\" on type \"Query\".",
              locations: [{ line: 1, column: 3 }]
            }]
          }));
        } else if (query && query.includes('__schema')) {
          // Schema introspection query
          res.writeHead(200);
          res.end(JSON.stringify({ 
            data: { 
              __schema: { 
                types: [
                  { name: 'Query' },
                  { name: 'Mutation' },
                  { name: 'String' },
                  { name: 'Boolean' }
                ]
              } 
            } 
          }));
        } else {
          // Default response for other queries
          res.writeHead(200);
          res.end(JSON.stringify({ 
            data: { 
              ok: true,
              version: 'default-1.0.0' 
            } 
          }));
        }
      });
      return;
    }

    // 404 for other routes
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'not found' }));
  });

  return server;
}

module.exports = { createGraphQLTestApp };