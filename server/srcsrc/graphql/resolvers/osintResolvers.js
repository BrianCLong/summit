
import axios from 'axios';

const OSINT_API_URL = process.env.OSINT_SERVICE_URL || 'http://localhost:8001/api/v1';

export const osintResolvers = {
  Query: {
    osintScans: async () => {
      // In a real implementation, this would fetch from the OSINT service
      return [];
    },
    osintScan: async (_, { id }) => {
      // In a real implementation, this would fetch from the OSINT service
      return { id, target: 'example.com', status: 'COMPLETED' };
    },
  },
  Mutation: {
    startOsintScan: async (_, { target }) => {
      try {
        const response = await axios.post(`${OSINT_API_URL}/scans/`, {
          target: target,
          modules: ['*'], // Or specify modules
        });
        // This is a mock response, as the actual scan runs in the background
        return {
          id: 'new-scan-id', // Generate or get a real ID
          target: target,
          status: 'STARTED',
        };
      } catch (error) {
        console.error('Error starting OSINT scan:', error);
        throw new Error('Failed to start OSINT scan.');
      }
    },
  },
};
