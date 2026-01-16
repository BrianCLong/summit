/**
 * GitHub GraphQL Client Library
 * Provides authenticated access to GitHub's GraphQL API with retry and rate limiting
 */

import { Octokit } from '@octokit/graphql';

class GitHubGraphQLClient {
  constructor(token) {
    this.token = token;
  }

  /**
   * Execute a GraphQL query with retry logic
   */
  async query(query, variables = {}) {
    try {
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables })
      });

      const result = await response.json();

      if (!response.ok || result.errors) {
        const errorMsg = result.errors ? result.errors.map(e => e.message).join('; ') : `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      return result;
    } catch (error) {
      // Handle common error cases
      if (error.message && error.message.includes('401')) {
        throw new Error('Unauthorized: Check your GITHUB_TOKEN');
      } else if (error.message && (error.message.includes('403') || error.message.includes('rate limit'))) {
        // Rate limiting
        console.warn(`Rate limit hit, waiting before retry: ${error.message}`);
        await this.sleep(5000); // Wait 5 seconds before retry
        return this.query(query, variables);
      } else {
        throw error;
      }
    }
  }

  /**
   * Sleep utility function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get a single project by owner and number
   */
  async getProject(owner, number) {
    const query = `
      query GetProject($owner: String!, $number: Int!) {
        organization(login: $owner) {
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
                    labels(first: 50) {
                      nodes { name }
                    }
                    assignees(first: 10) {
                      nodes { login }
                    }
                  }
                  ... on PullRequest { 
                    id
                    number 
                    title 
                    url
                    labels(first: 50) {
                      nodes { name }
                    }
                    assignees(first: 10) {
                      nodes { login }
                    }
                  }
                  ... on DraftIssue {
                    title
                    assignees(first: 10) {
                      nodes { login }
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
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2SingleSelectField {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldNumberValue {
                      number
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldDateValue {
                      date
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldIterationValue {
                      title
                      field {
                        ... on ProjectV2IterationField {
                          name
                        }
                      }
                    }
                  }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
            fields(first: 100) {
              nodes {
                ... on ProjectV2FieldCommon {
                  id
                  name
                  dataType
                }
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  dataType
                  options {
                    id
                    name
                  }
                }
                ... on ProjectV2MultipleSelectField {
                  id
                  name
                  dataType
                  options {
                    id
                    name
                  }
                }
                ... on ProjectV2IterationField {
                  id
                  name
                  configuration {
                    iterations {
                      title
                      startDate
                      duration
                    }
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
   * Get project items with pagination
   */
  async getProjectItems(projectId, limit = 100) {
    let allItems = [];
    let hasNextPage = true;
    let after = null;

    while (hasNextPage && allItems.length < limit) {
      const query = `
        query GetProjectItems($projectId: ID!, $first: Int!, $after: String) {
          node(id: $projectId) {
            ... on ProjectV2 {
              items(first: $first, after: $after) {
                nodes {
                  id
                  content {
                    ... on Issue { 
                      id
                      number 
                      title 
                      url
                      labels(first: 50) {
                        nodes { name }
                      }
                      assignees(first: 10) {
                        nodes { login }
                      }
                    }
                    ... on PullRequest { 
                      id
                      number 
                      title 
                      url
                      labels(first: 50) {
                        nodes { name }
                      }
                      assignees(first: 10) {
                        nodes { login }
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
                          ... on ProjectV2SingleSelectField {
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
                      ... on ProjectV2ItemFieldIterationValue {
                        title
                        field {
                          ... on ProjectV2IterationField {
                            name
                            id
                          }
                        }
                      }
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        }
      `;

      const result = await this.query(query, { 
        projectId,
        first: Math.min(100, limit - allItems.length), 
        after 
      });

      const nodes = result.node.items.nodes;
      allItems = allItems.concat(nodes);
      hasNextPage = result.node.items.pageInfo.hasNextPage;
      after = result.node.items.pageInfo.endCursor;
    }

    return allItems;
  }

  /**
   * Update a project item field value
   */
  async updateProjectItemField(projectId, itemId, fieldId, value) {
    const mutation = `
      mutation UpdateProjectItemField($input: UpdateProjectV2ItemFieldValueInput!) {
        updateProjectV2ItemFieldValue(input: $input) {
          projectV2Item { id }
        }
      }
    `;

    // Determine the appropriate value type based on the value
    let fieldValueInput;
    if (typeof value === 'string') {
      // Try to see if this is an option ID or just text
      fieldValueInput = { text: value };
    } else if (typeof value === 'number') {
      fieldValueInput = { number: value };
    } else if (value === true || value === false) {
      fieldValueInput = { checked: value };
    } else if (typeof value === 'object' && value.singleSelectOptionId) {
      fieldValueInput = { singleSelectOptionId: value.singleSelectOptionId };
    } else {
      fieldValueInput = { text: JSON.stringify(value) };
    }

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