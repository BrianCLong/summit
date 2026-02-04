# summit/orchestration/rollback.py

def rollback_on_failure(run, policy_verdict):
    """
    Triggers a rollback if the policy verdict is negative.
    """
    if not policy_verdict.get("allow", False):
        print(f"Rolling back run {run.id} due to policy failure.")
        # Logic to revert state
        return True
    return False
