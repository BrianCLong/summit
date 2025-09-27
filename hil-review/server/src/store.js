import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(__dirname, '../data/state.json');

const defaultState = {
  appeals: [],
  policyProposals: [],
  auditLogs: []
};

export class DataStore {
  constructor() {
    this.state = structuredClone(defaultState);
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    await mkdir(resolve(__dirname, '../data'), { recursive: true });

    try {
      const raw = await readFile(dataPath, 'utf-8');
      this.state = JSON.parse(raw);
    } catch (error) {
      await this.save();
    }

    this.initialized = true;
  }

  get snapshot() {
    return structuredClone(this.state);
  }

  async save() {
    await writeFile(dataPath, JSON.stringify(this.state, null, 2));
  }

  reset(newState) {
    this.state = structuredClone(newState ?? defaultState);
    return this.save();
  }

  listAppeals() {
    return this.state.appeals;
  }

  getAppeal(id) {
    return this.state.appeals.find((item) => item.id === id);
  }

  async upsertAppeal(appeal) {
    const index = this.state.appeals.findIndex((item) => item.id === appeal.id);
    if (index >= 0) {
      this.state.appeals[index] = appeal;
    } else {
      this.state.appeals.push(appeal);
    }
    await this.save();
    return appeal;
  }

  async addAuditLog(logEntry) {
    this.state.auditLogs.push(logEntry);
    await this.save();
  }

  async addPolicyProposal(proposal) {
    this.state.policyProposals.push(proposal);
    await this.save();
    return proposal;
  }

  listPolicyProposals() {
    return this.state.policyProposals;
  }

  getPolicyProposal(id) {
    return this.state.policyProposals.find((item) => item.id === id);
  }

  async updatePolicyProposal(updated) {
    const index = this.state.policyProposals.findIndex((item) => item.id === updated.id);
    if (index >= 0) {
      this.state.policyProposals[index] = updated;
      await this.save();
    }
    return updated;
  }
}
