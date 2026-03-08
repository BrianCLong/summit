"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobPriorities = exports.QueueNames = void 0;
exports.QueueNames = {
    INGESTION: 'ingestion-queue',
    REPORTS: 'reports-queue',
    ANALYTICS: 'analytics-queue',
    NOTIFICATIONS: 'notifications-queue',
    WEBHOOKS: 'webhooks-queue',
    INTENTS: 'intents-queue',
};
exports.JobPriorities = {
    HIGH: 1,
    NORMAL: 50,
    LOW: 100,
};
