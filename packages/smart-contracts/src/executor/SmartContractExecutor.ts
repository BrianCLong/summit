/**
 * Smart Contract Executor - Sandboxed execution environment
 */

import { VM } from 'vm2';
import { Logger } from 'pino';
import {
  SmartContract,
  ContractExecutionContext,
  ContractExecutionResult,
  ContractLog,
  StateChange,
} from '../contracts/types.js';

export class SmartContractExecutor {
  private logger: Logger;
  private contracts: Map<string, SmartContract> = new Map();
  private gasLimit: number = 1000000;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Deploy contract
   */
  async deployContract(contract: SmartContract): Promise<string> {
    try {
      // Validate contract code
      this.validateContract(contract);

      // Store contract
      this.contracts.set(contract.address, contract);

      this.logger.info(
        { address: contract.address, name: contract.name },
        'Contract deployed'
      );

      return contract.address;
    } catch (error) {
      this.logger.error({ error }, 'Failed to deploy contract');
      throw error;
    }
  }

  /**
   * Execute contract function
   */
  async executeContract(
    contractAddress: string,
    functionName: string,
    args: any[],
    context: ContractExecutionContext
  ): Promise<ContractExecutionResult> {
    const startTime = Date.now();
    const logs: ContractLog[] = [];
    const stateChanges: StateChange[] = [];
    let gasUsed = 0;

    try {
      const contract = this.contracts.get(contractAddress);
      if (!contract) {
        throw new Error(`Contract not found: ${contractAddress}`);
      }

      // Create sandboxed VM
      const vm = new VM({
        timeout: 5000,
        sandbox: {
          context,
          state: { ...contract.state },
          emit: (event: string, params: Record<string, any>) => {
            logs.push({ event, parameters: params, timestamp: Date.now() });
            gasUsed += 100;
          },
          setState: (key: string, value: any) => {
            const oldValue = contract.state[key];
            stateChanges.push({ key, oldValue, newValue: value });
            contract.state[key] = value;
            gasUsed += 50;
          },
          getState: (key: string) => {
            gasUsed += 10;
            return contract.state[key];
          },
          console: {
            log: (...args: any[]) => {
              this.logger.debug({ contract: contractAddress, args }, 'Contract log');
              gasUsed += 10;
            },
          },
        },
      });

      // Execute function
      const code = `
        ${contract.code}

        if (typeof ${functionName} !== 'function') {
          throw new Error('Function not found: ${functionName}');
        }

        ${functionName}(...args);
      `;

      const returnValue = vm.run(code);

      // Apply state changes
      for (const change of stateChanges) {
        contract.state[change.key] = change.newValue;
      }

      const executionTime = Date.now() - startTime;
      gasUsed += executionTime;

      this.logger.info(
        {
          contract: contractAddress,
          function: functionName,
          gasUsed,
          executionTime,
        },
        'Contract executed successfully'
      );

      return {
        success: true,
        returnValue,
        logs,
        gasUsed,
        stateChanges,
      };
    } catch (error) {
      this.logger.error(
        { error, contract: contractAddress, function: functionName },
        'Contract execution failed'
      );

      return {
        success: false,
        returnValue: null,
        logs,
        gasUsed,
        error: error.message,
        stateChanges: [],
      };
    }
  }

  /**
   * Get contract
   */
  getContract(address: string): SmartContract | undefined {
    return this.contracts.get(address);
  }

  /**
   * Get contract state
   */
  getContractState(address: string): Record<string, any> | undefined {
    const contract = this.contracts.get(address);
    return contract?.state;
  }

  /**
   * Validate contract code
   */
  private validateContract(contract: SmartContract): void {
    if (!contract.address || !contract.name || !contract.code) {
      throw new Error('Invalid contract: missing required fields');
    }

    // Basic code validation
    if (contract.code.includes('require(') && contract.code.includes('native')) {
      throw new Error('Contract cannot use native modules');
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      'eval(',
      'Function(',
      'import ',
      'require(',
      'process',
      '__dirname',
      '__filename',
    ];

    for (const pattern of dangerousPatterns) {
      if (contract.code.includes(pattern)) {
        throw new Error(`Contract contains dangerous pattern: ${pattern}`);
      }
    }
  }
}
