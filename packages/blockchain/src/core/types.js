"use strict";
/**
 * Core blockchain types and interfaces
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageType = exports.ConsensusStep = exports.TransactionType = void 0;
var TransactionType;
(function (TransactionType) {
    TransactionType["AUDIT_LOG"] = "audit_log";
    TransactionType["CONFIG_CHANGE"] = "config_change";
    TransactionType["USER_ACTION"] = "user_action";
    TransactionType["DATA_ACCESS"] = "data_access";
    TransactionType["PERMISSION_CHANGE"] = "permission_change";
    TransactionType["SMART_CONTRACT_DEPLOY"] = "smart_contract_deploy";
    TransactionType["SMART_CONTRACT_EXECUTE"] = "smart_contract_execute";
    TransactionType["IDENTITY_CREDENTIAL"] = "identity_credential";
    TransactionType["CUSTODY_TRANSFER"] = "custody_transfer";
    TransactionType["EVIDENCE_SEAL"] = "evidence_seal";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var ConsensusStep;
(function (ConsensusStep) {
    ConsensusStep["PROPOSE"] = "propose";
    ConsensusStep["PREVOTE"] = "prevote";
    ConsensusStep["PRECOMMIT"] = "precommit";
    ConsensusStep["COMMIT"] = "commit";
})(ConsensusStep || (exports.ConsensusStep = ConsensusStep = {}));
var MessageType;
(function (MessageType) {
    MessageType["PROPOSE_BLOCK"] = "propose_block";
    MessageType["VOTE"] = "vote";
    MessageType["COMMIT"] = "commit";
    MessageType["NEW_TRANSACTION"] = "new_transaction";
    MessageType["SYNC_REQUEST"] = "sync_request";
    MessageType["SYNC_RESPONSE"] = "sync_response";
    MessageType["PEER_DISCOVERY"] = "peer_discovery";
    MessageType["HEARTBEAT"] = "heartbeat";
})(MessageType || (exports.MessageType = MessageType = {}));
