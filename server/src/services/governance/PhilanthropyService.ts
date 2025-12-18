
import { randomUUID } from 'crypto';

export interface PhilanthropyProgram {
  id: string;
  name: string;
  category: 'CIVIL_SOCIETY' | 'LOCAL_COMMUNITY' | 'GLOBAL_DEMOCRACY' | 'EDUCATION' | 'CLIMATE';
  description: string;
}

export interface PhilanthropicEvent {
  id: string;
  type: 'LIQUIDITY_EVENT' | 'PROFIT_DISTRIBUTION' | 'EQUITY_VESTING';
  amount: number; // The base amount (e.g., profit, gain)
  entityId: string; // Who triggered it
  timestamp: Date;
}

export class PhilanthropyService {
  private static instance: PhilanthropyService;
  private programs: PhilanthropyProgram[] = [];
  private ledger: any[] = [];

  private constructor() {
    this.programs = [
      { id: 'prog_1', name: 'Civil Society Defense Fund', category: 'CIVIL_SOCIETY', description: 'Strengthening institutions against authoritarianism.' },
      { id: 'prog_2', name: 'Local Community Grant', category: 'LOCAL_COMMUNITY', description: 'Supporting local initiatives.' }
    ];
  }

  public static getInstance(): PhilanthropyService {
    if (!PhilanthropyService.instance) {
      PhilanthropyService.instance = new PhilanthropyService();
    }
    return PhilanthropyService.instance;
  }

  public getPrograms(): PhilanthropyProgram[] {
    return this.programs;
  }

  public calculateObligation(event: PhilanthropicEvent): { contribution: number, match: number, total: number } {
    // Sliding scale logic (simplified)
    let rate = 0.01; // 1%
    if (event.amount > 1000000) rate = 0.02;
    if (event.amount > 10000000) rate = 0.05;

    const contribution = event.amount * rate;

    // Company match logic
    let matchMultiplier = 2;
    if (event.amount > 5000000) matchMultiplier = 5;

    const match = contribution * matchMultiplier;

    return {
      contribution,
      match,
      total: contribution + match
    };
  }

  public recordCommitment(event: PhilanthropicEvent, programId: string) {
    const obligation = this.calculateObligation(event);
    const record = {
      id: randomUUID(),
      eventId: event.id,
      programId,
      amount: obligation.total,
      breakdown: obligation,
      timestamp: new Date()
    };
    this.ledger.push(record);
    return record;
  }

  public getLedger() {
    return this.ledger;
  }
}
