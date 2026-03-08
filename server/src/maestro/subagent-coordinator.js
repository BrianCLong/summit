"use strict";
// @ts-nocheck
/**
 * Enhanced Subagent Coordination Framework
 *
 * This module provides advanced coordination mechanisms for multiple AI agents working
 * together within the Summit platform. Unlike basic agent registries, this framework
 * focuses on:
 *
 * 1. Task decomposition and assignment
 * 2. Inter-agent communication
 * 3. Collaborative reasoning and consensus
 * 4. Conflict resolution
 * 5. Resource sharing
 * 6. Governance-aware coordination
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subagentCoordinator = exports.SubagentCoordinator = exports.agentGovernance = void 0;
const ledger_js_1 = require("../provenance/ledger.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
var governance_service_js_1 = require("./governance-service.js");
Object.defineProperty(exports, "agentGovernance", { enumerable: true, get: function () { return governance_service_js_1.agentGovernance; } });
class SubagentCoordinator {
    static instance;
    tasks = new Map();
    channels = new Map();
    activeProposals = new Map();
    metrics = new Map();
    ledger;
    agentStatusCallbacks = new Map();
    constructor() {
        this.ledger = ledger_js_1.ProvenanceLedgerV2.getInstance();
    }
    static getInstance() {
        if (!SubagentCoordinator.instance) {
            SubagentCoordinator.instance = new SubagentCoordinator();
        }
        return SubagentCoordinator.instance;
    }
    /**
     * Create a new coordination channel for agents to collaborate
     */
    async createChannel(topic, participants, metadata) {
        const channelId = `channel-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const channel = {
            id: channelId,
            participants,
            topic,
            messages: [],
            createdAt: new Date(),
            isActive: true
        };
        this.channels.set(channelId, channel);
        // Log to provenance ledger
        await this.ledger.appendEntry({
            tenantId: 'system',
            actionType: 'CHANNEL_CREATED',
            resourceType: 'CoordinationChannel',
            resourceId: channelId,
            actorId: 'coordinator',
            actorType: 'system',
            timestamp: new Date(),
            payload: {
                mutationType: 'CREATE',
                entityId: channelId,
                entityType: 'CoordinationChannel',
                topic,
                participants,
                metadata
            },
            metadata: {
                topic,
                participants: participants.length,
                createdChannel: true
            }
        });
        logger_js_1.default.info({
            channelId,
            participants: participants.length,
            topic
        }, 'Coordination channel created');
        return channel;
    }
    /**
     * Assign a task to specific agents with workload balancing
     */
    async assignTask(task, agentIds) {
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const coordinationTask = {
            ...task,
            id: taskId,
            assignedAgentIds: agentIds,
            status: 'delegated',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.tasks.set(taskId, coordinationTask);
        logger_js_1.default.info({
            taskId,
            agentsAssigned: agentIds.length,
            title: task.title
        }, 'Task assigned to agents for coordination');
        // Log to provenance ledger
        await this.ledger.appendEntry({
            tenantId: 'system',
            actionType: 'TASK_ASSIGNED',
            resourceType: 'CoordinationTask',
            resourceId: taskId,
            actorId: 'coordinator',
            actorType: 'system',
            timestamp: new Date(),
            payload: {
                mutationType: 'CREATE',
                entityId: taskId,
                entityType: 'CoordinationTask',
                title: task.title,
                description: task.description,
                assignedAgentIds: agentIds,
                priority: task.priority,
                payload: task.payload
            },
            metadata: {
                assignedAgentCount: agentIds.length,
                priority: task.priority,
                topic: task.title
            }
        });
        return coordinationTask;
    }
    /**
     * Submit a proposal for consensus among agents
     */
    async submitConsensusProposal(coordinatorId, topic, proposal, voterAgentIds, deadlineHours = 24) {
        const proposalId = `proposal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const consensusProposal = {
            id: proposalId,
            coordinatorId,
            topic,
            proposal,
            voters: voterAgentIds,
            votingDeadline: new Date(Date.now() + deadlineHours * 60 * 60 * 1000),
            votes: new Map(),
            status: 'in_voting',
            createdAt: new Date()
        };
        this.activeProposals.set(proposalId, consensusProposal);
        logger_js_1.default.info({
            proposalId,
            topic,
            voters: voterAgentIds.length
        }, 'Consensus proposal submitted');
        // Broadcast proposal to all participating agents
        for (const agentId of voterAgentIds) {
            await this.sendMessage(agentId, coordinatorId, 'CONSENSUS_PROPOSAL', `Consensus proposal submitted: ${topic}`, [{
                    proposalId,
                    proposal: consensusProposal.proposal,
                    deadline: consensusProposal.votingDeadline
                }]);
        }
        // Log to provenance ledger
        await this.ledger.appendEntry({
            tenantId: 'system',
            actionType: 'PROPOSAL_SUBMITTED',
            resourceType: 'ConsensusProposal',
            resourceId: proposalId,
            actorId: coordinatorId,
            actorType: 'system',
            timestamp: new Date(),
            payload: {
                mutationType: 'CREATE',
                entityId: proposalId,
                entityType: 'ConsensusProposal',
                topic,
                voters: voterAgentIds,
                deadlineHours
            },
            metadata: {
                proposalId,
                topic,
                voterCount: voterAgentIds.length
            }
        });
        return consensusProposal;
    }
    /**
     * Cast a vote on a consensus proposal
     */
    async voteOnProposal(agentId, proposalId, vote, rationale) {
        const proposal = this.activeProposals.get(proposalId);
        if (!proposal) {
            throw new Error(`Proposal ${proposalId} not found`);
        }
        if (!proposal.voters.includes(agentId)) {
            throw new Error(`Agent ${agentId} is not authorized to vote on proposal ${proposalId}`);
        }
        proposal.votes.set(agentId, {
            vote,
            timestamp: new Date(),
            rationale
        });
        proposal.updatedAt = new Date();
        // Check if all votes are in or deadline passed
        const allVoted = proposal.voters.every(voter => proposal.votes.has(voter));
        const deadlinePassed = new Date() > proposal.votingDeadline;
        if (allVoted || deadlinePassed) {
            const approveCount = Array.from(proposal.votes.values()).filter(v => v.vote === 'approve').length;
            const rejectCount = Array.from(proposal.votes.values()).filter(v => v.vote === 'reject').length;
            const quorumMet = proposal.votes.size >= Math.floor(proposal.voters.length * 0.6); // 60% quorum
            if (quorumMet && approveCount > rejectCount) {
                proposal.status = 'passed';
                logger_js_1.default.info({
                    proposalId,
                    approveCount,
                    rejectCount,
                    voterCount: proposal.votes.size
                }, 'Consensus proposal passed');
            }
            else if (quorumMet) {
                proposal.status = 'rejected';
                logger_js_1.default.info({
                    proposalId,
                    approveCount,
                    rejectCount,
                    voterCount: proposal.votes.size
                }, 'Consensus proposal rejected');
            }
            proposal.closedAt = new Date();
        }
        // Log to provenance ledger
        await this.ledger.appendEntry({
            tenantId: 'system',
            actionType: 'VOTE_CAST',
            resourceType: 'ConsensusProposal',
            resourceId: proposalId,
            actorId: agentId,
            actorType: 'system',
            timestamp: new Date(),
            payload: {
                mutationType: 'UPDATE',
                entityId: proposalId,
                entityType: 'ConsensusProposal',
                vote,
                rationale
            },
            metadata: {
                agentId,
                vote,
                proposalTopic: proposal.topic
            }
        });
        return proposal;
    }
    /**
     * Send a coordination message to one or more agents
     */
    async sendMessage(recipientId, senderId, type, content, attachments, correlationId, channelId) {
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const message = {
            id: messageId,
            senderId,
            recipientId,
            timestamp: new Date(),
            type,
            content,
            attachments,
            correlationId,
            metadata: {
                direction: 'direct',
                sender: senderId,
                recipient: recipientId
            }
        };
        // If sending to a channel, broadcast to all participants
        if (channelId) {
            const channel = this.channels.get(channelId);
            if (channel) {
                message.metadata = {
                    ...message.metadata,
                    channelId,
                    direction: 'broadcast'
                };
                channel.messages.push(message);
                channel.updatedAt = new Date();
                logger_js_1.default.info({
                    messageId,
                    channel: channelId,
                    sender: senderId,
                    type
                }, 'Broadcast coordination message');
            }
        }
        // Update agent metrics
        await this.updateAgentMetrics(senderId, { coordinationMessagesSent: 1 });
        if (recipientId !== senderId) { // Don't count self-messages
            await this.updateAgentMetrics(recipientId, { coordinationMessagesReceived: 1 });
        }
        logger_js_1.default.info({
            messageId,
            sender: senderId,
            recipient: recipientId,
            channel: channelId,
            type
        }, 'Coordination message sent');
        // Log to provenance ledger
        await this.ledger.appendEntry({
            tenantId: 'system',
            actionType: 'MESSAGE_SENT',
            resourceType: 'CoordinationMessage',
            resourceId: messageId,
            actorId: senderId,
            actorType: 'system',
            timestamp: new Date(),
            payload: {
                mutationType: 'CREATE',
                entityId: messageId,
                entityType: 'CoordinationMessage',
                senderId,
                recipientId,
                type,
                content,
                correlationId
            },
            metadata: {
                messageType: type,
                hasAttachments: !!attachments?.length,
                channel: channelId,
                messageLength: content.length
            }
        });
        return message;
    }
    /**
     * Request help from other agents when facing complex tasks
     */
    async requestHelp(requestingAgentId, taskDescription, urgency, requiredCapabilities) {
        logger_js_1.default.info({
            requestingAgentId,
            taskDescription,
            urgency,
            requiredCapabilities
        }, 'Agent requested help from peers');
        // Find available agents with required capabilities
        const availableAgents = this.findAvailableAgents(requiredCapabilities);
        // Create a task specifically for collaboration
        const helpTask = await this.assignTask({
            title: `Help Request from Agent ${requestingAgentId}`,
            description: `Agent ${requestingAgentId} needs help with: ${taskDescription}`,
            assignedAgentIds: availableAgents,
            priority: urgency,
            payload: {
                originalRequestId: requestingAgentId,
                task: taskDescription,
                capabilities: requiredCapabilities
            }
        }, availableAgents);
        // Log to provenance ledger
        await this.ledger.appendEntry({
            tenantId: 'system',
            actionType: 'HELP_REQUESTED',
            resourceType: 'CoordinationRequest',
            resourceId: helpTask.id,
            actorId: requestingAgentId,
            actorType: 'system',
            timestamp: new Date(),
            payload: {
                mutationType: 'CREATE',
                entityId: helpTask.id,
                entityType: 'CoordinationRequest',
                requester: requestingAgentId,
                task: taskDescription,
                urgency,
                requiredCapabilities
            },
            metadata: {
                requesterAgentId: requestingAgentId,
                urgency,
                capabilityCount: requiredCapabilities.length
            }
        });
        return [helpTask];
    }
    /**
     * Find agents available for coordination work
     */
    findAvailableAgents(requiredCapabilities) {
        const allAgentIds = Array.from(this.agentStatusCallbacks.keys()); // Assuming we have access to agent registry
        // In a real implementation, we would check the actual agent registry
        // and ensure they have both required capabilities and available capacity
        return allAgentIds;
    }
    /**
     * Update coordination metrics for an agent
     */
    async updateAgentMetrics(agentId, metricsUpdate) {
        if (!this.metrics.has(agentId)) {
            this.metrics.set(agentId, {
                coordinationMessagesSent: 0,
                coordinationMessagesReceived: 0,
                collaborativeTasksCompleted: 0,
                consensusDecisionsMade: 0,
                resourceSharingEvents: 0,
                conflictResolutionEvents: 0,
                averageCollaborationTimeMs: 0
            });
        }
        const current = this.metrics.get(agentId);
        Object.entries(metricsUpdate).forEach(([key, value]) => {
            if (typeof value === 'number' && typeof current[key] === 'number') {
                current[key] += value;
            }
            else {
                current[key] = value;
            }
        });
        current.updatedAt = new Date();
    }
    /**
     * Get coordination metrics for an agent
     */
    getAgentMetrics(agentId) {
        return this.metrics.get(agentId) || null;
    }
    /**
     * Register a callback for agent status changes
     */
    registerAgentStatusCallback(agentId, callback) {
        this.agentStatusCallbacks.set(agentId, callback);
    }
    /**
     * Remove an agent status callback
     */
    removeAgentStatusCallback(agentId) {
        this.agentStatusCallbacks.delete(agentId);
    }
}
exports.SubagentCoordinator = SubagentCoordinator;
exports.subagentCoordinator = SubagentCoordinator.getInstance();
