// API Layer for Symphony UI
// Centralized API functions to replace the old inline script functions

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8787';

class SymphonyAPI {
  constructor() {
    this.config = this.getEnvironmentConfig();
  }

  // Configuration from environment
  getEnvironmentConfig = () => ({
    PROXY_BASE:
      window.__SYMPHONY_CFG__?.PROXY_BASE ||
      new URLSearchParams(window.location.search).get('proxy') ||
      'http://127.0.0.1:8787',
    LITELLM_BASE:
      window.__SYMPHONY_CFG__?.LITELLM_BASE ||
      new URLSearchParams(window.location.search).get('litellm') ||
      'http://127.0.0.1:4000',
    OLLAMA_BASE:
      window.__SYMPHONY_CFG__?.OLLAMA_BASE ||
      new URLSearchParams(window.location.search).get('ollama') ||
      'http://127.0.0.1:11434',
  });

  // Utility functions
  formatTime = (date) => new Date(date).toLocaleTimeString();
  
  formatPercent = (val, total) =>
    total > 0 ? Math.round((val / total) * 100) : 0;

  // Core API methods
  async fetch(endpoint, options = {}) {
    const config = this.getEnvironmentConfig();
    const url = endpoint.startsWith('/')
      ? `${config.PROXY_BASE}${endpoint}`
      : endpoint;
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      if (!response.ok)
        throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Health and status endpoints
  getHealth = () => this.fetch('/health');
  getBudgets = () => this.fetch('/budgets');
  getModels = () => this.fetch('/models');
  getStatus = () => this.fetch('/status.json');

  // RAG endpoints
  ragQuery = (question, limit = 5) =>
    this.fetch('/rag/query', {
      method: 'POST',
      body: JSON.stringify({ question, limit }),
    });
  ragStats = () => this.fetch('/rag/stats');

  // Routing endpoints
  routePlan = (task, meta = {}) =>
    this.fetch('/route/plan', {
      method: 'POST',
      body: JSON.stringify({ task, meta }),
    });
  routeExecute = (task, meta = {}, input = '') =>
    this.fetch('/route/execute', {
      method: 'POST',
      body: JSON.stringify({ task, meta, input }),
    });

  // Neo4j Guard
  runNeo4jGuard = (keepDb = false) =>
    this.fetch('/neo4j/guard', {
      method: 'POST',
      body: JSON.stringify({ keep_db: keepDb }),
    });

  // Governance
  createGovernanceRecord = (type, title, details) =>
    this.fetch('/governance/record', {
      method: 'POST',
      body: JSON.stringify({ type, title, details }),
    });

  // Policy management
  getPolicy = () => this.fetch('/policy');
  updatePolicy = (policy) =>
    this.fetch('/policy', {
      method: 'PUT',
      body: JSON.stringify(policy),
    });

  // Logs and monitoring
  getLogs = (tail = 100, filter = '') =>
    this.fetch(`/logs?tail=${tail}&filter=${filter}`);
  runCommand = (cmd) =>
    this.fetch('/run', {
      method: 'POST',
      body: JSON.stringify({ cmd }),
    });
}

// Create singleton instance
const api = new SymphonyAPI();

export default api;