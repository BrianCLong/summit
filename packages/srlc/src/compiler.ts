import { emitKafka } from './emitter/kafkaEmitter.js';
import { emitSql } from './emitter/sqlEmitter.js';
import { emitTypescript } from './emitter/typescriptEmitter.js';
import { buildExplainTraces } from './explain.js';
import { parsePolicy } from './parser.js';
import { ensureValidPolicy } from './validator.js';
import { CompiledPolicy, Policy } from './types.js';

export function compilePolicyFromAst(policy: Policy): CompiledPolicy {
  const explain = buildExplainTraces(policy);
  return {
    policy,
    explain,
    targets: {
      sql: emitSql(policy),
      kafka: emitKafka(policy),
      typescript: emitTypescript(policy)
    }
  };
}

export function compilePolicyFromSource(source: string): CompiledPolicy {
  const raw = parsePolicy(source);
  const policy = ensureValidPolicy(raw);
  return compilePolicyFromAst(policy);
}
