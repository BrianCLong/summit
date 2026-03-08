"use strict";
/**
 * Connector Routes
 * REST API routes for connector registry and schema registry operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConnectorRouter = createConnectorRouter;
const express_1 = require("express");
function createConnectorRouter(controller) {
    const router = (0, express_1.Router)();
    // Connector Registry
    router.get('/registry', (req, res) => controller.listConnectors(req, res));
    router.get('/registry/:id', (req, res) => controller.getConnector(req, res));
    router.post('/registry', (req, res) => controller.registerConnector(req, res));
    // Schema Registry
    router.post('/schemas', (req, res) => controller.registerSchema(req, res));
    router.post('/schemas/validate', (req, res) => controller.validateSchema(req, res));
    router.get('/schemas/:schemaId', (req, res) => controller.getLatestSchema(req, res));
    router.get('/schemas/:schemaId/versions', (req, res) => controller.listSchemaVersions(req, res));
    router.get('/schemas/:schemaId/versions/:version', (req, res) => controller.getSchemaVersion(req, res));
    router.post('/schemas/:schemaId/compatibility', (req, res) => controller.checkSchemaCompatibility(req, res));
    router.get('/schemas/:schemaId/diff/:fromVersion/:toVersion', (req, res) => controller.getSchemaDiff(req, res));
    return router;
}
