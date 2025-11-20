/**
 * Smart Contract types and interfaces
 */

export interface SmartContract {
  address: string;
  name: string;
  version: string;
  code: string;
  abi: ContractABI;
  deployer: string;
  deployedAt: number;
  state: Record<string, any>;
}

export interface ContractABI {
  functions: ContractFunction[];
  events: ContractEvent[];
}

export interface ContractFunction {
  name: string;
  inputs: ContractParameter[];
  outputs: ContractParameter[];
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
  description?: string;
}

export interface ContractParameter {
  name: string;
  type: string;
  description?: string;
}

export interface ContractEvent {
  name: string;
  parameters: ContractParameter[];
  description?: string;
}

export interface ContractExecutionContext {
  caller: string;
  contract: string;
  blockHeight: number;
  blockHash: string;
  timestamp: number;
  transactionId: string;
}

export interface ContractExecutionResult {
  success: boolean;
  returnValue: any;
  logs: ContractLog[];
  gasUsed: number;
  error?: string;
  stateChanges: StateChange[];
}

export interface ContractLog {
  event: string;
  parameters: Record<string, any>;
  timestamp: number;
}

export interface StateChange {
  key: string;
  oldValue: any;
  newValue: any;
}

export interface AccessControlPolicy {
  name: string;
  description: string;
  rules: AccessRule[];
  priority: number;
  enabled: boolean;
}

export interface AccessRule {
  resource: string;
  action: string;
  conditions: RuleCondition[];
  effect: 'allow' | 'deny';
}

export interface RuleCondition {
  attribute: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface DataRetentionPolicy {
  name: string;
  dataType: string;
  retentionPeriodDays: number;
  archiveAfterDays: number;
  deleteAfterDays: number;
  conditions: RuleCondition[];
}

export interface ComplianceRule {
  id: string;
  framework: 'SOX' | 'GDPR' | 'HIPAA' | 'SOC2' | 'NIST' | 'ISO27001';
  name: string;
  description: string;
  automated: boolean;
  checkFunction: string;
  remediationSteps: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  requiredApprovers: number;
  approvers: string[];
  currentApprovals: string[];
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  expiresAt: number;
  payload: Record<string, any>;
}
