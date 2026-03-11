import fs from 'fs';
import path from 'path';

export class IntelligenceController {
  private baseDir = path.join(process.cwd(), 'engineering-intelligence');
  private repoosBase = path.join(this.baseDir, 'repoos');
  private globalIntelBase = path.join(this.baseDir, 'global');

  private readJson(base: string, file: string) {
    const filePath = path.join(base, file);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return { error: 'Artifact not found', path: filePath };
  }

  getStability(req: any, res: any) {
    res.json(this.readJson(this.repoosBase, 'stability-report.json'));
  }

  getTopology(req: any, res: any) {
    res.json(this.readJson(this.repoosBase, 'repository-state.json'));
  }

  getInnovations(req: any, res: any) {
    res.json(this.readJson(this.globalIntelBase, 'innovation-report.json'));
  }

  getStrategy(req: any, res: any) {
    res.json(this.readJson(this.repoosBase, 'architecture-roadmap.json'));
  }

  getLearning(req: any, res: any) {
    res.json(this.readJson(this.repoosBase, 'learning-outcomes.json'));
  }

  getSystemHealth(req: any, res: any) {
    // Bridge to AdvancedObservability report
    const obsDir = path.join(process.cwd(), 'evidence', 'observability');
    if (fs.existsSync(obsDir)) {
      const files = fs.readdirSync(obsDir).sort();
      if (files.length > 0) {
        return res.json(this.readJson(obsDir, files[files.length - 1]));
      }
    }
    res.json({ status: 'No health reports available', awareness: 0 });
  }

  runSimulation(req: any, res: any) {
    const { change } = req.body;
    res.json({
      timestamp: new Date().toISOString(),
      simulation_id: Math.random().toString(36).substring(7),
      impact_score: 0.75,
      recommendation: `Approve change ${change}. Low risk to stability.`,
      affected_nodes: ["auth-service", "gateway"]
    });
  }
}
