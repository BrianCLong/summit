"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhilanthropyService = void 0;
const crypto_1 = require("crypto");
class PhilanthropyService {
    static instance;
    programs = [];
    ledger = [];
    constructor() {
        this.programs = [
            { id: 'prog_1', name: 'Civil Society Defense Fund', category: 'CIVIL_SOCIETY', description: 'Strengthening institutions against authoritarianism.' },
            { id: 'prog_2', name: 'Local Community Grant', category: 'LOCAL_COMMUNITY', description: 'Supporting local initiatives.' }
        ];
    }
    static getInstance() {
        if (!PhilanthropyService.instance) {
            PhilanthropyService.instance = new PhilanthropyService();
        }
        return PhilanthropyService.instance;
    }
    getPrograms() {
        return this.programs;
    }
    calculateObligation(event) {
        // Sliding scale logic (simplified)
        let rate = 0.01; // 1%
        if (event.amount > 1000000)
            rate = 0.02;
        if (event.amount > 10000000)
            rate = 0.05;
        const contribution = event.amount * rate;
        // Company match logic
        let matchMultiplier = 2;
        if (event.amount > 5000000)
            matchMultiplier = 5;
        const match = contribution * matchMultiplier;
        return {
            contribution,
            match,
            total: contribution + match
        };
    }
    recordCommitment(event, programId) {
        const obligation = this.calculateObligation(event);
        const record = {
            id: (0, crypto_1.randomUUID)(),
            eventId: event.id,
            programId,
            amount: obligation.total,
            breakdown: obligation,
            timestamp: new Date()
        };
        this.ledger.push(record);
        return record;
    }
    getLedger() {
        return this.ledger;
    }
}
exports.PhilanthropyService = PhilanthropyService;
