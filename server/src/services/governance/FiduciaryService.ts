
import { v4 as uuidv4 } from 'uuid';

export type EquityClassType = 'FOUNDER_PREFERRED' | 'COMMON' | 'EMPLOYEE_POOL' | 'PHILANTHROPIC' | 'MISSION_LOCK';

export interface EquityClass {
  id: string;
  name: string;
  type: EquityClassType;
  votingPower: number; // Multiplier, e.g., 10x for founders, 1x for common
  transferRestrictions: string[];
}

export interface EquityHolder {
  id: string;
  name: string;
  type: 'FOUNDER' | 'EMPLOYEE' | 'INVESTOR' | 'TRUST' | 'CIVIL_SOCIETY';
  heldEquity: {
    classId: string;
    amount: number;
    vested: number;
  }[];
}

export interface CapTable {
  classes: EquityClass[];
  holders: EquityHolder[];
}

export class FiduciaryService {
  private static instance: FiduciaryService;
  private currentCapTable: CapTable;

  private constructor() {
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

  public static getInstance(): FiduciaryService {
    if (!FiduciaryService.instance) {
      FiduciaryService.instance = new FiduciaryService();
    }
    return FiduciaryService.instance;
  }

  public getCapTable(): CapTable {
    return this.currentCapTable;
  }

  public simulateTransaction(input: {
    newInvestment?: { amount: number, valuation: number, classId: string },
    grants?: { holderId: string, amount: number, classId: string }[]
  }): { postCapTable: CapTable, analysis: any } {
    // Deep copy current cap table
    const simTable = JSON.parse(JSON.stringify(this.currentCapTable)) as CapTable;

    // VERY simplified simulation logic
    if (input.grants) {
      for (const grant of input.grants) {
        let holder = simTable.holders.find(h => h.id === grant.holderId);
        if (!holder) {
          // potentially create new holder, skipping for brevity
          continue;
        }
        const holding = holder.heldEquity.find((h: any) => h.classId === grant.classId);
        if (holding) {
          holding.amount += grant.amount;
        } else {
          holder.heldEquity.push({ classId: grant.classId, amount: grant.amount, vested: 0 });
        }
      }
    }

    // Calculate voting power
    let totalVotes = 0;
    const votesByHolder: Record<string, number> = {};

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

    const missionRisk = controlDistribution.find(c => c.holderId === 'h_1' || c.holderId === 'h_3')!.percentage < 50
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
