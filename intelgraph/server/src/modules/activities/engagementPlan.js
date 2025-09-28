const { normalizeConfig } = require('./config')
const { METRIC_BLUEPRINTS } = require('./metrics')

function normalizeValue(key, value) {
  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }

  if (key === 'coherenceScale') {
    return Math.min(1, Math.log10(Math.max(value, 1)) / 12)
  }

  if (key === 'integrityThreshold' || key === 'opportunityPrecision') {
    const adjusted = Math.max(value, 1e-12)
    return Math.min(1, 1 / (adjusted * 1e10))
  }

  if (key === 'engagementAmplification') {
    return Math.min(1, value / 100)
  }

  if (key === 'collaborationIntensity' || key === 'stabilizationNexus' || key === 'engagementIntensity') {
    return Math.min(1, value / 5)
  }

  return Math.min(1, Number(value) || 0)
}

function formatSummary(blueprint, score) {
  if (score > 85) {
    return `${blueprint.label} is operating at mission-ready performance.`
  }
  if (score > 70) {
    return `${blueprint.label} is healthy with minor optimization opportunities.`
  }
  return `${blueprint.label} requires analyst review to avoid risk drift.`
}

function buildMetrics(config) {
  return METRIC_BLUEPRINTS.map((blueprint) => {
    const rawValue = config[blueprint.configKey]
    const normalized = normalizeValue(blueprint.configKey, rawValue)
    const score = Math.min(100, Math.max(40, 60 + normalized * 35 * blueprint.weight))
    const trend = Number(((normalized - 0.5) * 20).toFixed(2))

    return {
      name: blueprint.name,
      label: blueprint.label,
      score: Number(score.toFixed(2)),
      trend,
      summary: formatSummary(blueprint, score),
    }
  })
}

function buildHighlights(ids, metrics, config) {
  const topMetric = metrics.reduce((best, current) => (current.score > best.score ? current : best), metrics[0])
  const lowestMetric = metrics.reduce((worst, current) => (current.score < worst.score ? current : worst), metrics[0])

  const highlights = [
    `${ids.length} mission identifiers synchronized into a shared engagement workspace.`,
    `${topMetric.label} leading with a score of ${topMetric.score.toFixed(1)}.`,
    `${lowestMetric.label} flagged for follow-up at ${lowestMetric.score.toFixed(1)}.`,
  ]

  if (config.globalDataSync) {
    highlights.push('Global data synchronization confirmed across participating theaters.')
  }

  if (!config.complianceStandard) {
    highlights.push('Compliance guardrails are disabled — review policy alignment before launch.')
  }

  return highlights
}

function buildRecommendations(metrics, config) {
  const recommendations = []
  const lowestMetric = metrics.reduce((worst, current) => (current.score < worst.score ? current : worst), metrics[0])

  if (lowestMetric.name === 'harmonizedInsight' || lowestMetric.name === 'dynamicCoordination') {
    recommendations.push('Schedule a cross-team sync to reinforce shared context and coordination cadence.')
  }

  if (config.engagementIntensity > 3) {
    recommendations.push('Balance engagement intensity with stabilization drills to avoid analyst overload.')
  }

  if (!config.globalDataSync) {
    recommendations.push('Enable global data synchronization to maintain intelligence freshness across cohorts.')
  }

  if (config.opportunityPrecision < 0.0000000005) {
    recommendations.push('Review opportunity precision thresholds to ensure sufficient signal diversity.')
  }

  if (recommendations.length === 0) {
    recommendations.push('Proceed to publish the plan and notify mission leads of readiness status.')
  }

  return recommendations
}

function generateEngagementPlan(ids = [], configInput = {}) {
  const config = normalizeConfig(configInput)
  const metrics = buildMetrics(config)
  const highlights = buildHighlights(ids, metrics, config)
  const recommendedActions = buildRecommendations(metrics, config)

  return {
    ids,
    generatedAt: new Date().toISOString(),
    metrics,
    highlights,
    recommendedActions,
    config,
  }
}

module.exports = {
  generateEngagementPlan,
}
