/**
 * GitHub GraphQL Client
 * Provides authenticated access to GitHub's GraphQL API with rate limiting and error handling
 */

import { graphql } from '@octokit/graphql';

class GitHubGraphQLClient {
  constructor(token) {
    this.token = token;
    this.graphql = graphql;
  }

  async query(query, variables = {}) {
    try {
      const result = await this.graphql(query, {
        headers: {
          authorization: `Bearer ${this.token}`,
        },
        ...variables,
      });
      
      return result;
    } catch (error) {
      // Handle rate limiting or other errors
      if (error.status === 403 && error.message.includes('rate limit')) {
        console.warn(`Rate limit hit, implementing backoff: ${error.message}`);
        await this.implementBackoff();
        return this.query(query, variables); // Retry
      }
      
      throw error;
    }
  }

  async implementBackoff() {
    // Implement exponential backoff
    const delay = Math.min(30000, 1000 * Math.pow(2, Math.random() * 3));
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Get project by owner and number
   */
  async getProject(owner, number) {
    const query = `
      query GetProject($owner: String!, $number: Int!) {
        repositoryOwner(login: $owner) {
          projectV2(number: $number) {
            id
            title
            number
            items(first: 100) {
              nodes {
                id
                content {
                  ... on Issue { 
                    id
                    number
                    title
                    url
                    labels(first: 10) {
                      nodes { name }
                    }
                  }
                  ... on PullRequest { 
                    id
                    number
                    title
                    url
                    labels(first: 10) {
                      nodes { name }
                    }
                  }
                }
                fieldValues(first: 50) {
                  nodes {
                    ... on ProjectV2ItemFieldTextValue {
                      text
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                          id
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                          id
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldNumberValue {
                      number
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                          id
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldDateValue {
                      date
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                          id
                        }
                      }
                    }
                  }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
            fields(first: 50) {
              nodes {
                ... on ProjectV2FieldCommon {
                  id
                  name
                  dataType
                }
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options { id name }
                }
                ... on ProjectV2IterationField {
                  id
                  name
                  configuration { 
                    iterations { title startDate endDate }
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    return this.query(query, { owner, number });
  }

  /**
   * Update a project item's field value
   */
  async updateProjectItemField(projectId, itemId, fieldId, value, valueType = 'text') {
    let fieldValueInput;
    
    switch (valueType) {
      case 'singleSelect':
        fieldValueInput = { singleSelectOptionId: value };
        break;
      case 'text':
        fieldValueInput = { text: String(value) };
        break;
      case 'number':
        fieldValueInput = { number: Number(value) };
        break;
      case 'date':
        fieldValueInput = { date: String(value) }; // Format should be YYYY-MM-DD
        break;
      case 'checkbox':
        fieldValueInput = { checked: Boolean(value) };
        break;
      default:
        throw new Error(`Unsupported value type: ${valueType}`);
    }

    const mutation = `
      mutation UpdateProjectV2ItemFieldValue($input: UpdateProjectV2ItemFieldValueInput!) {
        updateProjectV2ItemFieldValue(input: $input) {
          projectV2Item { id }
        }
      }
    `;

    const variables = {
      input: {
        projectId,
        itemId,
        fieldId,
        value: fieldValueInput
      }
    };

    return this.query(mutation, variables);
  }
}

export default GitHubGraphQLClient;