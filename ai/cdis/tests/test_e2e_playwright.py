import json
import os
import subprocess
import time

import pandas as pd
import pytest

try:
    from playwright.sync_api import sync_playwright
except ImportError:  # pragma: no cover
    sync_playwright = None


@pytest.mark.e2e
@pytest.mark.skipif(sync_playwright is None, reason="Playwright not installed")
def test_discover_intervene_share_flow(tmp_path):
    if os.getenv("RUN_E2E", "false").lower() != "true":
        pytest.skip("RUN_E2E is not enabled")

    os.environ["CDIS_FEATURE_ENABLED"] = "true"
    server = subprocess.Popen(
        [
            "python3.12",
            "-m",
            "uvicorn",
            "cdis.api:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8090",
        ]
    )
    try:
        time.sleep(1.5)
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            context = browser.new_context()
            context.add_init_script("""
              window.navigator.clipboard.writeText = (text) => {
                window.__copied = text;
                return Promise.resolve();
              }
            """)
            page = context.new_page()
            page.goto("http://127.0.0.1:8090/lab", wait_until="networkidle")
            records = pd.read_csv("ai/cdis/tests/fixtures/synthetic_data.csv").to_dict(
                orient="records"
            )
            page.fill("#dataset", json.dumps(records))
            page.click("#discover")
            page.wait_for_timeout(500)
            page.wait_for_selector("text=Graph learned", timeout=5000)
            page.click("#intervene")
            page.wait_for_selector("text=Counterfactual delta computed", timeout=5000)
            page.click("#share")
            page.wait_for_selector("text=Share link copied", timeout=3000)
            assert "explain" in page.evaluate("() => window.__copied")
            browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=2)
        except subprocess.TimeoutExpired:
            server.kill()
