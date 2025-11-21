/**
 * Real-Time Screening Service
 *
 * High-performance watchlist screening with real-time matching,
 * risk scoring, alert management, and encounter processing.
 */

import express from 'express';
import { z } from 'zod';

// ============================================================================
// Types and Schemas
// ============================================================================

const WatchlistEntrySchema = z.object({
  id: z.string().uuid(),
  listId: z.string(),
  listName: z.string(),
  entityType: z.enum(['PERSON', 'ORGANIZATION', 'VESSEL', 'AIRCRAFT']),
  names: z.array(z.object({
    type: z.enum(['PRIMARY', 'ALIAS', 'AKA', 'FKA', 'NICKNAME']),
    fullName: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    script: z.string().optional(),
  })),
  identifiers: z.array(z.object({
    type: z.string(),
    value: z.string(),
    country: z.string().optional(),
  })).optional(),
  biometricIds: z.array(z.string()).optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.array(z.string()).optional(),
  riskScore: z.number().min(0).max(100),
  category: z.enum(['TERRORIST', 'SANCTIONS', 'PEP', 'CRIME', 'FRAUD', 'AML', 'CUSTOM']),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  addedAt: z.string(),
  expiresAt: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

type WatchlistEntry = z.infer<typeof WatchlistEntrySchema>;

interface ScreeningRequest {
  requestId: string;
  subject: {
    names: Array<{ fullName: string; type?: string }>;
    dateOfBirth?: string;
    nationality?: string[];
    identifiers?: Array<{ type: string; value: string }>;
    biometricTemplateId?: string;
  };
  options: {
    lists?: string[];
    threshold?: number;
    maxResults?: number;
    includeFuzzy?: boolean;
    biometricMatch?: boolean;
  };
}

interface ScreeningMatch {
  entryId: string;
  listId: string;
  listName: string;
  matchScore: number;
  matchType: 'EXACT' | 'FUZZY' | 'PARTIAL' | 'BIOMETRIC' | 'PHONETIC';
  matchedFields: string[];
  entry: WatchlistEntry;
  riskAssessment: {
    score: number;
    level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    factors: string[];
  };
}

interface ScreeningResult {
  requestId: string;
  status: 'CLEAR' | 'POTENTIAL_MATCH' | 'CONFIRMED_MATCH';
  processedAt: string;
  latencyMs: number;
  totalMatches: number;
  matches: ScreeningMatch[];
  recommendation: 'ALLOW' | 'REVIEW' | 'DENY' | 'ESCALATE';
}

interface Alert {
  alertId: string;
  screeningRequestId: string;
  matchId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  assignedTo?: string;
  notes: string[];
}

// ============================================================================
// Screening Engine
// ============================================================================

class ScreeningEngine {
  private watchlistIndex: Map<string, WatchlistEntry> = new Map();
  private nameIndex: Map<string, Set<string>> = new Map();
  private biometricIndex: Map<string, string> = new Map();

  /**
   * Index a watchlist entry for fast lookup
   */
  indexEntry(entry: WatchlistEntry): void {
    this.watchlistIndex.set(entry.id, entry);

    // Index all names
    for (const name of entry.names) {
      const normalized = this.normalizeName(name.fullName);
      const tokens = normalized.split(' ');

      for (const token of tokens) {
        if (!this.nameIndex.has(token)) {
          this.nameIndex.set(token, new Set());
        }
        this.nameIndex.get(token)!.add(entry.id);
      }

      // Index phonetic variants
      const phonetic = this.soundex(normalized);
      if (!this.nameIndex.has(phonetic)) {
        this.nameIndex.set(phonetic, new Set());
      }
      this.nameIndex.get(phonetic)!.add(entry.id);
    }

    // Index biometric references
    if (entry.biometricIds) {
      for (const bioId of entry.biometricIds) {
        this.biometricIndex.set(bioId, entry.id);
      }
    }
  }

  /**
   * Screen a subject against watchlists
   */
  async screen(request: ScreeningRequest): Promise<ScreeningResult> {
    const startTime = Date.now();
    const matches: ScreeningMatch[] = [];
    const candidateIds = new Set<string>();

    // Find candidates by name
    for (const name of request.subject.names) {
      const normalized = this.normalizeName(name.fullName);
      const tokens = normalized.split(' ');

      for (const token of tokens) {
        const ids = this.nameIndex.get(token);
        if (ids) {
          ids.forEach(id => candidateIds.add(id));
        }

        // Also check phonetic matches
        const phonetic = this.soundex(token);
        const phoneticIds = this.nameIndex.get(phonetic);
        if (phoneticIds) {
          phoneticIds.forEach(id => candidateIds.add(id));
        }
      }
    }

    // Score each candidate
    for (const candidateId of candidateIds) {
      const entry = this.watchlistIndex.get(candidateId);
      if (!entry) continue;

      // Filter by requested lists
      if (request.options.lists?.length && !request.options.lists.includes(entry.listId)) {
        continue;
      }

      const matchResult = this.scoreMatch(request.subject, entry);

      if (matchResult.score >= (request.options.threshold ?? 0.7)) {
        matches.push({
          entryId: entry.id,
          listId: entry.listId,
          listName: entry.listName,
          matchScore: matchResult.score,
          matchType: matchResult.type,
          matchedFields: matchResult.fields,
          entry,
          riskAssessment: this.assessRisk(entry, matchResult.score),
        });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Limit results
    const limitedMatches = matches.slice(0, request.options.maxResults ?? 10);

    // Determine overall status and recommendation
    const status = this.determineStatus(limitedMatches);
    const recommendation = this.determineRecommendation(limitedMatches);

    return {
      requestId: request.requestId,
      status,
      processedAt: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      totalMatches: matches.length,
      matches: limitedMatches,
      recommendation,
    };
  }

  /**
   * Score match between subject and entry
   */
  private scoreMatch(
    subject: ScreeningRequest['subject'],
    entry: WatchlistEntry
  ): { score: number; type: ScreeningMatch['matchType']; fields: string[] } {
    let totalScore = 0;
    let weights = 0;
    const matchedFields: string[] = [];
    let matchType: ScreeningMatch['matchType'] = 'FUZZY';

    // Name matching (weight: 50%)
    let bestNameScore = 0;
    for (const subjectName of subject.names) {
      for (const entryName of entry.names) {
        const score = this.stringMatchScore(
          this.normalizeName(subjectName.fullName),
          this.normalizeName(entryName.fullName)
        );
        if (score > bestNameScore) {
          bestNameScore = score;
          if (score === 1.0) matchType = 'EXACT';
          else if (score > 0.9) matchType = 'PARTIAL';
        }
      }
    }
    if (bestNameScore > 0) {
      matchedFields.push('name');
      totalScore += bestNameScore * 0.5;
      weights += 0.5;
    }

    // DOB matching (weight: 25%)
    if (subject.dateOfBirth && entry.dateOfBirth) {
      const dobScore = subject.dateOfBirth === entry.dateOfBirth ? 1.0 : 0;
      if (dobScore > 0) matchedFields.push('dateOfBirth');
      totalScore += dobScore * 0.25;
      weights += 0.25;
    }

    // Nationality matching (weight: 15%)
    if (subject.nationality?.length && entry.nationality?.length) {
      const hasMatch = subject.nationality.some(n => entry.nationality!.includes(n));
      const natScore = hasMatch ? 1.0 : 0;
      if (natScore > 0) matchedFields.push('nationality');
      totalScore += natScore * 0.15;
      weights += 0.15;
    }

    // Identifier matching (weight: 10%)
    if (subject.identifiers?.length && entry.identifiers?.length) {
      let idScore = 0;
      for (const subId of subject.identifiers) {
        for (const entId of entry.identifiers) {
          if (subId.type === entId.type && subId.value === entId.value) {
            idScore = 1.0;
            matchedFields.push(`identifier:${subId.type}`);
            break;
          }
        }
      }
      totalScore += idScore * 0.1;
      weights += 0.1;
    }

    return {
      score: weights > 0 ? totalScore / weights : 0,
      type: matchType,
      fields: matchedFields,
    };
  }

  /**
   * Normalize name for matching
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate string similarity (Jaro-Winkler)
   */
  private stringMatchScore(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    if (!s1.length || !s2.length) return 0;

    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, s2.length);

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0;

    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    const jaro = (matches / s1.length + matches / s2.length +
                  (matches - transpositions / 2) / matches) / 3;

    // Winkler prefix bonus
    let prefix = 0;
    for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    return jaro + prefix * 0.1 * (1 - jaro);
  }

  /**
   * Soundex phonetic encoding
   */
  private soundex(s: string): string {
    const a = s.toLowerCase().split('');
    const codes: Record<string, string> = {
      b: '1', f: '1', p: '1', v: '1',
      c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
      d: '3', t: '3',
      l: '4',
      m: '5', n: '5',
      r: '6'
    };

    const first = a.shift()?.toUpperCase() ?? '';
    const result = a
      .map(c => codes[c] ?? '')
      .filter((c, i, arr) => c && c !== arr[i - 1])
      .join('');

    return (first + result + '000').slice(0, 4);
  }

  /**
   * Assess risk based on match
   */
  private assessRisk(entry: WatchlistEntry, matchScore: number): ScreeningMatch['riskAssessment'] {
    const factors: string[] = [];
    let baseScore = entry.riskScore;

    // Adjust by match confidence
    baseScore *= matchScore;

    // Severity factors
    if (entry.severity === 'CRITICAL') {
      factors.push('Critical severity watchlist');
      baseScore = Math.min(100, baseScore * 1.5);
    } else if (entry.severity === 'HIGH') {
      factors.push('High severity watchlist');
      baseScore = Math.min(100, baseScore * 1.2);
    }

    // Category factors
    if (entry.category === 'TERRORIST') {
      factors.push('Terrorism-related');
      baseScore = Math.min(100, baseScore * 1.3);
    } else if (entry.category === 'SANCTIONS') {
      factors.push('Sanctions violation');
    }

    let level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    if (baseScore >= 80) level = 'CRITICAL';
    else if (baseScore >= 60) level = 'HIGH';
    else if (baseScore >= 40) level = 'MEDIUM';
    else level = 'LOW';

    return { score: Math.round(baseScore), level, factors };
  }

  /**
   * Determine overall screening status
   */
  private determineStatus(matches: ScreeningMatch[]): ScreeningResult['status'] {
    if (matches.length === 0) return 'CLEAR';

    const highConfidence = matches.some(m => m.matchScore >= 0.95);
    return highConfidence ? 'CONFIRMED_MATCH' : 'POTENTIAL_MATCH';
  }

  /**
   * Determine recommendation
   */
  private determineRecommendation(matches: ScreeningMatch[]): ScreeningResult['recommendation'] {
    if (matches.length === 0) return 'ALLOW';

    const criticalMatch = matches.some(m => m.riskAssessment.level === 'CRITICAL');
    if (criticalMatch) return 'DENY';

    const highMatch = matches.some(m => m.riskAssessment.level === 'HIGH');
    if (highMatch) return 'ESCALATE';

    return 'REVIEW';
  }
}

// ============================================================================
// Alert Manager
// ============================================================================

class AlertManager {
  private alerts: Map<string, Alert> = new Map();

  /**
   * Create alert from screening match
   */
  createAlert(screeningRequestId: string, match: ScreeningMatch): Alert {
    const alert: Alert = {
      alertId: crypto.randomUUID(),
      screeningRequestId,
      matchId: match.entryId,
      severity: match.riskAssessment.level,
      status: 'NEW',
      createdAt: new Date().toISOString(),
      notes: [],
    };

    this.alerts.set(alert.alertId, alert);
    return alert;
  }

  /**
   * Acknowledge alert
   */
  acknowledge(alertId: string, userId: string): Alert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedAt = new Date().toISOString();
    alert.assignedTo = userId;
    return alert;
  }

  /**
   * Resolve alert
   */
  resolve(alertId: string, resolution: 'RESOLVED' | 'FALSE_POSITIVE', note: string): Alert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.status = resolution;
    alert.resolvedAt = new Date().toISOString();
    alert.notes.push(`[${new Date().toISOString()}] ${note}`);
    return alert;
  }

  /**
   * Get alerts by status
   */
  getByStatus(status: Alert['status']): Alert[] {
    return Array.from(this.alerts.values()).filter(a => a.status === status);
  }

  /**
   * Get alert statistics
   */
  getStatistics(): {
    total: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    const alerts = Array.from(this.alerts.values());
    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const alert of alerts) {
      byStatus[alert.status] = (byStatus[alert.status] ?? 0) + 1;
      bySeverity[alert.severity] = (bySeverity[alert.severity] ?? 0) + 1;
    }

    return { total: alerts.length, byStatus, bySeverity };
  }
}

