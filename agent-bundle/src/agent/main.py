from __future__ import annotations
import sys
from .prompt_loader import load_config, load_prompt_from_config
from .modules.interpreter import Interpreter
from .modules.planner import Planner
from .modules.executor import Executor
from .modules.verifier import Verifier
from .modules.documenter import Documenter
from .modules.devops import DevOps
from .modules.pr_manager import PRManager


def run(request: str) -> None:
    cfg = load_config()
    prompt = load_prompt_from_config(cfg)

    print("=== Ultra-Maximal Dev Agent ===")
    print("Mode:", cfg.get("mode"))
    print("Using prompt (first 120 chars):")
    print(prompt[:120], "...\n")

    # 1) Interpret
    interpreter = Interpreter()
    interpreted = interpreter.interpret(request)
    print("[Interpreter] Summary:", interpreted.summary)
    print("[Interpreter] Implications:", interpreted.implications)

    # 2) Plan
    planner = Planner()
    plan = planner.make_plan(interpreted)
    print("[Planner] Plan steps:")
    for step in plan.steps:
        print(f"  - {step.name}: {step.description}")

    # 3) Execute
    executor = Executor()
    exec_result = executor.execute(plan)
    print("[Executor] Success:", exec_result.success)
    print("[Executor] Notes:", exec_result.notes)

    # 4) DevOps
    devops = DevOps()
    devops_result = devops.setup()
    print("[DevOps] Notes:", devops_result.notes)

    # 5) Verify
    verifier = Verifier()
    ver_result = verifier.verify()
    print("[Verifier] Tests passed:", ver_result.tests_passed)
    print("[Verifier] Lint passed:", ver_result.lint_passed)
    print("[Verifier] Notes:", ver_result.notes)

    # 6) Document
    documenter = Documenter()
    doc_result = documenter.document()
    print("[Documenter] Docs:", doc_result.files)

    # 7) PR
    pr_cfg = cfg.get("pr", {})
    pr_manager = PRManager()
    pr_title = f"Auto-generated implementation: {request[:60]}"
    pr_body = "This PR was prepared by the ultra-maximal dev agent.\n\nSee generated docs in output/."
    pr_result = pr_manager.prepare_and_optionally_merge(
        title=pr_title,
        body=pr_body,
        branch=pr_cfg.get("branch", "feat/auto-generated"),
        auto_merge=bool(pr_cfg.get("autoMerge", False)),
    )
    print("[PR] Created:", pr_result.created, "Merged:", pr_result.merged)
    print("[PR] Notes:", pr_result.notes)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m agent.main \"<request>\"")
        sys.exit(1)
    request_text = " ".join(sys.argv[1:])
    run(request_text)
