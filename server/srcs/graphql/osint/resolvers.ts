import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OSINT_SERVICE_URL = process.env.OSINT_SERVICE_URL || 'http://localhost:8000';

export const osintResolvers = {
  Query: {
    getIpReputation: async (_: any, { ipAddress }: { ipAddress: string }) => {
      const response = await axios.get(`${OSINT_SERVICE_URL}/ip_reputation/${ipAddress}`);
      return response.data;
    },
    getIpInfo: async (_: any, { ipAddress }: { ipAddress: string }) => {
      const response = await axios.get(`${OSINT_SERVICE_URL}/ip_info/${ipAddress}`);
      return response.data;
    },
    scrapeWebsite: async (_: any, { url }: { url: string }) => {
      const response = await axios.post(`${OSINT_SERVICE_URL}/scrape_website`, { url });
      return response.data;
    },
  },
  Mutation: {
    analyzeText: async (_: any, { text }: { text: string }) => {
      const response = await axios.post(`${OSINT_SERVICE_URL}/analyze_text`, { text });
      return response.data;
    },
    generateHypotheses: async (_: any, { data }: { data: any }) => {
      const response = await axios.post(`${OSINT_SERVICE_URL}/generate_hypotheses`, data);
      return response.data;
    },
    simulateThreats: async (_: any, { data }: { data: any }) => {
      const response = await axios.post(`${OSINT_SERVICE_URL}/simulate_threats`, data);
      return response.data;
    },
  },
};
