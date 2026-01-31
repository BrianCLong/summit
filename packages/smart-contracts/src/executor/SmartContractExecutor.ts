/**
 * Smart Contract Executor - Sandboxed execution environment
 * Uses isolated-vm for secure sandboxing (replaced vm2 due to CVE-2023-37466)
 */

import ivm from 'isolated-vm';
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
  private isolates: Map<string, ivm.Isolate> = new Map();
  private gasLimit: number = 1000000;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Deploy contract
   */
  deployContract(contract: SmartContract): string {
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

    let isolate: ivm.Isolate | null = null;

    try {
      const contract = this.contracts.get(contractAddress);
      if (!contract) {
        throw new Error(`Contract not found: ${contractAddress}`);
      }

      // Create isolated VM with memory limit
      isolate = new ivm.Isolate({ memoryLimit: 128 });
      const vmContext = await isolate.createContext();
      const jail = vmContext.global;

      // Set up global reference
      await jail.set('global', jail.derefInto());

      // Inject state
      await jail.set('__state', new ivm.ExternalCopy(contract.state).copyInto());
      await jail.set('__context', new ivm.ExternalCopy(context).copyInto());
      await jail.set('__args', new ivm.ExternalCopy(args).copyInto());

      // Inject emit function
      const emitRef = new ivm.Reference((event: string, params: Record<string, any>) => {
        logs.push({ event, parameters: params, timestamp: Date.now() });
        gasUsed += 100;
      });
      await jail.set('__emitRef', emitRef);

      // Inject setState function
      const setStateRef = new ivm.Reference((key: string, value: any) => {
        const oldValue = contract.state[key];
        stateChanges.push({ key, oldValue, newValue: value });
        contract.state[key] = value;
        gasUsed += 50;
      });
      await jail.set('__setStateRef', setStateRef);

      // Inject getState function
      const getStateRef = new ivm.Reference((key: string) => {
        gasUsed += 10;
        return new ivm.ExternalCopy(contract.state[key]).copyInto();
      });
      await jail.set('__getStateRef', getStateRef);

      // Inject console.log
      const consoleLogRef = new ivm.Reference((...logArgs: any[]) => {
        this.logger.debug({ contract: contractAddress, args: logArgs }, 'Contract log');
        gasUsed += 10;
      });
      await jail.set('__consoleLogRef', consoleLogRef);

      // Setup sandbox helpers
      await vmContext.eval(`
        const context = __context;
        const state = __state;
        const args = __args;

        function emit(event, params) {
          __emitRef.applySync(undefined, [event, JSON.parse(JSON.stringify(params))]);
        }

        function setState(key, value) {
          __setStateRef.applySync(undefined, [key, JSON.parse(JSON.stringify(value))]);
        }

        function getState(key) {
          return __getStateRef.applySync(undefined, [key]);
        }

        const console = {
          log: function(...args) {
            __consoleLogRef.applySync(undefined, args.map(a => String(a)));
          }
        };
      `);

      // Execute contract code with timeout
      const script = await isolate.compileScript(`
        ${contract.code}

        if (typeof ${functionName} !== 'function') {
          throw new Error('Function not found: ${functionName}');
        }

        ${functionName}(...args);
      `);

      const returnValue = await script.run(vmContext, { timeout: 5000 });

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
    } catch (error: any) {
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
    } finally {
      // Cleanup isolate
      if (isolate) {
        isolate.dispose();
      }
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

  /**
   * Dispose all isolates (cleanup)
   */
  dispose(): void {
    for (const isolate of this.isolates.values()) {
      try {
        isolate.dispose();
      } catch {
        // Already disposed
      }
    }
    this.isolates.clear();
  }
}
