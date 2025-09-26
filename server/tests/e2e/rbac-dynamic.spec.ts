import { test, expect, request as playwrightRequest } from '@playwright/test';

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_URL || 'http://localhost:4000/graphql';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function graphqlRequest<T>(
  request: playwrightRequest.APIRequestContext,
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
): Promise<GraphQLResponse<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await request.post(GRAPHQL_ENDPOINT, {
    data: { query, variables },
    headers,
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as GraphQLResponse<T>;
  return body;
}

function hasGraphQLError(result: GraphQLResponse<unknown>, substring: string): boolean {
  return Boolean(result.errors?.some((error) => error.message.includes(substring)));
}

test.describe('Dynamic RBAC configuration', () => {
  test('admin can grant permissions dynamically via GraphQL', async ({ request }) => {
    const timestamp = Date.now();
    const adminEmail = `rbac-admin-${timestamp}@example.com`;
    const viewerEmail = `rbac-viewer-${timestamp}@example.com`;
    const password = 'StrongPassw0rd!';
    const tenantId = `tenant-rbac-${timestamp}`;

    // Register admin user with wildcard access
    const registerAdminMutation = `
      mutation RegisterAdmin($input: RegisterInput!) {
        register(input: $input) {
          token
          user {
            id
            email
            role
            permissions
          }
        }
      }
    `;
    const adminRegister = await graphqlRequest<{ register: { token: string } }>(request, registerAdminMutation, {
      input: {
        email: adminEmail,
        password,
        firstName: 'RBAC',
        lastName: 'Admin',
        role: 'ADMIN',
      },
    });
    expect(adminRegister.errors).toBeUndefined();
    const adminToken = adminRegister.data?.register.token;
    expect(adminToken).toBeTruthy();

    // Fetch permission ID for createInvestigation
    const permissionsQuery = `
      query RBACPermissions {
        rbacPermissions {
          id
          name
        }
      }
    `;
    const permissionsResult = await graphqlRequest<{ rbacPermissions: Array<{ id: string; name: string }> }>(
      request,
      permissionsQuery,
      {},
      adminToken,
    );
    expect(permissionsResult.errors).toBeUndefined();
    const createInvestigationPermission = permissionsResult.data?.rbacPermissions.find(
      (permission) => permission.name === 'mutation.createInvestigation',
    );
    expect(createInvestigationPermission).toBeTruthy();

    // Create a temporary role with explicit permission
    const createRoleMutation = `
      mutation CreateRole($input: RbacRoleInput!) {
        createRbacRole(input: $input) {
          id
          name
          permissions {
            name
          }
        }
      }
    `;
    const roleResult = await graphqlRequest<{ createRbacRole: { id: string } }>(
      request,
      createRoleMutation,
      {
        input: {
          name: `TEMP_INVESTIGATOR_${timestamp}`,
          description: 'Temporary investigator role for testing',
          permissionIds: [createInvestigationPermission!.id],
        },
      },
      adminToken,
    );
    expect(roleResult.errors).toBeUndefined();
    const roleId = roleResult.data?.createRbacRole.id;
    expect(roleId).toBeTruthy();

    // Register viewer user without permissions
    const viewerRegister = await graphqlRequest<{ register: { token: string; user: { id: string } } }>(
      request,
      registerAdminMutation,
      {
        input: {
          email: viewerEmail,
          password,
          firstName: 'RBAC',
          lastName: 'Viewer',
          role: 'VIEWER',
        },
      },
    );
    expect(viewerRegister.errors).toBeUndefined();
    const viewerToken = viewerRegister.data?.register.token;
    const viewerId = viewerRegister.data?.register.user.id;
    expect(viewerToken).toBeTruthy();
    expect(viewerId).toBeTruthy();

    // Viewer attempts to create an investigation (should be denied)
    const createInvestigationMutation = `
      mutation CreateInvestigation($input: InvestigationInput!) {
        createInvestigation(input: $input) {
          id
          name
        }
      }
    `;
    const deniedResult = await graphqlRequest(request, createInvestigationMutation, {
      input: {
        tenantId,
        name: 'RBAC Test Investigation - Denied',
      },
    }, viewerToken);
    expect(deniedResult.data?.createInvestigation).toBeUndefined();
    expect(hasGraphQLError(deniedResult, 'Access denied')).toBeTruthy();

    // Assign new role to viewer
    const assignRoleMutation = `
      mutation AssignRole($roleId: ID!, $userId: ID!) {
        assignRoleToUser(roleId: $roleId, userId: $userId) {
          userId
          assignedAt
        }
      }
    `;
    const assignmentResult = await graphqlRequest(request, assignRoleMutation, { roleId, userId: viewerId }, adminToken);
    expect(assignmentResult.errors).toBeUndefined();
    expect(assignmentResult.data?.assignRoleToUser.userId).toBe(viewerId);

    // Viewer retries and should now succeed immediately
    const allowedResult = await graphqlRequest<{ createInvestigation: { id: string } }>(
      request,
      createInvestigationMutation,
      {
        input: {
          tenantId,
          name: 'RBAC Test Investigation - Allowed',
        },
      },
      viewerToken,
    );
    expect(allowedResult.errors).toBeUndefined();
    expect(allowedResult.data?.createInvestigation.id).toBeTruthy();
  });
});
