"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const depthLimit_js_1 = require("../src/graphql/validation/depthLimit.js");
const graphql_1 = require("graphql");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('GraphQL Depth Limit Validation', () => {
    const schema = (0, graphql_1.buildSchema)(`
    type Query {
      user: User
    }
    
    type User {
      id: ID!
      name: String!
      friends: [User!]!
      posts: [Post!]!
    }
    
    type Post {
      id: ID!
      title: String!
      author: User!
      comments: [Comment!]!
    }
    
    type Comment {
      id: ID!
      content: String!
      author: User!
      post: Post!
    }
  `);
    (0, globals_1.test)('should allow queries within depth limit', () => {
        const validQuery = (0, graphql_1.parse)(`
      query {
        user {
          id
          name
          friends {
            id
            name
            posts {
              id
              title
            }
          }
        }
      }
    `);
        const errors = (0, graphql_1.validate)(schema, validQuery, [(0, depthLimit_js_1.depthLimit)(8)]);
        (0, globals_1.expect)(errors).toHaveLength(0);
    });
    (0, globals_1.test)('should reject queries exceeding depth limit', () => {
        const deepQuery = (0, graphql_1.parse)(`
      query {
        user {
          friends {
            friends {
              friends {
                friends {
                  friends {
                    friends {
                      friends {
                        friends {
                          friends {
                            id
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);
        const errors = (0, graphql_1.validate)(schema, deepQuery, [(0, depthLimit_js_1.depthLimit)(8)]);
        (0, globals_1.expect)(errors.length).toBeGreaterThan(0);
        (0, globals_1.expect)(errors[0].message).toContain('Query is too deep');
        (0, globals_1.expect)(errors[0].message).toContain('depth');
        (0, globals_1.expect)(errors[0].message).toContain('> 8');
    });
    (0, globals_1.test)('should include operation name in error message', () => {
        const deepQueryWithName = (0, graphql_1.parse)(`
      query DeepUserQuery {
        user {
          friends {
            friends {
              friends {
                friends {
                  friends {
                    friends {
                      friends {
                        friends {
                          friends {
                            id
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);
        const errors = (0, graphql_1.validate)(schema, deepQueryWithName, [(0, depthLimit_js_1.depthLimit)(8)]);
        (0, globals_1.expect)(errors.length).toBeGreaterThan(0);
        (0, globals_1.expect)(errors[0].message).toContain('DeepUserQuery');
    });
    (0, globals_1.test)('should handle custom depth limits', () => {
        const moderateQuery = (0, graphql_1.parse)(`
      query {
        user {
          friends {
            friends {
              friends {
                id
              }
            }
          }
        }
      }
    `);
        // Should pass with depth limit 5
        const errorsWithLimit5 = (0, graphql_1.validate)(schema, moderateQuery, [(0, depthLimit_js_1.depthLimit)(5)]);
        (0, globals_1.expect)(errorsWithLimit5).toHaveLength(0);
        // Should fail with depth limit 3
        const errorsWithLimit3 = (0, graphql_1.validate)(schema, moderateQuery, [(0, depthLimit_js_1.depthLimit)(3)]);
        (0, globals_1.expect)(errorsWithLimit3.length).toBeGreaterThan(0);
    });
});
