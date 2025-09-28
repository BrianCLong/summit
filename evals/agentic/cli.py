import json, click
from .harness import AgenticEvalHarness

@click.command()
@click.option("--runbook", required=True)
@click.option("--cases", type=click.Path(exists=True), required=True)  # JSONL
def main(runbook, cases):
    h = AgenticEvalHarness(runbook)
    total = 0; passed = 0
    with open(cases, "r") as f:
        for line in f:
            case = json.loads(line)
            rec = h.evaluate_case(case)
            total += 1; passed += int(rec.e2e_ok)
            click.echo(json.dumps(rec.dict()))
    click.echo(f"SUMMARY | runbook={runbook} pass_rate={passed}/{total}={passed/float(total):.2%}")

if __name__ == "__main__":
    main()
