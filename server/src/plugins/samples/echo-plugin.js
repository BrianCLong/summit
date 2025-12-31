module.exports = {
  initialize: async (context) => {
    context.console.log('Echo Plugin Initialized');
  },
  execute: async (action, params, context) => {
    if (action === 'echo') {
      context.console.log('Echoing: ' + JSON.stringify(params));
      return { success: true, data: params };
    }
    throw new Error('Unknown action: ' + action);
  },
  cleanup: async (context) => {
    context.console.log('Echo Plugin Cleaned up');
  }
};
