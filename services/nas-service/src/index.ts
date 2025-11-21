import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { NASSearcher, HardwareAwareNAS } from '@intelgraph/nas';

const app: Express = express();
const PORT = process.env.NAS_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const searches: Map<string, { searcher: NASSearcher; status: string; result?: any }> = new Map();

/**
 * Health check
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'nas-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Start architecture search
 */
app.post('/api/v1/nas/search', async (req: Request, res: Response) => {
  try {
    const { searchSpace, method = 'evolutionary', maxIterations = 100, hardwareAware } = req.body;

    const searchId = `search_${Date.now()}`;
    let searcher: NASSearcher;

    if (hardwareAware) {
      searcher = new HardwareAwareNAS(
        searchSpace,
        hardwareAware.targetDevice,
        hardwareAware.latencyConstraint
      );
    } else {
      searcher = new NASSearcher(searchSpace, method);
    }

    searches.set(searchId, { searcher, status: 'running' });

    // Start search asynchronously
    searcher.search(maxIterations).then(result => {
      const search = searches.get(searchId);
      if (search) {
        search.status = 'completed';
        search.result = result;
      }
    }).catch(error => {
      const search = searches.get(searchId);
      if (search) {
        search.status = 'failed';
        search.result = { error: error.message };
      }
    });

    res.status(201).json({
      success: true,
      data: { searchId, status: 'running' },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get search status
 */
app.get('/api/v1/nas/search/:searchId', (req: Request, res: Response) => {
  try {
    const { searchId } = req.params;
    const search = searches.get(searchId);

    if (!search) {
      res.status(404).json({
        success: false,
        error: 'Search not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        searchId,
        status: search.status,
        result: search.result,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * List all searches
 */
app.get('/api/v1/nas/search', (_req: Request, res: Response) => {
  try {
    const allSearches = Array.from(searches.entries()).map(([id, search]) => ({
      searchId: id,
      status: search.status,
      hasResult: !!search.result,
    }));

    res.json({
      success: true,
      data: allSearches,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`NAS Service running on port ${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
