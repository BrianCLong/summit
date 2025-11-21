/**
 * Attack Simulation Package
 *
 * Network attack simulation and security testing:
 * - DDoS simulation
 * - MITM simulation
 * - Firewall rule testing
 * - IDS/IPS evasion testing
 * - Network segmentation testing
 */

// Types
export * from './types';

// Network Simulation
export {
  NetworkAttackSimulator,
  FirewallTester,
  IDSEvasionTester,
  SegmentationTester
} from './network/network-simulator';
