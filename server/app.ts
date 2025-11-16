import express from 'express';
import { requireStepUp } from './middleware/stepup';
import { loadTenant } from './middleware/tenant'; // Added
import { rateLimit } from './middleware/ratelimit'; // Added

const app = express();

app.use(express.json());

app.use(loadTenant, rateLimit({ starter: 60, pro: 600, enterprise: 6000 })); // Added

/* eslint-disable no-undef */
// TODO: handler not yet implemented - example route showing stepup auth
app.post('/admin/delete-user', requireStepUp(2), handler);

app.listen(3000, () => {
  console.warn('Server listening on port 3000');
});
