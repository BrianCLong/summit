import request from 'supertest';
import express from 'express';
import { users, groups } from '../data';

const app = express();
app.use(express.json());

app.get('/Users', (req, res) => {
  res.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: users.length,
    Resources: users,
  });
});

app.get('/Groups', (req, res) => {
  res.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: groups.length,
    Resources: groups,
  });
});

describe('SCIM Service', () => {
  it('should return a list of users', async () => {
    const res = await request(app).get('/Users');
    expect(res.statusCode).toEqual(200);
    expect(res.body.totalResults).toEqual(users.length);
    expect(res.body.Resources[0].userName).toEqual('jules@example.com');
  });

  it('should return a list of groups', async () => {
    const res = await request(app).get('/Groups');
    expect(res.statusCode).toEqual(200);
    expect(res.body.totalResults).toEqual(groups.length);
    expect(res.body.Resources[0].displayName).toEqual('Admins');
  });
});
