# Partner Sampling Broker (PSB)

The Partner Sampling Broker issues auditable dataset samples for data sharing partners. It enforces consent and geography filters, derives stratum-specific randomness from Ed25519-backed VRF proofs, and produces certificates that can be replayed and verified independently.

## Features

- Deterministic sampling per partner seed using VRF-derived stratum seeds
- Consent and geography filters with global exclusions
- Sampling certificates with seed proofs, strata metadata, and exclusion lists
- HTTP service (`psb serve`), offline CLI (`psb sample` / `psb verify`), and verifier library
- TypeScript SDK (`sdk/psb-client`) with offline replay support

## Usage

```sh
# build the broker
cd services/psb
go build ./cmd/psb

# run the HTTP service against the sample dataset
./psb serve --dataset data/sample_dataset.json --private-key fixtures/vrf_private_key.hex --addr :8080

# run a one-off sample
./psb sample --dataset data/sample_dataset.json --private-key fixtures/vrf_private_key.hex --request fixtures/request.json --out fixtures/response.json

# verify a certificate against the dataset
./psb verify --dataset data/sample_dataset.json --certificate fixtures/certificate.json
```

## Fixtures

- `data/sample_dataset.json` – canonical dataset used for replay tests
- `fixtures/request.json` – deterministic sampling request for partner `partner-a`
- `fixtures/response.json` – full broker response (samples + certificate)
- `fixtures/sample.json` – expected samples keyed by stratum
- `fixtures/certificate.json` – sampling certificate for verification tests

Replaying the fixture request yields the same samples and certificate outputs (aside from the timestamp) as validated in `sampler_test.go`.

## Development

Run unit tests:

```sh
go test ./...
```

The TypeScript SDK can be type-checked via:

```sh
cd sdk/psb-client
npm install
npm run build
```
