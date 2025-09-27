const notificationResolvers = {
  Mutation: {
    async setAnomalyAlertConfig(_, { investigationId, enabled, threshold }, { notificationService }) {
      if (!notificationService) {
        throw new Error('Notification service not available');
      }
      if (enabled) {
        notificationService.setProjectThreshold(investigationId, threshold);
      } else {
        notificationService.setProjectThreshold(investigationId, null);
      }
      return true;
    },
  },
};

export default notificationResolvers;
