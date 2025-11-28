
import sys
import os

# Add the root directory to sys.path to resolve the package
# We are in auto_scientist/experiments/alignment/
# We want to add /app (or the repo root)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../')))

from auto_scientist.impl.alignment.schemas import Preference, Candidate, AlignmentConfig
from auto_scientist.impl.alignment.store import PreferenceStore
from auto_scientist.impl.alignment.trainer import AlignmentTrainer
from auto_scientist.impl.alignment.oversight import OversightOrchestrator, Candidate as OversightCandidate

def run_smoke_test():
    print("=== Running Alignment Smoke Test ===")

    # 1. Test Preference Store
    print("\n1. Testing Preference Store...")
    store = PreferenceStore(storage_path="./test_data/prefs.jsonl")

    cand1 = Candidate(text="Response A (Safe)", tool_traces=[])
    cand2 = Candidate(text="Response B (Unsafe: kill)", tool_traces=[])

    pref = Preference(
        prompt="How to eliminate a process?",
        candidates=[cand1, cand2],
        chosen_idx=0,
        rejected_idx=1,
        rationale="A is safe command line instruction",
        safety_tags=["harmless"]
    )

    pref_id = store.log_preference(pref)
    print(f"Logged preference ID: {pref_id}")

    loaded = store.load_preferences()
    print(f"Loaded {len(loaded)} preferences.")
    assert len(loaded) >= 1

    # 2. Test Oversight
    print("\n2. Testing Oversight Orchestrator...")
    orchestrator = OversightOrchestrator()

    # Use the Candidate from schemas which is compatible
    decision_safe = orchestrator.decide("Hello", cand1)
    print(f"Decision Safe: {decision_safe.action} - {decision_safe.reason}")

    decision_unsafe = orchestrator.decide("Hello", cand2)
    print(f"Decision Unsafe: {decision_unsafe.action} - {decision_unsafe.reason}")

    assert decision_safe.action == "APPROVE"
    assert decision_unsafe.action == "REJECT"

    # 3. Test Trainer (Simulation)
    print("\n3. Testing Trainer (Simulation)...")
    config = AlignmentConfig(
        model_name="gpt2", # Dummy
        max_steps=5,
        output_dir="./test_output"
    )
    trainer = AlignmentTrainer(config)
    # Dummy dataset
    dataset = []
    trainer.train(dataset)

    print("\n=== Smoke Test Passed ===")

if __name__ == "__main__":
    run_smoke_test()
