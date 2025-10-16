import { depthLimit } from '../src/graphql/validation/depthLimit';
import { validate, buildSchema, parse } from 'graphql';

describe('GraphQL Depth Limit Validation', () => {
  const schema = buildSchema(`
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

  test('should allow queries within depth limit', () => {
    const validQuery = parse(`
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

    const errors = validate(schema, validQuery, [depthLimit(8)]);
    expect(errors).toHaveLength(0);
  });

  test('should reject queries exceeding depth limit', () => {
    const deepQuery = parse(`
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

    const errors = validate(schema, deepQuery, [depthLimit(8)]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('Query is too deep');
    expect(errors[0].message).toContain('depth');
    expect(errors[0].message).toContain('> 8');
  });

  test('should include operation name in error message', () => {
    const deepQueryWithName = parse(`
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

    const errors = validate(schema, deepQueryWithName, [depthLimit(8)]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain('DeepUserQuery');
  });

  test('should handle custom depth limits', () => {
    const moderateQuery = parse(`
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
    const errorsWithLimit5 = validate(schema, moderateQuery, [depthLimit(5)]);
    expect(errorsWithLimit5).toHaveLength(0);

    // Should fail with depth limit 3
    const errorsWithLimit3 = validate(schema, moderateQuery, [depthLimit(3)]);
    expect(errorsWithLimit3.length).toBeGreaterThan(0);
  });
});
