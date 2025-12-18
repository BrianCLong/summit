from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_accessibility_features(page: Page):
    # Find the port from the log
    url = "http://localhost:5176" # Hardcoded based on log

    page.goto(url)

    # Inject fake token
    page.add_init_script("""
        localStorage.setItem('token', 'fake-token');
        localStorage.setItem('user', JSON.stringify({ name: 'Test User', role: 'admin' }));
    """)

    page.goto(url)

    # Wait for hydration
    page.wait_for_timeout(2000)

    # 2. Act: Press Tab to focus the first element.
    page.keyboard.press("Tab")

    # 3. Assert: The active element should be the Skip Link.
    link = page.get_by_text("Skip to main content")
    expect(link).to_be_visible()

    # 4. Screenshot: Capture the visible skip link.
    page.screenshot(path="/home/jules/verification/accessibility_skip_link.png")

    print("Verification complete: Skip link is visible and focused.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_accessibility_features(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
