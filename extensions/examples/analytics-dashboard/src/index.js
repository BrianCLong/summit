"use strict";
/**
 * Analytics Dashboard Extension
 *
 * Example extension demonstrating analytics capabilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
/**
 * Extension activation function
 */
async function activate(context) {
    const { logger, config, api } = context;
    logger.info('Analytics Dashboard extension activating...');
    logger.debug('Config:', config);
    // Initialize extension state
    const state = {
        refreshInterval: config.refreshInterval || 60,
        defaultTimeRange: config.defaultTimeRange || 'week',
        startTime: Date.now(),
    };
    // Set up periodic refresh (if configured)
    let refreshTimer;
    if (state.refreshInterval > 0) {
        refreshTimer = setInterval(() => {
            logger.debug('Refreshing analytics data...');
            // In a real extension, this would refresh cached data
        }, state.refreshInterval * 1000);
    }
    logger.info('Analytics Dashboard extension activated');
    // Return activation result with cleanup
    return {
        dispose: async () => {
            logger.info('Analytics Dashboard extension deactivating...');
            if (refreshTimer) {
                clearInterval(refreshTimer);
            }
            logger.info('Analytics Dashboard extension deactivated');
        },
        exports: {
            getState: () => state,
        },
    };
}
