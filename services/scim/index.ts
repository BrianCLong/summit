import express from 'express';

const app = express();
app.use(express.json());

import { users, groups } from './data';

// SCIM 2.0 User Endpoint (read-only)
app.get('/Users', (req, res) => {
  console.log('Fetching users for SCIM');
  res.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: users.length,
    Resources: users,
  });
});

// SCIM 2.0 Group Endpoint (read-only)
app.get('/Groups', (req, res) => {
  console.log('Fetching groups for SCIM');
  res.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: groups.length,
    Resources: groups,
  });
});

export function run() {
  const port = process.env.SCIM_PORT || 3003;
  app.listen(port, () => {
    console.log(`SCIM service running on port ${port}`);
  });
}

run();
