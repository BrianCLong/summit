
# ops/chaos_hooks.py

def inject_pod_kill_hook(pod_name: str, delay_seconds: int = 0):
    """
    Stub for injecting a pod kill chaos hook.
    """
    print(f"Injecting pod kill hook for {pod_name} with delay {delay_seconds}s.")
    pass

def inject_broker_kill_hook(broker_id: str, delay_seconds: int = 0):
    """
    Stub for injecting a message broker kill chaos hook.
    """
    print(f"Injecting broker kill hook for {broker_id} with delay {delay_seconds}s.")
    pass

def trigger_chaos_drill(drill_type: str, target: str):
    """
    Stub for triggering a specific chaos drill.
    """
    print(f"Triggering chaos drill: {drill_type} on {target}.")
    pass
