"use strict";
/**
 * Summit Work Graph - Slack Integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackIntegration = void 0;
class SlackIntegration {
    config;
    eventBus;
    userPreferences = new Map();
    constructor(config, eventBus) {
        this.config = config;
        this.eventBus = eventBus;
        this.subscribeToEvents();
    }
    subscribeToEvents() {
        this.eventBus.subscribe({ types: ['commitment.at_risk', 'commitment.broken'] }, (e) => this.handleCommitmentEvent(e));
        this.eventBus.subscribe({ types: ['ticket.assigned', 'ticket.blocked'] }, (e) => this.handleTicketEvent(e));
        this.eventBus.subscribe({ types: ['pr.opened', 'pr.merged'] }, (e) => this.handlePREvent(e));
        this.eventBus.subscribe({ types: ['work.completed'] }, (e) => this.handleAgentEvent(e));
    }
    async sendMessage(message) {
        const response = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + this.config.botToken, 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
        });
        return response.json();
    }
    async notifyCommitmentAtRisk(commitment) {
        const color = commitment.status === 'broken' ? '#FF0000' : '#FFA500';
        const emoji = commitment.status === 'broken' ? ':x:' : ':warning:';
        await this.sendMessage({
            channel: this.config.alertChannel || this.config.defaultChannel,
            text: emoji + ' Commitment "' + commitment.title + '" is ' + commitment.status,
            attachments: [{ color, text: commitment.description }],
        });
    }
    async notifyTicketAssignment(ticket, assignee) {
        const prefs = this.findPreferencesByUserId(assignee);
        if (!prefs?.ticketAssignments)
            return;
        await this.sendMessage({
            channel: prefs.slackUserId,
            text: 'You have been assigned ticket: ' + ticket.title,
        });
    }
    async notifyAgentCompletion(agent, ticket) {
        await this.sendMessage({
            channel: this.config.defaultChannel,
            text: ':robot_face: Agent ' + agent.name + ' completed: ' + ticket.title,
        });
    }
    async sendDailyDigest(channel, metrics) {
        await this.sendMessage({
            channel,
            text: ':chart_with_upwards_trend: Daily Digest - Velocity: ' + metrics.velocity + ', WIP: ' + metrics.wip + ', At Risk: ' + metrics.atRisk + ', Completed: ' + metrics.completed,
        });
    }
    setUserPreferences(prefs) {
        this.userPreferences.set(prefs.userId, prefs);
    }
    findPreferencesByUserId(userId) {
        return this.userPreferences.get(userId);
    }
    async handleCommitmentEvent(event) {
        const commitment = event.payload;
        if (commitment)
            await this.notifyCommitmentAtRisk(commitment);
    }
    async handleTicketEvent(event) {
        if (event.type === 'ticket.assigned') {
            const { ticket, assignee } = event.payload;
            if (ticket && assignee)
                await this.notifyTicketAssignment(ticket, assignee);
        }
    }
    async handlePREvent(event) {
        const pr = event.payload;
        if (pr && event.type === 'pr.merged') {
            await this.sendMessage({
                channel: this.config.defaultChannel,
                text: ':merged: PR merged: ' + pr.title,
            });
        }
    }
    async handleAgentEvent(event) {
        const { agent, ticket } = event.payload;
        if (agent && ticket)
            await this.notifyAgentCompletion(agent, ticket);
    }
}
exports.SlackIntegration = SlackIntegration;
