/**
 * Briefing generation API routes
 */

import { Router } from 'express';
import { BriefingGenerator } from '@summit/briefing-generation';

const router = Router();

/**
 * POST /api/briefings/generate
 * Generate a new briefing
 */
router.post('/generate', (req, res) => {
  try {
    const briefing = new BriefingGenerator();
    briefing.createBriefing(req.body.options);

    // Add slides from request
    if (req.body.slides) {
      for (const slide of req.body.slides) {
        if (slide.type === 'CONTENT') {
          briefing.addContentSlide(slide.title, slide.content, slide.bullets);
        } else if (slide.type === 'CHART') {
          briefing.addChartSlide(slide.title, slide.chartData);
        } else if (slide.type === 'TIMELINE') {
          briefing.addTimelineSlide(slide.title, slide.events);
        } else if (slide.type === 'NETWORK') {
          briefing.addNetworkSlide(slide.title, slide.nodes, slide.edges);
        }
      }
    }

    const slides = briefing.getSlides();
    const metadata = briefing.exportMetadata();

    res.json({
      success: true,
      slides,
      metadata
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as briefingRoutes };
