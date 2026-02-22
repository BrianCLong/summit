from playwright.sync_api import Page, expect, sync_playwright


def test_webapp_loads(page: Page):
    # Capture console logs
    page.on("console", lambda msg: print(f"Console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Page Error: {err}"))

    # 1. Go to the webapp
    page.goto("http://localhost:5173/")

    # 2. Wait for the graph pane to be visible
    # Using the testid I saw in App.tsx
    graph_pane = page.locator('[data-testid="graph-pane"]')
    expect(graph_pane).to_be_visible()

    # 3. Take a screenshot
    page.screenshot(path="/app/verification/webapp_loaded.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_webapp_loads(page)
            print("Verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="/app/verification/webapp_failed.png")
            raise
        finally:
            browser.close()
