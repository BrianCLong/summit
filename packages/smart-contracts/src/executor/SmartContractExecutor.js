"use strict";
/**
 * Smart Contract Executor - Sandboxed execution environment
 * Uses isolated-vm for secure sandboxing (replaced vm2 due to CVE-2023-37466)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartContractExecutor = void 0;
const isolated_vm_1 = __importDefault(require("isolated-vm"));
class SmartContractExecutor {
    logger;
    contracts = new Map();
    isolates = new Map();
    gasLimit = 1000000;
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Deploy contract
     */
    deployContract(contract) {
        try {
            // Validate contract code
            this.validateContract(contract);
            // Store contract
            this.contracts.set(contract.address, contract);
            this.logger.info({ address: contract.address, name: contract.name }, 'Contract deployed');
            return contract.address;
        }
        catch (error) {
            this.logger.error({ error }, 'Failed to deploy contract');
            throw error;
        }
    }
    /**
     * Execute contract function
     */
    async executeContract(contractAddress, functionName, args, context) {
        const startTime = Date.now();
        const logs = [];
        const stateChanges = [];
        let gasUsed = 0;
        let isolate = null;
        try {
            const contract = this.contracts.get(contractAddress);
            if (!contract) {
                throw new Error(`Contract not found: ${contractAddress}`);
            }
            // Create isolated VM with memory limit
            isolate = new isolated_vm_1.default.Isolate({ memoryLimit: 128 });
            const vmContext = await isolate.createContext();
            const jail = vmContext.global;
            // Set up global reference
            await jail.set('global', jail.derefInto());
            // Inject state
            await jail.set('__state', new isolated_vm_1.default.ExternalCopy(contract.state).copyInto());
            await jail.set('__context', new isolated_vm_1.default.ExternalCopy(context).copyInto());
            await jail.set('__args', new isolated_vm_1.default.ExternalCopy(args).copyInto());
            // Inject emit function
            const emitRef = new isolated_vm_1.default.Reference((event, params) => {
                logs.push({ event, parameters: params, timestamp: Date.now() });
                gasUsed += 100;
            });
            await jail.set('__emitRef', emitRef);
            // Inject setState function
            const setStateRef = new isolated_vm_1.default.Reference((key, value) => {
                const oldValue = contract.state[key];
                stateChanges.push({ key, oldValue, newValue: value });
                contract.state[key] = value;
                gasUsed += 50;
            });
            await jail.set('__setStateRef', setStateRef);
            // Inject getState function
            const getStateRef = new isolated_vm_1.default.Reference((key) => {
                gasUsed += 10;
                return new isolated_vm_1.default.ExternalCopy(contract.state[key]).copyInto();
            });
            await jail.set('__getStateRef', getStateRef);
            // Inject console.log
            const consoleLogRef = new isolated_vm_1.default.Reference((...logArgs) => {
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
            this.logger.info({
                contract: contractAddress,
                function: functionName,
                gasUsed,
                executionTime,
            }, 'Contract executed successfully');
            return {
                success: true,
                returnValue,
                logs,
                gasUsed,
                stateChanges,
            };
        }
        catch (error) {
            this.logger.error({ error, contract: contractAddress, function: functionName }, 'Contract execution failed');
            return {
                success: false,
                returnValue: null,
                logs,
                gasUsed,
                error: error.message,
                stateChanges: [],
            };
        }
        finally {
            // Cleanup isolate
            if (isolate) {
                isolate.dispose();
            }
        }
    }
    /**
     * Get contract
     */
    getContract(address) {
        return this.contracts.get(address);
    }
    /**
     * Get contract state
     */
    getContractState(address) {
        const contract = this.contracts.get(address);
        return contract?.state;
    }
    /**
     * Validate contract code
     */
    validateContract(contract) {
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
    dispose() {
        for (const isolate of this.isolates.values()) {
            try {
                isolate.dispose();
            }
            catch {
                // Already disposed
            }
        }
        this.isolates.clear();
    }
}
exports.SmartContractExecutor = SmartContractExecutor;
