"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const openapi_js_1 = require("../services/openapi.js");
const router = (0, express_1.Router)();
// Swagger UI
router.use('/swagger', ...swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openapi_js_1.openApiSpec));
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
    res.send(openapi_js_1.openApiSpec);
});
// Default redirect
router.get('/', (req, res) => {
    res.redirect('/api/docs/swagger');
});
exports.default = router;
