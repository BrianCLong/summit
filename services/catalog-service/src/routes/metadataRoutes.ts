/**
 * Metadata Routes
 * REST API routes for metadata catalog operations
 */

import { Router } from 'express';
import { MetadataController } from '../controllers/MetadataController.js';

export function createMetadataRouter(controller: MetadataController): Router {
  const router = Router();

  // Universal search
  router.get('/search', (req, res) => controller.universalSearch(req, res));

  // Data Sources
  router.get('/sources', (req, res) => controller.listDataSources(req, res));
  router.get('/sources/:id', (req, res) => controller.getDataSource(req, res));
  router.post('/sources', (req, res) => controller.registerDataSource(req, res));
  router.patch('/sources/:id/status', (req, res) => controller.updateDataSourceStatus(req, res));

  // Datasets
  router.get('/datasets', (req, res) => controller.listDatasets(req, res));
  router.get('/datasets/search', (req, res) => controller.searchDatasets(req, res));
  router.get('/datasets/:id', (req, res) => controller.getDataset(req, res));
  router.post('/datasets', (req, res) => controller.registerDataset(req, res));
  router.patch('/datasets/:id/statistics', (req, res) => controller.updateDatasetStatistics(req, res));
  router.get('/datasets/:id/impact', (req, res) => controller.getDatasetImpact(req, res));

  // Fields
  router.get('/fields/search', (req, res) => controller.searchFields(req, res));
  router.get('/fields/canonical/:canonicalName', (req, res) =>
    controller.searchFieldsByCanonicalName(req, res)
  );

  // Mappings
  router.get('/mappings', (req, res) => controller.listMappings(req, res));
  router.get('/mappings/:id', (req, res) => controller.getMapping(req, res));
  router.post('/mappings', (req, res) => controller.createMapping(req, res));
  router.post('/mappings/:id/validate', (req, res) => controller.validateMapping(req, res));
  router.get('/mappings/:id/impact', (req, res) => controller.getMappingImpact(req, res));

  // Licenses
  router.get('/licenses', (req, res) => controller.listLicenses(req, res));
  router.get('/licenses/:id', (req, res) => controller.getLicense(req, res));
  router.post('/licenses', (req, res) => controller.createLicense(req, res));
  router.get('/licenses/:id/usage', (req, res) => controller.getLicenseUsage(req, res));

  return router;
}
