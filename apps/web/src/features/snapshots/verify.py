from playwright.sync_api import sync_playwright

def verify_debug():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs and page errors
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        try:
            print("Navigating to http://localhost:3000 ...")
            # Set a longer timeout
            page.goto("http://localhost:3000", timeout=60000)

            # Wait for *something* to happen.
            # If it redirects to /signin, wait for url change.
            page.wait_for_timeout(5000)

            print(f"Current URL: {page.url}")
            print(f"Page Title: {page.title()}")

            # Screenshot root/current
            page.screenshot(path="/home/jules/verification/debug_page.png")
            print("Screenshot saved to debug_page.png")

            # Check content
            content = page.content()
            if "IntelGraph" in content:
                print("Found 'IntelGraph' in content.")
            else:
                print("Did NOT find 'IntelGraph' in content.")

            if "Sign In" in content:
                print("Found 'Sign In' in content.")

            if "vite" in content.lower() and "error" in content.lower():
                print("Found VITE ERROR in content!")

        except Exception as e:
            print(f"Script Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_debug()
