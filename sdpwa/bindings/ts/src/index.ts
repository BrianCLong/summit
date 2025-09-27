export interface ContributionBoundsInput {
  maxContributionsPerWindow: number
  minValue: number
  maxValue: number
}

export interface DpParametersInput {
  epsilonCount: number
  epsilonSum: number
  deltaPerWindow: number
  ledgerDeltaTolerance: number
}

export interface WindowConfigInput {
  windowSizeMs: number
  windowStrideMs: number
  originMs?: number
}

export interface AggregatorConfigInput {
  dp: DpParametersInput
  bounds: ContributionBoundsInput
  window: WindowConfigInput
}

export interface EventInput {
  identity: string
  value: number
  timestampMs: number
}

export interface PrivacyLossSnapshot {
  perReleaseEpsilons: number[]
  releaseDelta: number
  cumulativeEpsilon: number
  cumulativeDelta: number
}

export interface WindowReleaseSnapshot {
  windowStartMs: number
  windowEndMs: number
  noisyCount: number
  noisySum: number
  rawCount: number
  rawSum: number
  privacy: PrivacyLossSnapshot
}

export interface PrivacyLedgerSnapshot {
  target_delta: number
  entries: Array<{
    window_start_ms: number
    window_end_ms: number
    epsilons: number[]
    delta: number
  }>
  cumulative_epsilon: number
}

export interface WasmAggregatorHandle {
  ingest(event: EventInput): void
  release(upToMs: number): WindowReleaseSnapshot[]
  ledger(): PrivacyLedgerSnapshot
}

export interface WasmBindings {
  WasmAggregator: new (config: unknown, seed: Uint8Array) => WasmAggregatorHandle
}

export type InitWasm = (moduleOrPath?: unknown) => Promise<WasmBindings>

const MS_SUFFIX = "ms"

function encodeDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new RangeError(`duration must be a non-negative finite number, received ${ms}`)
  }
  return `${ms}${MS_SUFFIX}`
}

function normaliseConfig(config: AggregatorConfigInput): unknown {
  const origin = config.window.originMs ?? 0
  return {
    dp: {
      epsilon_count: config.dp.epsilonCount,
      epsilon_sum: config.dp.epsilonSum,
      delta_per_window: config.dp.deltaPerWindow,
      ledger_delta_tolerance: config.dp.ledgerDeltaTolerance
    },
    bounds: {
      max_contributions_per_window: config.bounds.maxContributionsPerWindow,
      min_value: config.bounds.minValue,
      max_value: config.bounds.maxValue
    },
    window: {
      window_size: encodeDuration(config.window.windowSizeMs),
      window_stride: encodeDuration(config.window.windowStrideMs),
      origin_ms: origin
    }
  }
}

export class StreamingDpWindowAggregator {
  private constructor(
    private readonly handle: WasmAggregatorHandle
  ) {}

  static async create(
    initWasm: InitWasm,
    config: AggregatorConfigInput,
    seed: Uint8Array,
    moduleOrPath?: unknown
  ): Promise<StreamingDpWindowAggregator> {
    const wasm = await initWasm(moduleOrPath)
    const handle = new wasm.WasmAggregator(normaliseConfig(config), seed)
    return new StreamingDpWindowAggregator(handle)
  }

  ingest(event: EventInput): void {
    this.handle.ingest(event)
  }

  release(upToMs: number): WindowReleaseSnapshot[] {
    return this.handle.release(upToMs)
  }

  ledger(): PrivacyLedgerSnapshot {
    return this.handle.ledger()
  }
}
