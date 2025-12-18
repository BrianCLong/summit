from playwright.sync_api import sync_playwright, expect
import time

def verify_graph():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create a context with dimensions similar to the test setup
        context = browser.new_context(viewport={'width': 1200, 'height': 800})
        page = context.new_page()

        print("Navigating to app...")
        try:
            # Try port 3003 as it was reported in logs
            page.goto("http://localhost:3003", timeout=10000)
        except Exception as e:
            print(f"Failed to connect to port 3003: {e}")
            try:
                page.goto("http://localhost:3002")
            except Exception as e:
                print(f"Failed to connect to port 3002: {e}")
                try:
                    page.goto("http://localhost:3001")
                except Exception as e:
                    print(f"Failed to connect to port 3001: {e}")
                    try:
                        page.goto("http://localhost:3000")
                    except Exception as e:
                        print(f"Failed to connect to port 3000: {e}")
                        return

        # Wait for the graph canvas to appear
        print("Waiting for graph to render...")

        try:
            # Wait for at least one node with relaxed timeout
            page.wait_for_selector('.node', timeout=15000)
            print("Nodes found!")
        except:
            print("No nodes found. Taking screenshot anyway to inspect state.")

        # Allow simulation to settle slightly (animation)
        time.sleep(2)

        screenshot_path = "apps/web/e2e-verify/graph_verification_3.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_graph()
