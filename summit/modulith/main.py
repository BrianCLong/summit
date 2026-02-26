import sys
import time
from pathlib import Path
from summit.modulith.config import load_config, ConfigWrapper
from summit.modulith.scanner import scan_directory
from summit.modulith.verifier import verify_imports
from summit.modulith.reporter import generate_reports
from summit.modulith.schemas import ModulithMetrics

def main():
    start_time = time.time()

    try:
        config_obj = load_config()
        config = ConfigWrapper(config_obj)
    except Exception as e:
        print(f"❌ Error loading configuration: {e}")
        sys.exit(1)

    base_path = Path(".").resolve()
    summit_path = base_path / "summit"

    print(f"🔍 Scanning {summit_path}...")
    import_graph = scan_directory(summit_path, base_path)

    print("⚖️ Verifying modular boundaries...")
    violations = verify_imports(import_graph, config)

    end_time = time.time()
    metrics = ModulithMetrics(
        total_files_scanned=len(import_graph),
        total_violations=len(violations),
        scan_time_seconds=end_time - start_time
    )

    generate_reports(violations, metrics)

    if violations:
        print(f"❌ Found {len(violations)} modularity violations!")
        for v in violations:
            print(f"  [{v.evidence_id}] {v.file_path}:{v.line_number} -> {v.import_path} (Forbidden: {v.from_module} to {v.to_module})")
        sys.exit(1)
    else:
        print("✅ No modularity violations found.")
        sys.exit(0)

if __name__ == "__main__":
    main()
