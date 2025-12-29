export const users = [
  {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: '1',
    userName: 'jules@example.com',
    name: {
      givenName: 'Jules',
      familyName: 'Verne',
    },
    emails: [{ primary: true, value: 'jules@example.com' }],
    active: true,
  },
];

export const groups = [
  {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id: '1',
    displayName: 'Admins',
    members: [{ value: '1', display: 'Jules Verne' }],
  },
];
