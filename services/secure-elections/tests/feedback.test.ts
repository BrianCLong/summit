import { describe, it, expect, beforeEach } from 'vitest';
import { CitizenDeliberationPlatform, ContentModerator } from '../src/feedback/citizen-deliberation.js';

describe('CitizenDeliberationPlatform', () => {
  let platform: CitizenDeliberationPlatform;

  beforeEach(() => {
    platform = new CitizenDeliberationPlatform();
  });

  describe('createProposal', () => {
    it('should create a proposal with all fields', () => {
      const proposal = platform.createProposal(
        'Build New Park',
        'Proposal to build a community park',
        'initiative',
        'citizen-1',
        { closesAt: '2025-12-31T23:59:59Z', tags: ['parks', 'community'] }
      );

      expect(proposal.proposalId).toBeDefined();
      expect(proposal.title).toBe('Build New Park');
      expect(proposal.category).toBe('initiative');
      expect(proposal.status).toBe('draft');
      expect(proposal.tags).toContain('parks');
    });
  });

  describe('addComment', () => {
    it('should add comment to proposal', () => {
      const proposal = platform.createProposal(
        'Test',
        'Description',
        'policy',
        'author-1',
        { closesAt: '2025-12-31T23:59:59Z' }
      );

      const comment = platform.addComment(
        proposal.proposalId,
        'citizen-2',
        'I support this!',
        'support'
      );

      expect(comment.commentId).toBeDefined();
      expect(comment.sentiment).toBe('support');
      expect(comment.proposalId).toBe(proposal.proposalId);
    });

    it('should support threaded comments', () => {
      const proposal = platform.createProposal(
        'Test',
        'Desc',
        'policy',
        'a1',
        { closesAt: '2025-12-31T23:59:59Z' }
      );

      const parent = platform.addComment(proposal.proposalId, 'c1', 'Parent', 'neutral');
      const reply = platform.addComment(proposal.proposalId, 'c2', 'Reply', 'support', parent.commentId);

      expect(reply.parentId).toBe(parent.commentId);
    });
  });

  describe('recordPreference', () => {
    it('should track citizen preferences', () => {
      const proposal = platform.createProposal(
        'Test',
        'Desc',
        'policy',
        'a1',
        { closesAt: '2025-12-31T23:59:59Z' }
      );

      platform.recordPreference(proposal.proposalId, 'citizen-1', 'support', 'Good idea');
      platform.recordPreference(proposal.proposalId, 'citizen-2', 'strongly_support', 'Great!');

      const analytics = platform.getProposalAnalytics(proposal.proposalId);

      expect(analytics!.preferenceBreakdown.support).toBe(1);
      expect(analytics!.preferenceBreakdown.strongly_support).toBe(1);
    });

    it('should replace existing preference from same citizen', () => {
      const proposal = platform.createProposal(
        'Test',
        'Desc',
        'policy',
        'a1',
        { closesAt: '2025-12-31T23:59:59Z' }
      );

      platform.recordPreference(proposal.proposalId, 'citizen-1', 'support', 'Maybe');
      platform.recordPreference(proposal.proposalId, 'citizen-1', 'oppose', 'Changed mind');

      const analytics = platform.getProposalAnalytics(proposal.proposalId);

      expect(analytics!.preferenceBreakdown.support).toBe(0);
      expect(analytics!.preferenceBreakdown.oppose).toBe(1);
    });
  });

  describe('startDeliberation', () => {
    it('should create deliberation session', () => {
      const proposal = platform.createProposal(
        'Test',
        'Desc',
        'policy',
        'a1',
        { closesAt: '2025-12-31T23:59:59Z' }
      );

      const session = platform.startDeliberation(
        proposal.proposalId,
        ['c1', 'c2', 'c3'],
        'mod-1',
        60
      );

      expect(session.sessionId).toBeDefined();
      expect(session.participantIds).toHaveLength(3);
      expect(session.moderatorId).toBe('mod-1');
    });
  });

  describe('submitBudgetAllocation', () => {
    it('should accept valid budget allocation', () => {
      const allocation = platform.submitBudgetAllocation(
        'citizen-1',
        new Map([['project-a', 5000], ['project-b', 3000]]),
        10000
      );

      expect(allocation.citizenId).toBe('citizen-1');
      expect(allocation.allocations.get('project-a')).toBe(5000);
    });

    it('should reject over-budget allocation', () => {
      expect(() =>
        platform.submitBudgetAllocation(
          'citizen-1',
          new Map([['project-a', 15000]]),
          10000
        )
      ).toThrow('Allocation exceeds available budget');
    });
  });

  describe('aggregateBudgetResults', () => {
    it('should aggregate multiple citizen allocations', () => {
      platform.submitBudgetAllocation('c1', new Map([['p1', 100], ['p2', 50]]), 200);
      platform.submitBudgetAllocation('c2', new Map([['p1', 80], ['p3', 70]]), 200);

      const results = platform.aggregateBudgetResults();

      expect(results.get('p1')).toBe(180);
      expect(results.get('p2')).toBe(50);
      expect(results.get('p3')).toBe(70);
    });
  });

  describe('getProposalsByStatus', () => {
    it('should filter proposals by status', () => {
      platform.createProposal('A', 'd', 'policy', 'a1', { closesAt: '2025-12-31T23:59:59Z' });
      platform.createProposal('B', 'd', 'policy', 'a2', { closesAt: '2025-12-31T23:59:59Z' });

      const drafts = platform.getProposalsByStatus('draft');

      expect(drafts).toHaveLength(2);
    });
  });
});

describe('ContentModerator', () => {
  let moderator: ContentModerator;

  beforeEach(() => {
    moderator = new ContentModerator();
  });

  it('should approve clean content', () => {
    const result = moderator.moderate('This is a great proposal for our community!');

    expect(result.approved).toBe(true);
    expect(result.flags).toHaveLength(0);
  });

  it('should flag content with blocklisted words', () => {
    const result = moderator.moderate('This is spam content');

    expect(result.approved).toBe(false);
    expect(result.flags.some((f) => f.includes('spam'))).toBe(true);
  });

  it('should flag threatening content', () => {
    const result = moderator.moderate('This contains a threat to someone');

    expect(result.approved).toBe(false);
    expect(result.flags.length).toBeGreaterThan(0);
  });
});
