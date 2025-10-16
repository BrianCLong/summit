// services/scheduler/scheduler-api.ts
import express from 'express';
import { admissionMiddleware } from './admission/admission-controller';

const app = express();
app.use(express.json());
app.post(
  '/api/conductor/v1/scheduler/enqueue',
  admissionMiddleware(),
  (req, res) => {
    // enqueue job with possibly mutated exploration_percent
    // ... existing logic
    res
      .status(202)
      .json({
        jobId: '...',
        exploration_percent: req.body.exploration_percent,
      });
  },
);
