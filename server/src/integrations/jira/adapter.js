"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JiraAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
class JiraAdapter {
    config;
    constructor(config) {
        this.config = config;
    }
    async createTicket(incident) {
        const summary = `Incident: ${incident.title}`;
        const description = `${incident.description}\n\nSeverity: ${incident.severity}\nLink: ${process.env.APP_URL}/incidents/${incident.id}`;
        const body = {
            fields: {
                project: {
                    key: this.config.projectKey,
                },
                summary,
                description,
                issuetype: {
                    name: this.config.issueType || 'Incident',
                },
                // Custom fields can be mapped here
            },
        };
        const response = await axios_1.default.post(`${this.config.baseUrl}/rest/api/3/issue`, body, {
            auth: {
                username: this.config.email,
                password: this.config.apiToken,
            },
        });
        const { id, key, self } = response.data;
        return {
            id,
            external_id: id,
            key,
            url: `${this.config.baseUrl}/browse/${key}`,
            title: summary,
            status: 'New', // Default
            created_at: new Date(),
            updated_at: new Date(),
        };
    }
    async syncTicket(ticketId) {
        // Implement fetch
        return {};
    }
}
exports.JiraAdapter = JiraAdapter;
