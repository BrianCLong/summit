import crypto from 'node:crypto';

/**
 * Citizen Feedback and Deliberation Module
 *
 * Enables structured citizen engagement, deliberative democracy,
 * policy feedback, and participatory budgeting.
 */

export interface Proposal {
  proposalId: string;
  title: string;
  description: string;
  category: 'policy' | 'budget' | 'initiative' | 'feedback';
  authorId: string;
  status: 'draft' | 'open' | 'deliberation' | 'voting' | 'closed' | 'implemented';
  createdAt: string;
  closesAt: string;
  supportThreshold: number;
  currentSupport: number;
  tags: string[];
}

export interface Comment {
  commentId: string;
  proposalId: string;
  authorId: string;
  content: string;
  sentiment: 'support' | 'oppose' | 'neutral' | 'question';
  parentId: string | null;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  isModerated: boolean;
}

export interface DeliberationSession {
  sessionId: string;
  proposalId: string;
  participantIds: string[];
  startTime: string;
  duration: number;
  moderatorId: string;
  summary: string | null;
  consensusLevel: number;
  outcomes: string[];
}

export interface CitizenPreference {
  citizenId: string;
  proposalId: string;
  preference: 'strongly_support' | 'support' | 'neutral' | 'oppose' | 'strongly_oppose';
  reasoning: string;
  timestamp: string;
}

export interface BudgetAllocation {
  citizenId: string;
  allocations: Map<string, number>; // projectId -> amount
  totalBudget: number;
  submittedAt: string;
}

export class CitizenDeliberationPlatform {
  private proposals: Map<string, Proposal> = new Map();
  private comments: Map<string, Comment[]> = new Map();
  private preferences: Map<string, CitizenPreference[]> = new Map();
  private sessions: Map<string, DeliberationSession> = new Map();
  private budgetAllocations: Map<string, BudgetAllocation[]> = new Map();

  /**
   * Create a new proposal
   */
  createProposal(
    title: string,
    description: string,
    category: Proposal['category'],
    authorId: string,
    options: {
      closesAt: string;
      supportThreshold?: number;
      tags?: string[];
    }
  ): Proposal {
    const proposal: Proposal = {
      proposalId: crypto.randomUUID(),
      title,
      description,
      category,
      authorId,
      status: 'draft',
      createdAt: new Date().toISOString(),
      closesAt: options.closesAt,
      supportThreshold: options.supportThreshold || 100,
      currentSupport: 0,
      tags: options.tags || [],
    };

    this.proposals.set(proposal.proposalId, proposal);
    this.comments.set(proposal.proposalId, []);
    this.preferences.set(proposal.proposalId, []);

    return proposal;
  }

  /**
   * Submit feedback/comment on a proposal
   */
  addComment(
    proposalId: string,
    authorId: string,
    content: string,
    sentiment: Comment['sentiment'],
    parentId: string | null = null
  ): Comment {
    const comments = this.comments.get(proposalId);
    if (!comments) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    const comment: Comment = {
      commentId: crypto.randomUUID(),
      proposalId,
      authorId,
      content,
      sentiment,
      parentId,
      upvotes: 0,
      downvotes: 0,
      createdAt: new Date().toISOString(),
      isModerated: false,
    };

    comments.push(comment);
    return comment;
  }

  /**
   * Record citizen preference on a proposal
   */
  recordPreference(
    proposalId: string,
    citizenId: string,
    preference: CitizenPreference['preference'],
    reasoning: string
  ): CitizenPreference {
    const preferences = this.preferences.get(proposalId);
    const proposal = this.proposals.get(proposalId);

    if (!preferences || !proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    // Remove existing preference from this citizen
    const existingIndex = preferences.findIndex((p) => p.citizenId === citizenId);
    if (existingIndex !== -1) {
      preferences.splice(existingIndex, 1);
    }

    const pref: CitizenPreference = {
      citizenId,
      proposalId,
      preference,
      reasoning,
      timestamp: new Date().toISOString(),
    };

    preferences.push(pref);

    // Update support count
    const supportPreferences = ['strongly_support', 'support'];
    proposal.currentSupport = preferences.filter((p) =>
      supportPreferences.includes(p.preference)
    ).length;

    return pref;
  }

  /**
   * Start a deliberation session
   */
  startDeliberation(
    proposalId: string,
    participantIds: string[],
    moderatorId: string,
    duration: number
  ): DeliberationSession {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    const session: DeliberationSession = {
      sessionId: crypto.randomUUID(),
      proposalId,
      participantIds,
      startTime: new Date().toISOString(),
      duration,
      moderatorId,
      summary: null,
      consensusLevel: 0,
      outcomes: [],
    };

    proposal.status = 'deliberation';
    this.sessions.set(session.sessionId, session);

    return session;
  }

  /**
   * Complete deliberation with outcomes
   */
  completeDeliberation(
    sessionId: string,
    summary: string,
    outcomes: string[],
    consensusLevel: number
  ): DeliberationSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.summary = summary;
    session.outcomes = outcomes;
    session.consensusLevel = Math.min(100, Math.max(0, consensusLevel));

    return session;
  }

