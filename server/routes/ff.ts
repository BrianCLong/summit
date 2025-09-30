import { Router } from 'express';
export const ff = Router();
ff.get('/v1/ff', (_req,res)=> {
  res.json({
    FF_RAG: true,
    FF_COMPARE: true,
    FF_PRESENT: true,
    FF_INTEL: true
  });
});