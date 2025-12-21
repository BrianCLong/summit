import express from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();
router.use(ensureAuthenticated);


export default router;
