import express from 'express';
import { AddressInfo } from 'net';
import { Server } from 'http';

interface ScimState {
  [userId: string]: string[];
}

export interface ScimTestServer {
  server: Server;
  baseUrl: string;
  setGroups: (userId: string, groups: string[]) => void;
}

export async function startScimServer(
  initialState: ScimState,
  expectedToken: string,
): Promise<ScimTestServer> {
  const state: ScimState = { ...initialState };
  const app = express();

  app.get('/scim/v2/Groups', (req, res) => {
    if (req.headers.authorization !== `Bearer ${expectedToken}`) {
      return res.status(401).json({ detail: 'unauthorized' });
    }
    const filter = String(req.query.filter || '');
    const match = filter.match(/members\.value eq "([^"]+)"/);
    const userId = match ? match[1] : '';
    const groups = state[userId] || [];
    res.json({
      Resources: groups.map((group, index) => ({
        id: `${index + 1}`,
        displayName: group,
      })),
    });
  });

  const server = await new Promise<Server>((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
  const port = (server.address() as AddressInfo).port;
  return {
    server,
    baseUrl: `http://localhost:${port}`,
    setGroups(userId: string, groups: string[]) {
      state[userId] = groups;
    },
  };
}
