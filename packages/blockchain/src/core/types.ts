/**
 * Core blockchain types and interfaces
 */

export interface BlockHeader {
  version: number;
  height: number;
  timestamp: number;
  previousHash: string;
  merkleRoot: string;
  stateRoot: string;
  transactionsCount: number;
  nonce: number;
  difficulty: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  timestamp: number;
  from: string;
  to?: string;
  payload: TransactionPayload;
  signature: string;
  publicKey: string;
  nonce: number;
}

export enum TransactionType {
  AUDIT_LOG = 'audit_log',
  CONFIG_CHANGE = 'config_change',
  USER_ACTION = 'user_action',
  DATA_ACCESS = 'data_access',
  PERMISSION_CHANGE = 'permission_change',
  SMART_CONTRACT_DEPLOY = 'smart_contract_deploy',
  SMART_CONTRACT_EXECUTE = 'smart_contract_execute',
  IDENTITY_CREDENTIAL = 'identity_credential',
  CUSTODY_TRANSFER = 'custody_transfer',
  EVIDENCE_SEAL = 'evidence_seal',
}

export interface TransactionPayload {
  eventType: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
  tenantId: string;
  details: Record<string, any>;
  complianceRelevant: boolean;
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
}

export interface Block {
  header: BlockHeader;
  transactions: Transaction[];
  hash: string;
  proposer: string;
  validators: string[];
  signatures: BlockSignature[];
}

export interface BlockSignature {
  validator: string;
  signature: string;
  timestamp: number;
}

export interface ConsensusState {
  validators: ValidatorInfo[];
  currentHeight: number;
  currentRound: number;
  currentStep: ConsensusStep;
  lockedValue?: Block;
  lockedRound?: number;
  validValue?: Block;
  validRound?: number;
}

export enum ConsensusStep {
  PROPOSE = 'propose',
  PREVOTE = 'prevote',
  PRECOMMIT = 'precommit',
  COMMIT = 'commit',
}

export interface ValidatorInfo {
  address: string;
  publicKey: string;
  votingPower: number;
  proposerPriority: number;
}

export interface GenesisConfig {
  chainId: string;
  initialValidators: ValidatorInfo[];
  blockTime: number;
  maxBlockSize: number;
  consensusAlgorithm: 'pbft' | 'raft' | 'poa';
  networkType: 'private' | 'consortium';
}

export interface ChainConfig {
  genesis: GenesisConfig;
  networkId: string;
  enableSharding: boolean;
  shardCount: number;
  pruningEnabled: boolean;
  archiveMode: boolean;
}

export interface PeerInfo {
  id: string;
  address: string;
  publicKey: string;
  isValidator: boolean;
  lastSeen: number;
  reputation: number;
}

export interface NetworkMessage {
  type: MessageType;
  from: string;
  payload: any;
  signature: string;
  timestamp: number;
}

export enum MessageType {
  PROPOSE_BLOCK = 'propose_block',
  VOTE = 'vote',
  COMMIT = 'commit',
  NEW_TRANSACTION = 'new_transaction',
  SYNC_REQUEST = 'sync_request',
  SYNC_RESPONSE = 'sync_response',
  PEER_DISCOVERY = 'peer_discovery',
  HEARTBEAT = 'heartbeat',
}

export interface Vote {
  validator: string;
  height: number;
  round: number;
  blockHash: string;
  voteType: 'prevote' | 'precommit';
  signature: string;
  timestamp: number;
}

export interface BlockchainState {
  currentHeight: number;
  bestBlockHash: string;
  totalTransactions: number;
  validators: ValidatorInfo[];
  pendingTransactions: Transaction[];
}

export interface ProofOfExistence {
  documentHash: string;
  blockHeight: number;
  blockHash: string;
  timestamp: number;
  merkleProof: string[];
  transactionId: string;
}

export interface AuditTrailEntry {
  id: string;
  blockHeight: number;
  transactionId: string;
  timestamp: number;
  eventType: string;
  actor: string;
  action: string;
  resource?: string;
  outcome: 'success' | 'failure';
  details: Record<string, any>;
  proofOfExistence: ProofOfExistence;
}

export interface SmartContractMetadata {
  address: string;
  name: string;
  version: string;
  deployer: string;
  deployedAt: number;
  blockHeight: number;
  codeHash: string;
}
