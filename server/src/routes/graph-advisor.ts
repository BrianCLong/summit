import express from 'express';
import GraphIndexAdvisorService from '../services/GraphIndexAdvisorService.js';

const router = express.Router();

// Get index recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const advisor = GraphIndexAdvisorService.getInstance();
    const recommendations = await advisor.getRecommendations();
    const stats = advisor.getStats();

    res.json({
      data: recommendations,
      meta: stats
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

export default router;