  /**
   * Participatory budgeting allocation
   */
  submitBudgetAllocation(
    citizenId: string,
    projectAllocations: Map<string, number>,
    totalBudget: number
  ): BudgetAllocation {
    // Validate total doesn't exceed budget
    const totalAllocated = Array.from(projectAllocations.values()).reduce((a, b) => a + b, 0);
    if (totalAllocated > totalBudget) {
      throw new Error('Allocation exceeds available budget');
    }

    const allocation: BudgetAllocation = {
      citizenId,
      allocations: projectAllocations,
      totalBudget,
      submittedAt: new Date().toISOString(),
    };

    // Store by some budget cycle ID (simplified)
    const cycleId = 'current';
    const existing = this.budgetAllocations.get(cycleId) || [];

    // Replace existing allocation from this citizen
    const idx = existing.findIndex((a) => a.citizenId === citizenId);
    if (idx !== -1) {
      existing[idx] = allocation;
    } else {
      existing.push(allocation);
    }

    this.budgetAllocations.set(cycleId, existing);
    return allocation;
  }

  /**
   * Aggregate participatory budget results
   */
  aggregateBudgetResults(cycleId: string = 'current'): Map<string, number> {
    const allocations = this.budgetAllocations.get(cycleId) || [];
    const totals = new Map<string, number>();

    for (const allocation of allocations) {
      for (const [projectId, amount] of allocation.allocations) {
        totals.set(projectId, (totals.get(projectId) || 0) + amount);
      }
    }

    return totals;
  }

  /**
   * Get proposal analytics
   */
  getProposalAnalytics(proposalId: string): {
    proposal: Proposal;
    commentCount: number;
    sentimentBreakdown: Record<string, number>;
    preferenceBreakdown: Record<string, number>;
    deliberationSessions: number;
    averageConsensus: number;
  } | null {
    const proposal = this.proposals.get(proposalId);
    const comments = this.comments.get(proposalId) || [];
    const preferences = this.preferences.get(proposalId) || [];

    if (!proposal) return null;

    const sentimentBreakdown: Record<string, number> = {
      support: 0,
      oppose: 0,
      neutral: 0,
      question: 0,
    };
    for (const comment of comments) {
      sentimentBreakdown[comment.sentiment]++;
    }

    const preferenceBreakdown: Record<string, number> = {
      strongly_support: 0,
      support: 0,
      neutral: 0,
      oppose: 0,
      strongly_oppose: 0,
    };
    for (const pref of preferences) {
      preferenceBreakdown[pref.preference]++;
    }

    const relatedSessions = Array.from(this.sessions.values()).filter(
      (s) => s.proposalId === proposalId
    );

    const averageConsensus =
      relatedSessions.length > 0
        ? relatedSessions.reduce((sum, s) => sum + s.consensusLevel, 0) /
          relatedSessions.length
        : 0;

    return {
      proposal,
      commentCount: comments.length,
      sentimentBreakdown,
      preferenceBreakdown,
      deliberationSessions: relatedSessions.length,
      averageConsensus,
    };
  }

  /**
   * Get all proposals by status
   */
  getProposalsByStatus(status: Proposal['status']): Proposal[] {
    return Array.from(this.proposals.values()).filter((p) => p.status === status);
  }

  /**
   * Transition proposal status
   */
  transitionProposal(proposalId: string, newStatus: Proposal['status']): Proposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    proposal.status = newStatus;
    return proposal;
  }
}

/**
 * AI-powered content moderation for citizen feedback
 */
export class ContentModerator {
  private readonly blocklist: Set<string>;
  private readonly flaggedPatterns: RegExp[];

  constructor() {
    this.blocklist = new Set(['spam', 'inappropriate']); // Simplified
    this.flaggedPatterns = [
      /\b(threat|violence)\b/i,
      /\b(personal.*info|doxx)\b/i,
    ];
  }

  /**
   * Check content for policy violations
   */
  moderate(content: string): {
    approved: boolean;
    flags: string[];
    confidence: number;
  } {
    const flags: string[] = [];
    let confidence = 1.0;

    // Check blocklist
    const words = content.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (this.blocklist.has(word)) {
        flags.push(`blocklist:${word}`);
        confidence *= 0.5;
      }
    }

    // Check patterns
    for (const pattern of this.flaggedPatterns) {
      if (pattern.test(content)) {
        flags.push(`pattern:${pattern.source}`);
        confidence *= 0.7;
      }
    }

    return {
      approved: flags.length === 0,
      flags,
      confidence,
    };
  }
}
