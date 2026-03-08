"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiduciaryService = void 0;
class FiduciaryService {
    static instance;
    currentCapTable;
    constructor() {
        // Initialize with a mock cap table for the home company
        this.currentCapTable = {
            classes: [
                { id: 'ec_1', name: 'Founder Preferred', type: 'FOUNDER_PREFERRED', votingPower: 10, transferRestrictions: ['BOARD_APPROVAL', 'ETHICS_COUNCIL_APPROVAL'] },
                { id: 'ec_2', name: 'Common', type: 'COMMON', votingPower: 1, transferRestrictions: ['ROFR'] },
                { id: 'ec_3', name: 'Mission Lock', type: 'MISSION_LOCK', votingPower: 50, transferRestrictions: ['NON_TRANSFERABLE'] }
            ],
            holders: [
                { id: 'h_1', name: 'Founders', type: 'FOUNDER', heldEquity: [{ classId: 'ec_1', amount: 4000000, vested: 4000000 }] },
                { id: 'h_2', name: 'Employees', type: 'EMPLOYEE', heldEquity: [{ classId: 'ec_2', amount: 1000000, vested: 500000 }] },
                { id: 'h_3', name: 'Stewardship Trust', type: 'TRUST', heldEquity: [{ classId: 'ec_3', amount: 1, vested: 1 }] } // Golden share
            ]
        };
    }
    static getInstance() {
        if (!FiduciaryService.instance) {
            FiduciaryService.instance = new FiduciaryService();
        }
        return FiduciaryService.instance;
    }
    getCapTable() {
        return this.currentCapTable;
    }
    simulateTransaction(input) {
        // Deep copy current cap table
        const simTable = JSON.parse(JSON.stringify(this.currentCapTable));
        // VERY simplified simulation logic
        if (input.grants) {
            for (const grant of input.grants) {
                let holder = simTable.holders.find(h => h.id === grant.holderId);
                if (!holder) {
                    // potentially create new holder, skipping for brevity
                    continue;
                }
                const holding = holder.heldEquity.find((h) => h.classId === grant.classId);
                if (holding) {
                    holding.amount += grant.amount;
                }
                else {
                    holder.heldEquity.push({ classId: grant.classId, amount: grant.amount, vested: 0 });
                }
            }
        }
        // Calculate voting power
        let totalVotes = 0;
        const votesByHolder = {};
        for (const holder of simTable.holders) {
            let holderVotes = 0;
            for (const holding of holder.heldEquity) {
                const eqClass = simTable.classes.find(c => c.id === holding.classId);
                if (eqClass) {
                    holderVotes += holding.amount * eqClass.votingPower;
                }
            }
            votesByHolder[holder.id] = holderVotes;
            totalVotes += holderVotes;
        }
        const controlDistribution = Object.entries(votesByHolder).map(([holderId, votes]) => ({
            holderId,
            percentage: (votes / totalVotes) * 100
        }));
        const missionRisk = controlDistribution.find(c => c.holderId === 'h_1' || c.holderId === 'h_3').percentage < 50
            ? 'HIGH_MISSION_RISK'
            : 'SAFE';
        return {
            postCapTable: simTable,
            analysis: {
                totalVotes,
                controlDistribution,
                missionRisk
            }
        };
    }
}
exports.FiduciaryService = FiduciaryService;
