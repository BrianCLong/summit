import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from '../services/openapi.js';

const router = Router();

// Swagger UI
router.use('/swagger', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// ReDoc
router.get('/reference', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Summit API Documentation</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
        <style>
          body {
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        <redoc spec-url='/api/docs/json'></redoc>
        <script src="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js"> </script>
      </body>
    </html>
  `);
});

// Expose raw JSON
router.get('/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openApiSpec);
});

// Default redirect
router.get('/', (req, res) => {
    res.redirect('/api/docs/swagger');
});

export default router;
