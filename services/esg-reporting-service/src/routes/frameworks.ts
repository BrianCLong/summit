/**
 * ESG Framework Routes
 * REST API endpoints for compliance framework information
 */

import { Router, Request, Response } from 'express';
import { createChildLogger } from '../utils/logger.js';
import {
  getAllFrameworks,
  getFramework,
  getFrameworksByCategory,
  getRequirementsByMetric,
  type ESGCategory,
} from '@intelgraph/esg-reporting';

const router = Router();
const log = createChildLogger({ route: 'frameworks' });

/**
 * Get all available compliance frameworks
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const frameworks = getAllFrameworks();

    // Return summary view
    const summary = frameworks.map((fw) => ({
      id: fw.id,
      name: fw.name,
      fullName: fw.fullName,
      version: fw.version,
      description: fw.description,
      website: fw.website,
      categories: fw.categories,
      industrySpecific: fw.industrySpecific,
      geographicScope: fw.geographicScope,
      requirementsCount: fw.requirements.length,
      mandatoryRequirements: fw.requirements.filter((r) => r.mandatory).length,
    }));

    res.json(summary);
  } catch (error) {
    log.error({ error }, 'Failed to list frameworks');
    res.status(500).json({ error: 'Failed to list frameworks' });
  }
});

/**
 * Get frameworks by ESG category
 */
router.get('/by-category/:category', async (req: Request, res: Response) => {
  try {
    const category = req.params.category as ESGCategory;
    if (!['environmental', 'social', 'governance'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const frameworks = getFrameworksByCategory(category);

    const summary = frameworks.map((fw) => ({
      id: fw.id,
      name: fw.name,
      fullName: fw.fullName,
      categories: fw.categories,
      requirementsCount: fw.requirements.filter((r) => r.category === category).length,
    }));

    res.json(summary);
  } catch (error) {
    log.error({ error, category: req.params.category }, 'Failed to get frameworks by category');
    res.status(500).json({ error: 'Failed to get frameworks' });
  }
});

/**
 * Get detailed information about a specific framework
 */
router.get('/:frameworkId', async (req: Request, res: Response) => {
  try {
    const framework = getFramework(req.params.frameworkId);

    if (!framework) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    res.json(framework);
  } catch (error) {
    log.error({ error, frameworkId: req.params.frameworkId }, 'Failed to get framework');
    res.status(500).json({ error: 'Failed to get framework' });
  }
});

/**
 * Get requirements for a specific framework
 */
router.get('/:frameworkId/requirements', async (req: Request, res: Response) => {
  try {
    const framework = getFramework(req.params.frameworkId);

    if (!framework) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    const category = req.query.category as ESGCategory | undefined;
    const mandatory = req.query.mandatory === 'true' ? true : req.query.mandatory === 'false' ? false : undefined;

    let requirements = framework.requirements;

    if (category) {
      requirements = requirements.filter((r) => r.category === category);
    }

    if (mandatory !== undefined) {
      requirements = requirements.filter((r) => r.mandatory === mandatory);
    }

    res.json(requirements);
  } catch (error) {
    log.error({ error, frameworkId: req.params.frameworkId }, 'Failed to get requirements');
    res.status(500).json({ error: 'Failed to get requirements' });
  }
});

/**
 * Find frameworks that cover a specific metric
 */
router.get('/metrics/:metricName', async (req: Request, res: Response) => {
  try {
    const mappings = getRequirementsByMetric(req.params.metricName);

    if (mappings.length === 0) {
      return res.json({
        metric: req.params.metricName,
        frameworks: [],
        message: 'No framework requirements found for this metric',
      });
    }

    const result = {
      metric: req.params.metricName,
      frameworks: mappings.map((m) => ({
        framework: m.framework,
        requirement: {
          id: m.requirement.id,
          name: m.requirement.name,
          description: m.requirement.description,
          category: m.requirement.category,
          mandatory: m.requirement.mandatory,
        },
      })),
    };

    res.json(result);
  } catch (error) {
    log.error({ error, metricName: req.params.metricName }, 'Failed to find frameworks for metric');
    res.status(500).json({ error: 'Failed to find frameworks' });
  }
});

/**
 * Compare multiple frameworks
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const frameworkIds = req.body.frameworks;
    if (!Array.isArray(frameworkIds) || frameworkIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 framework IDs are required' });
    }

    const frameworks = frameworkIds
      .map((id) => getFramework(id))
      .filter((fw): fw is NonNullable<typeof fw> => fw !== undefined);

    if (frameworks.length !== frameworkIds.length) {
      return res.status(400).json({ error: 'One or more frameworks not found' });
    }

    // Build comparison matrix
    const comparison = {
      frameworks: frameworks.map((fw) => ({
        id: fw.id,
        name: fw.name,
        requirementsCount: fw.requirements.length,
        mandatoryCount: fw.requirements.filter((r) => r.mandatory).length,
      })),
      categories: {
        environmental: frameworks.map((fw) => ({
          framework: fw.id,
          requirements: fw.requirements.filter((r) => r.category === 'environmental').length,
        })),
        social: frameworks.map((fw) => ({
          framework: fw.id,
          requirements: fw.requirements.filter((r) => r.category === 'social').length,
        })),
        governance: frameworks.map((fw) => ({
          framework: fw.id,
          requirements: fw.requirements.filter((r) => r.category === 'governance').length,
        })),
      },
      commonMetrics: findCommonMetrics(frameworks),
      uniqueMetrics: findUniqueMetrics(frameworks),
    };

    res.json(comparison);
  } catch (error) {
    log.error({ error }, 'Failed to compare frameworks');
    res.status(500).json({ error: 'Failed to compare frameworks' });
  }
});

/**
 * Find metrics that are common across all frameworks
 */
function findCommonMetrics(
  frameworks: ReturnType<typeof getAllFrameworks>,
): string[] {
  if (frameworks.length === 0) return [];

  const metricSets = frameworks.map(
    (fw) => new Set(fw.requirements.flatMap((r) => r.metrics)),
  );

  const firstSet = metricSets[0];
  return [...firstSet].filter((metric) =>
    metricSets.every((set) => set.has(metric)),
  );
}

/**
 * Find metrics unique to each framework
 */
function findUniqueMetrics(
  frameworks: ReturnType<typeof getAllFrameworks>,
): Record<string, string[]> {
  const allMetrics = new Set(
    frameworks.flatMap((fw) => fw.requirements.flatMap((r) => r.metrics)),
  );

  const result: Record<string, string[]> = {};

  for (const fw of frameworks) {
    const fwMetrics = new Set(fw.requirements.flatMap((r) => r.metrics));
    const otherMetrics = new Set(
      frameworks
        .filter((other) => other.id !== fw.id)
        .flatMap((other) => other.requirements.flatMap((r) => r.metrics)),
    );

    result[fw.id] = [...fwMetrics].filter((m) => !otherMetrics.has(m));
  }

  return result;
}

export default router;
