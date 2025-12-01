/**
 * Summit Platform JavaScript Client Example
 */

const axios = require('axios');

class SummitClient {
  constructor(baseUrl = 'http://localhost:4000', token = null) {
    this.baseUrl = baseUrl;
    this.graphqlUrl = baseUrl + '/graphql';
    this.token = token;
    
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (token) {
      this.client.defaults.headers.Authorization = 'Bearer ' + token;
    }
  }

  async login(email, password) {
    const query = `
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          token
          refreshToken
          user { id email name role }
        }
      }
    `;

    const response = await this.executeQuery(query, { email, password }, false);
    if (response.login) {
      this.token = response.login.token;
      this.client.defaults.headers.Authorization = 'Bearer ' + this.token;
    }
    return response;
  }

  async listEntities(type = null, limit = 25) {
    const query = `
      query ListEntities($type: String, $limit: Int) {
        entities(type: $type, limit: $limit) {
          id type props createdAt updatedAt
        }
      }
    `;
    const response = await this.executeQuery(query, { type, limit });
    return response.entities || [];
  }

  async createEntity(type, props) {
    const query = `
      mutation CreateEntity($input: EntityInput!) {
        createEntity(input: $input) {
          id type props createdAt
        }
      }
    `;
    const response = await this.executeQuery(query, { input: { type, props } });
    return response.createEntity;
  }

  async executeQuery(query, variables = null, authRequired = true) {
    try {
      const payload = { query };
      if (variables) payload.variables = variables;

      const config = { headers: { 'Content-Type': 'application/json' } };
      if (authRequired && this.token) {
        config.headers.Authorization = 'Bearer ' + this.token;
      }

      const response = await axios.post(this.graphqlUrl, payload, config);
      if (response.data.errors) {
        throw new Error('GraphQL Error: ' + JSON.stringify(response.data.errors));
      }
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SummitClient;
