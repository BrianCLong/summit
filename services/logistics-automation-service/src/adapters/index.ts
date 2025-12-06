/**
 * Integration Adapters Index
 *
 * Export all adapters for external defense logistics systems
 */

export { DlaAdapter } from './dla-adapter.js';
export { NatoNspaAdapter } from './nato-adapter.js';
export { AlliedLogexAdapter } from './allied-adapter.js';

export type { DlaConfig, DlaRequisition, DlaStatusResponse } from './dla-adapter.js';
export type { NspaConfig, NspaContractNotice, NspaOrder } from './nato-adapter.js';
export type { AlliedLogexConfig, AlliedLogisticsRequest, MlsaAgreement } from './allied-adapter.js';
