import { GossipProtocol } from './GossipProtocol.js';
import { Proposal, SwarmMessage } from './types.js';
import logger from '../../utils/logger.js';
import { createHmac } from 'crypto';

// Simple BFT parameters
const QUORUM_PERCENTAGE = 0.67; // 2/3 majority
const SHARED_SECRET = process.env.SWARM_SECRET || 'dev-secret-key';

export class ConsensusEngine {
  private gossip: GossipProtocol;
  private nodeId: string;
  private proposals: Map<string, Proposal> = new Map();
  private peerCount: number = 3; // In a real system, this would be dynamic

  constructor(nodeId: string, gossip: GossipProtocol) {
    this.nodeId = nodeId;
    this.gossip = gossip;
  }

  async initialize() {
    this.gossip.on('swarm:consensus', (msg) => this.handleMessage(msg));
  }

  // Sign data
  private sign(data: string): string {
    return createHmac('sha256', SHARED_SECRET).update(data).digest('hex');
  }

  // Verify signature
  private verify(data: string, signature: string): boolean {
    const expected = this.sign(data);
    return expected === signature;
  }

  async propose(action: string, params: any): Promise<string> {
    const proposalId = `${this.nodeId}-${Date.now()}`;
    const proposal: Proposal = {
      id: proposalId,
      proposerId: this.nodeId,
      action,
      params,
      timestamp: Date.now(),
      votes: {},
      status: 'pending'
    };

    // Auto-vote for self
    proposal.votes[this.nodeId] = true;
    this.proposals.set(proposalId, proposal);

    // Sign the proposal ID as proof
    const signature = this.sign(JSON.stringify(proposal));

    await this.gossip.broadcast('swarm:consensus', {
      type: 'proposal',
      payload: proposal,
      signature
    });

    return proposalId;
  }

  private async handleMessage(msg: SwarmMessage) {
    // Basic BFT check: Verify signature of the message payload
    if (msg.signature) {
       const isValid = this.verify(JSON.stringify(msg.payload), msg.signature);
       if (!isValid) {
         logger.warn(`Invalid signature from ${msg.senderId}, ignoring.`);
         return;
       }
    } else {
        // In strict BFT mode, reject unsigned messages
        // For now, warn
        logger.warn(`Unsigned message from ${msg.senderId}`);
    }

    switch (msg.type) {
      case 'proposal':
        await this.handleProposal(msg.payload, msg.senderId);
        break;
      case 'vote':
        await this.handleVote(msg.payload);
        break;
      case 'decision':
        await this.handleDecision(msg.payload);
        break;
    }
  }

  private async handleProposal(proposal: Proposal, senderId: string) {
    // Store the proposal even if we are not the proposer
    if (this.proposals.has(proposal.id)) return;

    // Validate proposal content (e.g. check if action is allowed)
    // For now, accept all.

    // Create local copy to track state
    this.proposals.set(proposal.id, proposal);

    // Vote YES
    const votePayload = { proposalId: proposal.id, vote: true, voterId: this.nodeId };
    const signature = this.sign(JSON.stringify(votePayload));

    await this.gossip.broadcast('swarm:consensus', {
      type: 'vote',
      payload: votePayload,
      signature
    });
  }

  private async handleVote(payload: any) {
    const { proposalId, vote, voterId } = payload;
    const proposal = this.proposals.get(proposalId);

    // If we don't have the proposal, we can't process the vote yet.
    // In a real system, we might request it.
    if (!proposal) return;

    proposal.votes[voterId] = vote;

    // Check quorum
    // We count votes locally.
    const yesVotes = Object.values(proposal.votes).filter(v => v).length;
    const requiredVotes = Math.ceil(this.peerCount * QUORUM_PERCENTAGE);

    if (yesVotes >= requiredVotes && proposal.status === 'pending') {
      proposal.status = 'accepted';
      logger.info(`Proposal ${proposal.id} accepted via BFT consensus (${yesVotes}/${this.peerCount})`);

      // If we are the proposer, or maybe any node, we can broadcast a Commit/Decision message
      // to ensure everyone agrees it is accepted, even if they didn't see all votes.
      // Optimistically, if we see quorum, we accept.

      // Broadcast decision so others who might have missed votes know it passed
      const decisionPayload = { proposalId: proposal.id, status: 'accepted' };
      const signature = this.sign(JSON.stringify(decisionPayload));

      await this.gossip.broadcast('swarm:consensus', {
        type: 'decision',
        payload: decisionPayload,
        signature
      });

      // Execute action here...
    }
  }

  private async handleDecision(payload: any) {
      const { proposalId, status } = payload;
      const proposal = this.proposals.get(proposalId);
      if (proposal && proposal.status !== status) {
          proposal.status = status;
          logger.info(`Proposal ${proposalId} updated to ${status} via Decision message`);
      }
  }

  getProposalStatus(proposalId: string): string | undefined {
    return this.proposals.get(proposalId)?.status;
  }

  // For testing
  setPeerCount(count: number) {
      this.peerCount = count;
  }
}
