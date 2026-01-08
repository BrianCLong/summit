import platform
import sys
import time
from typing import Any


def generate_minimal_sbom(project_name: str, version: str) -> dict[str, Any]:
    """
    Generate a minimal SBOM without external tools.
    """
    dependencies: list[dict[str, str]] = []

    # Try to get installed distributions
    try:
        if sys.version_info >= (3, 8):
            from importlib.metadata import distributions

            for dist in distributions():
                dependencies.append({"name": dist.metadata["Name"], "version": dist.version})
    except ImportError:
        pass
    except Exception:
        # Don't fail if enumeration fails
        pass

    return {
        "name": project_name,
        "version": version,
        "generated_at": time.time(),
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "dependencies": sorted(dependencies, key=lambda x: str(x.get("name", ""))),
    }
