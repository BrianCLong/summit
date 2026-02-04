# archsim (foundation)
Deterministic architecture simulation + audit harness.

Inspired by Archimyst, this subsystem provides a way to validate, simulate, and audit backend architectures using a standardized `ArchitectureSpec` IR.

## Contracts
- Input: `schemas/archsim/architecture_spec_v1.schema.json`
- Output: `evidence/*/{report,metrics,stamp}.json`

## Components
- **Validator**: Ensures `ArchitectureSpec` JSON follows the schema.
- **Simulator**: A deterministic model that predicts performance and cost based on the spec and a scenario.
- **Auditors**: Pluggable checks for Single Points of Failure (SPOF), bottlenecks, and cost risks.

## Usage

### Validation
```bash
export PYTHONPATH=$PYTHONPATH:.
python3 -m modules.archsim.validator <spec_json>
```

### Simulation & Audit
```bash
export PYTHONPATH=$PYTHONPATH:.
python3 -m modules.archsim.generate_evidence
```

### Verification
```bash
export PYTHONPATH=$PYTHONPATH:.
python3 -m modules.archsim.verify
```

## Flags
- `ARCHSIM_ENABLED`: (default: 0 runtime, 1 CI) - Global switch for the subsystem.
- `ARCHSIM_INCREMENTAL`: (default: 0) - Enable incremental architecture diffing.
- `ARCHSIM_IAC_ADAPTERS`: (default: 0) - Enable IaC export adapters.

## Evidence
- `EVD-ARCHIMYST-SIM-NNN`: Simulation and audit results for a specific architecture.
