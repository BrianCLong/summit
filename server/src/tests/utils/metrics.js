// Minimal, test-only reset that reinitializes known counters on a given service.
// If the service doesn't expose fields, we use a deterministic mock of getMetrics.
function hardResetMetrics(pluginService) {
  if (pluginService && pluginService.metrics) {
    pluginService.metrics.activations = 0;
    pluginService.metrics.errors = 0;
    pluginService.metrics.executions = 0;
    pluginService.metrics.lastExecution = null;
    return;
  }

  // Fallback: make metrics deterministic even if internals aren't exposed
  if (pluginService && typeof pluginService.getMetrics === 'function') {
    jest.spyOn(pluginService, 'getMetrics').mockImplementation(() => ({
      totalPlugins: pluginService.getPlugins().length,
      loadedPlugins: pluginService
        .getPlugins()
        .filter((p) => p.status === 'LOADED').length,
      activePlugins: pluginService
        .getPlugins()
        .filter((p) => p.status === 'ACTIVE').length,
      failedPlugins: pluginService
        .getPlugins()
        .filter((p) => p.status === 'FAILED').length,
      pluginBreakdown: {},
    }));
  }
}

module.exports = { hardResetMetrics };
