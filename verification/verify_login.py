import os

from playwright.sync_api import expect, sync_playwright


def run():
    print("Starting verification script...")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

        print("Navigating to http://localhost:3000/login ...")
        # Go directly to login
        page.goto("http://localhost:3000/login")

        print(f"Current URL: {page.url}")

        print("Waiting for 'Email' label...")
        try:
             # Wait for hydration - look for "Email" text anywhere visible
             page.wait_for_selector("text=Email", timeout=10000)
        except Exception:
             print("Timeout waiting for 'Email'. Taking screenshot.")
             page.screenshot(path="verification/debug_login.png")
             # Don't raise immediately, let's see if we can find other clues


        print("Page interaction...")

        email_input = page.get_by_label("Email *")
        if not email_input.count():
             print("Label 'Email *' not found, trying 'Email'")
             email_input = page.get_by_label("Email")

        if not email_input.count():
             print("CRITICAL: Email input not found at all")
        else:
             # Check focus
            try:
                expect(email_input).to_be_focused()
                print("✅ Email input is focused")
            except AssertionError:
                print("❌ Email input is NOT focused")

            # Check required
            if email_input.evaluate("el => el.required"):
                print("✅ Email input is marked required")
            else:
                print("❌ Email input is NOT marked required")

        password_input = page.get_by_label("Password *")
        if not password_input.count():
             password_input = page.get_by_label("Password")

        if password_input.count():
            if password_input.evaluate("el => el.required"):
                print("✅ Password input is marked required")
            else:
                print("❌ Password input is NOT marked required")

        # Take screenshot
        screenshot_path = "verification/verification_login.png"
        page.screenshot(path=screenshot_path)
        print(f"Saved screenshot to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    run()
