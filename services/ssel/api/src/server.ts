import express from 'express';
import { execHandler } from './handlers/exec.js';
import { getArtifactHandler, putArtifactHandler } from './handlers/artifact.js';
import { exposeServiceHandler } from './handlers/service.js';
import { streamEventsHandler } from './handlers/stream.js';
import { getAttestationHandler } from './handlers/attestation.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post('/exec', execHandler);
app.get('/artifacts/:path', getArtifactHandler);
app.put('/artifacts/:path', putArtifactHandler);
app.post('/service', exposeServiceHandler);
app.get('/stream', streamEventsHandler);
app.get('/attestation', getAttestationHandler);

export const server = app.listen(port, () => {
  console.log(`SSEL listening at http://localhost:${port}`);
});