// ============================================================================
// Express Application
// ============================================================================

const app = express();
app.use(express.json());

const engine = new ScreeningEngine();
const alertManager = new AlertManager();

// Screen subject
app.post('/api/v1/screen', async (req, res) => {
  try {
    const request: ScreeningRequest = {
      requestId: crypto.randomUUID(),
      subject: req.body.subject,
      options: req.body.options ?? {},
    };

    const result = await engine.screen(request);

    // Create alerts for high-risk matches
    for (const match of result.matches) {
      if (match.riskAssessment.level === 'CRITICAL' || match.riskAssessment.level === 'HIGH') {
        alertManager.createAlert(result.requestId, match);
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Screening failed', message: (error as Error).message });
  }
});

// Batch screening
app.post('/api/v1/screen/batch', async (req, res) => {
  try {
    const subjects = req.body.subjects as ScreeningRequest['subject'][];
    const options = req.body.options ?? {};

    const results = await Promise.all(
      subjects.map(subject => engine.screen({
        requestId: crypto.randomUUID(),
        subject,
        options,
      }))
    );

    res.json({
      totalScreened: results.length,
      totalMatches: results.filter(r => r.status !== 'CLEAR').length,
      results,
    });
  } catch (error) {
    res.status(500).json({ error: 'Batch screening failed', message: (error as Error).message });
  }
});

// Alert endpoints
app.get('/api/v1/alerts', (req, res) => {
  const status = req.query.status as Alert['status'] | undefined;
  const alerts = status ? alertManager.getByStatus(status) : alertManager.getByStatus('NEW');
  res.json({ alerts, statistics: alertManager.getStatistics() });
});

app.post('/api/v1/alerts/:alertId/acknowledge', (req, res) => {
  const alert = alertManager.acknowledge(req.params.alertId, req.body.userId);
  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }
  res.json(alert);
});

app.post('/api/v1/alerts/:alertId/resolve', (req, res) => {
  const alert = alertManager.resolve(
    req.params.alertId,
    req.body.resolution,
    req.body.note
  );
  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }
  res.json(alert);
});

// Watchlist management
app.post('/api/v1/watchlist/entries', (req, res) => {
  try {
    const entry = WatchlistEntrySchema.parse({
      ...req.body,
      id: crypto.randomUUID(),
      addedAt: new Date().toISOString(),
    });
    engine.indexEntry(entry);
    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ error: 'Invalid entry', details: error });
  }
});

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT ?? 3003;

export { app, engine, alertManager, ScreeningEngine, AlertManager };
export type { ScreeningRequest, ScreeningResult, ScreeningMatch, Alert, WatchlistEntry };

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`Screening service running on port ${PORT}`);
  });
}
