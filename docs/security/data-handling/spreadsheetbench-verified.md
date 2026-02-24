# SpreadsheetBench Verified data handling standard

## Classification

* Treat all workbooks as untrusted inputs.
* Assume real-world content may include sensitive strings.

## Never-log policy

* Do not log raw cell contents by default.
* Store hashes and redacted snippets only when explicitly enabled via a governed flag.
* Log policy decisions and evidence IDs, not content.

## Retention

* CI: retain only smoke-run artifacts for the configured retention window.
* Local: user-controlled retention policy in `~/.cache/summit`.

## Handling rules

* Strip or block external links and embedded objects before execution.
* Disable macros and external references.
* Enforce no-network execution in the spreadsheet sandbox.

## Evidence controls

* Evidence bundles must be deterministic and reproducible.
* Include workbook hashes, applied edits, and policy outcomes.
* Avoid timestamps in deterministic artifacts.

## Compliance alignment

* Express regulatory logic as policy-as-code.
* Record policy violations as governed evidence events.
* Any exception requires a Governed Exception record.
