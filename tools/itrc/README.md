# Immutable Training Run Capsule (ITRC)

ITRC packages machine-learning training or inference jobs into deterministic, signed
capsules that can be replayed on demand.

## Features

- **Capsule packer** (`itrc pack`): embeds the environment lockfile, container image
digest, dataset lineage identifiers, deterministic seeds, hardware hints, policy
hashes, and expected artifact digests into a signed archive.
- **Capsule verifier** (`itrc verify`): checks the signature and embedded lockfile to
prevent tampering.
- **Capsule runner** (`itrc run`): replays a capsule, captures stdout/stderr, and
produces a signed run receipt containing artifact digests and metadata.
- **Receipt verifier** (`itrc receipt-verify`): validates a receipt offline and compares
artifacts in the workspace to the expected digests.

All signatures use HMAC-SHA256 with a caller-supplied key. Tampering with either the
capsule or the receipt yields deterministic verification failures.

## Usage

```bash
python -m tools.itrc pack \
  --capsule runs/fixture.itrc \
  --name "mnist-fixture" \
  --command "python train.py --epochs 1" \
  --workdir /opt/jobs/mnist \
  --env-lock /opt/jobs/mnist/poetry.lock \
  --image-digest sha256:abc123... \
  --dataset-lineage dataset:mnist:v1 \
  --seed python=0 \
  --hardware accelerator=nvidia-a100 \
  --policy data-use=policy-v3 \
  --artifact outputs/model.bin \
  --key ./secrets/itrc.key \
  --key-id ops-prod
```

Replay the capsule and emit a run receipt:

```bash
python -m tools.itrc run \
  --capsule runs/fixture.itrc \
  --key ./secrets/itrc.key \
  --receipt receipts/fixture.json
```

Verify a receipt against the capsule offline:

```bash
python -m tools.itrc receipt-verify \
  --capsule runs/fixture.itrc \
  --receipt receipts/fixture.json \
  --key ./secrets/itrc.key
```

See `python -m tools.itrc --help` for the complete command reference.
