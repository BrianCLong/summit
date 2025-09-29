const axios = require('axios');

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8000';

const analyticsService = {
  /**
   * Triggers the community detection process in the Python analytics service.
   * @returns {Promise<Object>} The response data from the analytics service.
   */
  runCommunityDetection: async () => {
    try {
      const response = await axios.post(`${ANALYTICS_SERVICE_URL}/analyze/community-detection`);
      return response.data;
    } catch (error) {
      console.error('Error calling analytics service for community detection:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw new Error(`Failed to trigger community detection: ${error.message}`);
    }
  },
};

module.exports = analyticsService;
